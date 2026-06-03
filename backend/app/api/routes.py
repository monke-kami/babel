import logging
import os
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.services.analyzer import AnalyzerService
from app.services.prompt_refiner import PromptRefinerService
from app.services.scraper import ScraperService
from app.utils.pdf_generator import generate_pdf

router = APIRouter()
logger = logging.getLogger(__name__)
BACKEND_DIR = Path(__file__).resolve().parents[2]
OUTPUT_PDF_DIR = BACKEND_DIR / "data" / "output_pdfs"
PROCESSED_DIR = BACKEND_DIR / "data" / "processed"


class DynamicReportRequest(BaseModel):
    subject_code: str
    subject_name: Optional[str] = None
    query: Optional[str] = None
    max_downloads: int = 8


class PromptRefineRequest(BaseModel):
    subject_code: str
    subject_name: Optional[str] = None
    user_prompt: str


class ChatRequest(BaseModel):
    subject_code: str
    message: str


@router.post("/refine-prompt")
async def refine_prompt(request: PromptRefineRequest):
    fallback_prompt = _fallback_search_prompt(
        request.subject_code,
        request.subject_name,
        request.user_prompt,
    )

    try:
        refiner = PromptRefinerService()

        return {
            "status": "success",
            **refiner.refine_search_prompt(
                subject_code=request.subject_code,
                subject_name=request.subject_name,
                user_prompt=request.user_prompt,
            ),
        }

    except Exception as e:
        logger.error(f"TinyLlama prompt refinement failed: {e}")
        return {
            "status": "success",
            "model": "fallback-after-tinyllama-error",
            "input_prompt": request.user_prompt,
            "refined_prompt": fallback_prompt,
            "warning": str(e),
        }


@router.post("/generate-dynamic-report")
async def generate_dynamic_report(request: DynamicReportRequest):
    """
    Dynamic KalamBot pipeline:
    1. Search APJAKTU archive
    2. Download matching KTU PYQ PDFs
    3. Analyze downloaded PDFs
    4. Generate ranked PDF report
    """

    try:
        subject_code = request.subject_code.upper()
        subject_name = request.subject_name or subject_code
        presentation_mode = os.getenv("KALAMBOT_PRESENTATION_MODE", "1") != "0"

        if presentation_mode:
            cached_response = _cached_report_response(
                subject_code=subject_code,
                subject_name=subject_name,
                query=request.query,
                message="Presentation cache used for instant report generation",
            )

            if cached_response:
                return cached_response

        scraper = ScraperService()

        scrape_result = scraper.scrape_and_download(
            subject_code=subject_code,
            subject_name=subject_name,
            search_query=request.query,
            max_downloads=request.max_downloads,
            clear_existing=True,
        )

        if scrape_result["downloaded_count"] == 0:
            cached_response = _cached_report_response(
                subject_code=subject_code,
                subject_name=subject_name,
                query=request.query,
                message="Live scraping found no PDFs, so cached analysis was used",
                scrape_result=scrape_result,
            )

            if cached_response:
                return cached_response

            scrape_result = _demo_scrape_result(subject_code, subject_name, request.query)
            analysis = _demo_analysis(subject_code, subject_name)
            generate_pdf(subject_code, analysis["ranked_by_module"])

            return _report_payload(
                subject_code=subject_code,
                query=request.query,
                message="Demo report generated because no live PDFs were found",
                scrape_result=scrape_result,
                analysis=analysis,
            )

        analyzer = AnalyzerService()
        analysis = analyzer.process_pdfs_for_subject(subject_code)

        generate_pdf(subject_code, analysis["ranked_by_module"])

        return _report_payload(
            subject_code=subject_code,
            query=request.query,
            message="Dynamic PYQ retrieval and analysis completed",
            scrape_result=scrape_result,
            analysis=analysis,
        )

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Dynamic report generation failed: {e}")
        cached_response = _cached_report_response(
            subject_code=request.subject_code.upper(),
            subject_name=request.subject_name or request.subject_code.upper(),
            query=request.query,
            message=f"Live pipeline fell back to cached analysis: {e}",
        )

        if cached_response:
            return cached_response

        analysis = _demo_analysis(request.subject_code.upper(), request.subject_name)
        generate_pdf(request.subject_code.upper(), analysis["ranked_by_module"])

        return _report_payload(
            subject_code=request.subject_code.upper(),
            query=request.query,
            message=f"Demo report generated after live pipeline error: {e}",
            scrape_result=_demo_scrape_result(request.subject_code.upper(), request.subject_name, request.query),
            analysis=analysis,
        )

@router.post("/generate-full-report/{subject_code}")
async def generate_full_report(subject_code: str):
    """
    Backward-compatible endpoint.
    Searches only APJAKTU archive.
    """

    try:
        subject_code = subject_code.upper()

        subject_names = {
            "CST302": "Operating Systems",
            "CST304": "Database Management Systems",
            "CST306": "Computer Networks",
            "CST308": "Software Engineering",
        }

        subject_name = subject_names.get(subject_code, subject_code)

        scraper = ScraperService()

        scrape_result = scraper.scrape_and_download(
            subject_code=subject_code,
            subject_name=subject_name,
            max_downloads=8,
            clear_existing=True,
        )

        if scrape_result["downloaded_count"] == 0:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"No matching PDF question papers were downloaded for {subject_code} "
                    f"from APJAKTU archive. Pages scanned: {scrape_result.get('pages_scanned', 0)}, "
                    f"candidate links found: {scrape_result.get('candidate_pdf_count', 0)}."
                ),
            )

        analyzer = AnalyzerService()
        analysis = analyzer.process_pdfs_for_subject(subject_code)

        generate_pdf(subject_code, analysis["ranked_by_module"])

        return {
            "status": "success",
            "message": "Full APJAKTU archive pipeline complete",
            "scrape_result": scrape_result,
            "analysis": analysis,
            "download_url": f"/api/download/{subject_code}_ranked.pdf",
        }

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error in full pipeline: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/subjects/{subject_code}/summary")
async def get_subject_summary(subject_code: str):
    try:
        analyzer = AnalyzerService()
        return analyzer.get_analysis(subject_code.upper())

    except Exception as e:
        logger.error(f"Summary loading failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/subjects/{subject_code}/topics")
async def get_topics(subject_code: str):
    try:
        analyzer = AnalyzerService()
        return analyzer.get_topics(subject_code.upper())

    except Exception as e:
        logger.error(f"Topic loading failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/subjects/{subject_code}/topic/{topic_name}")
async def get_topic_insight(subject_code: str, topic_name: str):
    try:
        analyzer = AnalyzerService()
        return analyzer.get_topic_insight(subject_code.upper(), topic_name)

    except Exception as e:
        logger.error(f"Topic insight failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat")
async def chat(request: ChatRequest):
    try:
        analyzer = AnalyzerService()
        return analyzer.chat(request.subject_code.upper(), request.message)

    except Exception as e:
        logger.error(f"Chat failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-report/{subject_code}")
async def generate_report(subject_code: str):
    try:
        subject_code = subject_code.upper()

        analyzer = AnalyzerService()
        ranked_questions = analyzer.analyze_and_rank_questions(subject_code)

        generate_pdf(subject_code, ranked_questions)

        return {
            "status": "success",
            "message": "Report generated from existing processed dynamic data",
            "download_url": f"/api/download/{subject_code}_ranked.pdf",
        }

    except Exception as e:
        logger.error(f"Report generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _fallback_search_prompt(
    subject_code: str,
    subject_name: str | None,
    user_prompt: str | None = None,
) -> str:
    subject_code = subject_code.upper().strip()
    subject_name = (subject_name or subject_code).strip()
    user_prompt = (user_prompt or "").strip()

    prompt_parts = [subject_code, subject_name, "KTU previous year question paper pdf"]

    if user_prompt and user_prompt.lower() not in " ".join(prompt_parts).lower():
        prompt_parts.append(user_prompt)

    return " ".join(prompt_parts)


def _cached_report_response(
    subject_code: str,
    subject_name: str | None,
    query: str | None,
    message: str,
    scrape_result: dict | None = None,
) -> dict | None:
    subject_code = subject_code.upper().strip()
    analysis_path = PROCESSED_DIR / f"{subject_code}_analysis.json"

    if not analysis_path.exists():
        return None

    import json

    with open(analysis_path, "r", encoding="utf-8") as f:
        analysis = json.load(f)

    generate_pdf(subject_code, analysis["ranked_by_module"])

    return _report_payload(
        subject_code=subject_code,
        query=query,
        message=message,
        scrape_result=scrape_result or _demo_scrape_result(subject_code, subject_name, query, analysis),
        analysis=analysis,
    )


def _demo_scrape_result(
    subject_code: str,
    subject_name: str | None,
    query: str | None,
    analysis: dict | None = None,
) -> dict:
    pdf_count = analysis.get("pdf_count", 1) if analysis else 1

    return {
        "subject_code": subject_code,
        "subject_name": subject_name or subject_code,
        "search_query": query or _fallback_search_prompt(subject_code, subject_name),
        "source": "cached presentation dataset",
        "pages_scanned": 1,
        "candidate_pdf_count": pdf_count,
        "downloaded_count": pdf_count,
        "downloaded_files": [f"{subject_code}_cached_dataset.pdf"],
        "storage_path": "backend/data",
        "presentation_cache": True,
    }


def _demo_analysis(subject_code: str, subject_name: str | None = None) -> dict:
    subject_code = subject_code.upper().strip()
    subject_name = subject_name or subject_code
    topics = [
        ("High Recurrence Core Concepts", "Explain the core concepts that repeatedly appear in previous year question papers."),
        ("Problem Solving Questions", "Solve a representative numerical or design-oriented problem from this subject."),
        ("Comparison Questions", "Compare two important techniques or protocols with examples."),
        ("Short Notes", "Write short notes on frequently tested subtopics with neat diagrams where required."),
    ]

    ranked_questions = []

    for index, (topic, question) in enumerate(topics, start=1):
        ranked_questions.append({
            "question": question,
            "frequency": max(1, 6 - index),
            "years": ["Cached"],
            "sources": ["presentation-demo"],
            "variations": [question],
            "topic": topic,
            "module": "Presentation Demo Topics",
            "rank": index,
            "overall_rank": index,
        })

    return {
        "subject_code": subject_code,
        "subject_name": subject_name,
        "pdf_count": 1,
        "raw_question_count": len(ranked_questions),
        "important_topics": [
            {
                "topic": item["topic"],
                "count": item["frequency"],
                "importance_score": 100 - ((item["rank"] - 1) * 12),
            }
            for item in ranked_questions
        ],
        "frequently_asked_questions": ranked_questions,
        "ranked_by_module": {
            "Presentation Demo Topics": ranked_questions,
        },
    }


def _report_payload(
    subject_code: str,
    query: str | None,
    message: str,
    scrape_result: dict,
    analysis: dict,
) -> dict:
    return {
        "status": "success",
        "message": message,
        "query": query,
        "scrape_result": scrape_result,
        "analysis": analysis,
        "download_url": f"/api/download/{subject_code}_ranked.pdf",
    }


@router.get("/download/{filename}")
async def download_file(filename: str):
    safe_filename = Path(filename).name
    file_path = OUTPUT_PDF_DIR / safe_filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        path=file_path,
        filename=safe_filename,
        media_type="application/pdf",
    )
