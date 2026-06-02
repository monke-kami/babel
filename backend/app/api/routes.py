from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
import logging

from app.services.scraper import ScraperService
from app.services.analyzer import AnalyzerService
from app.utils.pdf_generator import generate_pdf

router = APIRouter()
logger = logging.getLogger(__name__)

class ScrapeRequest(BaseModel):
    subject_code: str
    subject_name: Optional[str] = None

class ProcessRequest(BaseModel):
    subject_code: str

@router.post("/scrape")
async def trigger_scraping(request: ScrapeRequest, background_tasks: BackgroundTasks):
    """
    Triggers a background task to scrape KTU PDFs for the given subject.
    """
    scraper = ScraperService()
    # Scrape and download in background so we don't block
    background_tasks.add_task(scraper.scrape_and_download, request.subject_code, request.subject_name)
    return {"status": "accepted", "message": f"Scraping started for {request.subject_code}"}

@router.post("/process")
async def process_subject(request: ProcessRequest, background_tasks: BackgroundTasks):
    """
    Processes all downloaded PDFs for a subject: parses text, generates embeddings, stores in ChromaDB.
    """
    analyzer = AnalyzerService()
    background_tasks.add_task(analyzer.process_pdfs_for_subject, request.subject_code)
    return {"status": "accepted", "message": f"Processing started for {request.subject_code}"}

@router.post("/generate-report/{subject_code}")
async def generate_report(subject_code: str):
    """
    Uses the Analyzer to group and rank questions, then generates the final PDF.
    """
    try:
        analyzer = AnalyzerService()
        ranked_questions = analyzer.analyze_and_rank_questions(subject_code)
        
        pdf_path = generate_pdf(subject_code, ranked_questions)
        
        return {
            "status": "success", 
            "message": "Report generated",
            "download_url": f"/api/download/{subject_code}_ranked.pdf"
        }
    except Exception as e:
        logger.error(f"Error generating report: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-full-report/{subject_code}")
async def generate_full_report(subject_code: str):
    """
    Synchronously scrapes, processes, and generates the report.
    """
    try:
        scraper = ScraperService()
        scraper.scrape_and_download(subject_code)
        
        analyzer = AnalyzerService()
        analyzer.process_pdfs_for_subject(subject_code)
        
        ranked_questions = analyzer.analyze_and_rank_questions(subject_code)
        pdf_path = generate_pdf(subject_code, ranked_questions)
        
        return {
            "status": "success", 
            "message": "Full pipeline complete",
            "download_url": f"/api/download/{subject_code}_ranked.pdf"
        }
    except Exception as e:
        logger.error(f"Error in full pipeline: {e}")
        raise HTTPException(status_code=500, detail=str(e))
