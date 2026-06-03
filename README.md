# KalamBot

KalamBot is a full-stack application for retrieving, analyzing, and generating ranked question paper reports from APJAKTU/KTU previous year question paper archives.

The repository is split into two main parts:

- `backend/` — FastAPI backend that scrapes the APJAKTU archive, analyzes downloaded PDFs, refines search prompts with Hugging Face TinyLlama, and exports ranked reports as PDF.
- `frontend/` — React + Vite frontend for interacting with the backend and displaying chat-style user requests.

## Key Features

- Scrapes APJAKTU DSpace archive for KTU previous year question paper PDFs
- Extracts and ranks questions by frequency and topic relevance
- Generates polished PDF reports grouped by module
- Uses a prompt refinement service to convert student requests into archive search queries
- Supports fallback demo and cached responses when live scraping is unavailable

## Repository Structure

- `backend/`
  - `app/main.py` — FastAPI app initialization
  - `app/api/routes.py` — API endpoints for prompt refinement and report generation
  - `app/services/scraper.py` — Archive scraping and PDF download logic
  - `app/services/analyzer.py` — PDF parsing, question extraction, ranking, and optional vector clustering
  - `app/services/prompt_refiner.py` — Hugging Face TinyLlama prompt rewrite service
  - `app/utils/pdf_generator.py` — PDF report generation
  - `data/raw_pdfs/` — downloaded question paper PDFs organized by subject
  - `data/output_pdfs/` — generated ranked report PDFs
  - `data/processed/` — analysis cache and processed data files
  - `data/chroma_db/` — optional vector database storage used for embeddings

- `frontend/`
  - `src/App.tsx` — React router definitions
  - `src/components/ChatPage.tsx` — main user interface page
  - `src/components/LandingPage.tsx` — landing page visuals and navigation
  - `src/components/ui/` — shared UI components
  - `src/lib/` — helper utilities

## Backend Setup

### Requirements

- Python 3.11+ (recommended)
- `pip`
- Optional: Hugging Face token for prompt refinement

### Install Dependencies

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

### Environment Variables

The backend supports the following environment variables:

- `HF_TOKEN`, `HF_TOKENS`, `HF_Tokens`, `HUGGINGFACE_TOKEN`, or `HUGGINGFACEHUB_API_TOKEN`
  - Required for `POST /api/refine-prompt`
- `HF_TINYLAMA_MODEL`
  - Defaults to `TinyLlama/TinyLlama-1.1B-Chat-v1.0`
- `HF_TINYLAMA_PROVIDER`
  - Defaults to `featherless-ai`
- `KALAMBOT_PRESENTATION_MODE`
  - Set to `0` to disable cached/demo presentation mode and force live scraping.

### Run Backend

```bash
cd backend
.\.venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### API Endpoints

- `GET /` — health check
- `POST /api/refine-prompt`
  - Body: `{ "subject_code": "CST302", "subject_name": "Operating Systems", "user_prompt": "..." }`
- `POST /api/generate-dynamic-report`
  - Body: `{ "subject_code": "CST302", "subject_name": "Operating Systems", "query": "...", "max_downloads": 8 }`
- `POST /api/generate-full-report/{subject_code}`
  - Triggers a backward-compatible scraping and PDF generation flow for the given subject code.

## Frontend Setup

### Requirements

- Node.js 18+
- npm

### Install Dependencies

```bash
cd frontend
npm install
```

### Run Frontend

```bash
cd frontend
npm run dev
```

### Build Frontend

```bash
cd frontend
npm run build
```

### Preview Built App

```bash
cd frontend
npm run preview
```

## Usage

1. Start the backend on `http://localhost:8000`
2. Start the frontend on the default Vite port (usually `http://localhost:5173`)
3. Use the chat UI to submit subject codes and queries
4. The backend will scrape APJAKTU archive PDFs, analyze questions, and generate a ranked PDF in `backend/data/output_pdfs`

## Data Flow

1. User request arrives at `/api/generate-dynamic-report`
2. `ScraperService` downloads relevant question paper PDFs from APJAKTU
3. `AnalyzerService` extracts questions and computes ranking metadata
4. `pdf_generator.py` creates a final PDF grouped by module
5. The frontend can surface the analysis result and provide access to generated PDFs

## Notes

- The scraper is targeted at the APJAKTU DSpace archive and is tuned for KTU previous year question papers.
- The application includes fallback behavior when live scraping fails, including cached reports or a demo report.
- The backend can optionally use `chromadb` and `langchain_huggingface` for embedding-based clustering if available.

## Recommended Improvements

- Restrict CORS origins in production instead of using `allow_origins=["*"]`
- Add frontend integration for direct PDF download links
- Add unit tests for scraping, parsing, and prompt-refinement behavior
- Add production-ready deployment scripts for Docker or cloud hosting
