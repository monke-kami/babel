import os
import requests
from duckduckgo_search import DDGS
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

class ScraperService:
    def __init__(self):
        self.raw_pdfs_dir = Path("data/raw_pdfs")
        self.raw_pdfs_dir.mkdir(parents=True, exist_ok=True)

    def scrape_and_download(self, subject_code: str, subject_name: str = None):
        """
        Uses DDG to search for KTU question papers for the given subject and downloads the PDFs.
        """
        logger.info(f"Starting scrape for {subject_code}...")
        
        query = f"KTU {subject_code} previous year question papers filetype:pdf"
        if subject_name:
            query = f"KTU {subject_code} {subject_name} previous year question papers filetype:pdf"
            
        subject_dir = self.raw_pdfs_dir / subject_code
        subject_dir.mkdir(parents=True, exist_ok=True)
        
        ddgs = DDGS()
        results = list(ddgs.text(query, max_results=5))
        
        download_count = 0
        for result in results:
            url = result.get('href')
            if url and url.lower().endswith('.pdf'):
                try:
                    logger.info(f"Downloading {url}")
                    response = requests.get(url, timeout=10)
                    if response.status_code == 200:
                        filename = url.split('/')[-1]
                        if not filename.endswith('.pdf'):
                            filename = f"paper_{download_count}.pdf"
                            
                        filepath = subject_dir / filename
                        with open(filepath, 'wb') as f:
                            f.write(response.content)
                        download_count += 1
                except Exception as e:
                    logger.error(f"Failed to download {url}: {e}")
                    
        logger.info(f"Scraping completed for {subject_code}. Downloaded {download_count} PDFs.")
        return download_count
