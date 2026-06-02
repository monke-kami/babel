import os
import requests
from duckduckgo_search import DDGS
import logging
from pathlib import Path
from bs4 import BeautifulSoup
from urllib.parse import urljoin

logger = logging.getLogger(__name__)

class ScraperService:
    def __init__(self):
        self.raw_pdfs_dir = Path("data/raw_pdfs")
        self.raw_pdfs_dir.mkdir(parents=True, exist_ok=True)
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
        }

    def scrape_and_download(self, subject_code: str, subject_name: str = None):
        """
        Uses DDG to search for KTU question papers for the given subject and downloads the PDFs.
        """
        logger.info(f"Starting scrape for {subject_code}...")
        
        query = f"KTU {subject_code} previous year question papers"
        if subject_name:
            query = f"KTU {subject_code} {subject_name} previous year question papers"
            
        subject_dir = self.raw_pdfs_dir / subject_code
        subject_dir.mkdir(parents=True, exist_ok=True)
        
        ddgs = DDGS()
        results = list(ddgs.text(query, max_results=10))
        
        download_count = 0
        max_downloads = 3
        
        for result in results:
            if download_count >= max_downloads:
                break
                
            url = result.get('href')
            if not url:
                continue
                
            try:
                if url.lower().endswith('.pdf'):
                    if self._download_file(url, subject_dir, download_count):
                        download_count += 1
                    continue
                
                logger.info(f"Scraping webpage: {url}")
                response = requests.get(url, headers=self.headers, timeout=10)
                if response.status_code != 200:
                    continue
                    
                soup = BeautifulSoup(response.text, 'html.parser')
                links = soup.find_all('a', href=True)
                
                for link in links:
                    href = link['href']
                    if href.lower().endswith('.pdf') or 'download' in href.lower():
                        if not href.lower().endswith('.pdf'):
                            continue # Be safe, only real PDFs for now
                        pdf_url = urljoin(url, href)
                        logger.info(f"Found PDF link: {pdf_url}")
                        if self._download_file(pdf_url, subject_dir, download_count):
                            download_count += 1
                        if download_count >= max_downloads:
                            break
                            
            except Exception as e:
                logger.error(f"Failed to scrape {url}: {e}")
                    
        logger.info(f"Scraping completed for {subject_code}. Downloaded {download_count} PDFs.")
        return download_count

    def _download_file(self, url: str, subject_dir: Path, download_count: int) -> bool:
        try:
            logger.info(f"Downloading PDF: {url}")
            response = requests.get(url, headers=self.headers, timeout=10)
            if response.status_code == 200 and 'application/pdf' in response.headers.get('Content-Type', ''):
                filename = url.split('/')[-1]
                if not filename.lower().endswith('.pdf'):
                    filename = f"paper_{download_count}.pdf"
                    
                filepath = subject_dir / filename
                with open(filepath, 'wb') as f:
                    f.write(response.content)
                return True
        except Exception as e:
            logger.error(f"Failed to download PDF {url}: {e}")
        return False
