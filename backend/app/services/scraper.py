import logging
import re
import shutil
from pathlib import Path
from urllib.parse import urljoin, urlparse, quote, unquote

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)
BACKEND_DIR = Path(__file__).resolve().parents[2]


class ScraperService:
    """
    Scrapes PYQs only from APJAKTU DSpace archive:
    http://202.88.225.92/xmlui/handle/1/1156
    """

    BASE_URL = "http://202.88.225.92"
    ARCHIVE_URL = "http://202.88.225.92/xmlui/handle/1/1156"

    def __init__(self):
        self.raw_pdfs_dir = BACKEND_DIR / "data" / "raw_pdfs"
        self.raw_pdfs_dir.mkdir(parents=True, exist_ok=True)

        self.headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            )
        }

    def scrape_and_download(
        self,
        subject_code: str,
        subject_name: str | None = None,
        search_query: str | None = None,
        max_downloads: int = 8,
        clear_existing: bool = True,
    ) -> dict:
        subject_code = subject_code.upper().strip()
        subject_name = subject_name or subject_code

        subject_dir = self.raw_pdfs_dir / subject_code

        if clear_existing and subject_dir.exists():
            shutil.rmtree(subject_dir)

        subject_dir.mkdir(parents=True, exist_ok=True)

        search_query = (search_query or f"{subject_code} {subject_name} previous year question paper pdf").strip()
        encoded_query = quote(search_query)

        start_urls = [
            self.ARCHIVE_URL,
            f"{self.BASE_URL}/xmlui/discover?scope=1/1156&query={encoded_query}&submit=Go",
            f"{self.BASE_URL}/xmlui/simple-search?query={encoded_query}",
        ]

        visited_pages = set()
        queued_pages = list(start_urls)
        candidate_pdf_urls = []
        downloaded_files = []

        max_pages_to_scan = 80

        while queued_pages and len(visited_pages) < max_pages_to_scan:
            page_url = queued_pages.pop(0)

            if page_url in visited_pages:
                continue

            visited_pages.add(page_url)
            logger.info(f"Scanning APJAKTU archive page: {page_url}")

            try:
                response = requests.get(
                    page_url,
                    headers=self.headers,
                    timeout=15,
                    allow_redirects=True,
                )

                if response.status_code != 200:
                    logger.warning(f"Skipped page {page_url}, status={response.status_code}")
                    continue

                soup = BeautifulSoup(response.text, "html.parser")
                page_text = soup.get_text(" ", strip=True)

                page_is_relevant = self._is_relevant_text(
                    text=f"{page_url} {page_text}",
                    subject_code=subject_code,
                    subject_name=subject_name,
                )

                for link in soup.find_all("a", href=True):
                    href = link["href"].strip()
                    link_text = link.get_text(" ", strip=True)
                    full_url = urljoin(page_url, href)
                    full_url = self._normalize_url(full_url)

                    if not self._is_allowed_archive_url(full_url):
                        continue

                    combined_text = f"{full_url} {link_text}"

                    if "/bitstream/" in full_url:
                        if page_is_relevant or self._is_relevant_text(
                            combined_text,
                            subject_code,
                            subject_name,
                        ):
                            if full_url not in candidate_pdf_urls:
                                candidate_pdf_urls.append(full_url)
                        continue

                    if (
                        "/xmlui/handle/" in full_url
                        or "/xmlui/discover" in full_url
                        or "/xmlui/simple-search" in full_url
                    ):
                        if full_url not in visited_pages and full_url not in queued_pages:
                            queued_pages.append(full_url)

            except Exception as e:
                logger.warning(f"Failed to scan {page_url}: {e}")

        logger.info(f"Candidate PDF/bitstream URLs found: {len(candidate_pdf_urls)}")

        for pdf_url in candidate_pdf_urls:
            if len(downloaded_files) >= max_downloads:
                break

            saved_file = self._download_pdf(
                url=pdf_url,
                subject_dir=subject_dir,
                subject_code=subject_code,
            )

            if saved_file:
                downloaded_files.append(saved_file)

        logger.info(
            f"APJAKTU scraping completed for {subject_code}. "
            f"Downloaded {len(downloaded_files)} PDFs."
        )

        return {
            "subject_code": subject_code,
            "subject_name": subject_name,
            "search_query": search_query,
            "source": self.ARCHIVE_URL,
            "pages_scanned": len(visited_pages),
            "candidate_pdf_count": len(candidate_pdf_urls),
            "downloaded_count": len(downloaded_files),
            "downloaded_files": downloaded_files,
            "storage_path": str(subject_dir),
        }

    def _normalize_url(self, url: str) -> str:
        url = url.split("#")[0]
        return url.strip()

    def _is_allowed_archive_url(self, url: str) -> bool:
        parsed = urlparse(url)

        if parsed.netloc != "202.88.225.92":
            return False

        return parsed.path.startswith("/xmlui/")

    def _is_relevant_text(
        self,
        text: str,
        subject_code: str,
        subject_name: str,
    ) -> bool:
        text = text.lower()
        subject_code = subject_code.lower()
        subject_name = subject_name.lower()

        subject_words = [
            word for word in re.findall(r"[a-zA-Z0-9]+", subject_name)
            if len(word) > 2
        ]

        if subject_code in text:
            return True

        matched_words = sum(1 for word in subject_words if word in text)

        return matched_words >= 2

    def _download_pdf(
        self,
        url: str,
        subject_dir: Path,
        subject_code: str,
    ) -> str | None:
        try:
            logger.info(f"Downloading APJAKTU bitstream/PDF: {url}")

            response = requests.get(
                url,
                headers=self.headers,
                timeout=30,
                allow_redirects=True,
            )

            if response.status_code != 200:
                logger.warning(f"Download failed: {url}, status={response.status_code}")
                return None

            content = response.content

            if not self._is_pdf_content(response, content):
                logger.warning(f"Skipped non-PDF content: {url}")
                return None

            filename = self._make_filename(url, subject_code)
            file_path = subject_dir / filename

            counter = 1
            while file_path.exists():
                file_path = subject_dir / f"{file_path.stem}_{counter}.pdf"
                counter += 1

            with open(file_path, "wb") as f:
                f.write(content)

            logger.info(f"Saved PDF: {file_path}")
            return file_path.name

        except Exception as e:
            logger.warning(f"PDF download error for {url}: {e}")
            return None

    def _is_pdf_content(self, response: requests.Response, content: bytes) -> bool:
        content_type = response.headers.get("Content-Type", "").lower()

        return (
            "application/pdf" in content_type
            or content[:4] == b"%PDF"
        )

    def _make_filename(self, url: str, subject_code: str) -> str:
        parsed = urlparse(url)
        raw_name = Path(unquote(parsed.path)).name

        if not raw_name or "." not in raw_name:
            raw_name = f"{subject_code}_paper.pdf"

        if not raw_name.lower().endswith(".pdf"):
            raw_name = f"{raw_name}.pdf"

        clean_name = re.sub(r"[^A-Za-z0-9_.-]", "_", raw_name)

        if subject_code.lower() not in clean_name.lower():
            clean_name = f"{subject_code}_{clean_name}"

        return clean_name
