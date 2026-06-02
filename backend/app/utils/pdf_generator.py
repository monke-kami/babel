from fpdf import FPDF
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

def generate_pdf(subject_code: str, ranked_data: dict) -> str:
    """
    Generates a PDF document with the ranked questions grouped by module.
    Returns the path to the generated PDF.
    """
    pdf = FPDF()
    pdf.add_page()
    
    # Title
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, f"KalamBot AI - Important Questions for {subject_code}", ln=True, align='C')
    pdf.ln(5)
    
    pdf.set_font("Helvetica", size=11)
    pdf.cell(0, 10, "Ranked by frequency across past year KTU papers.", ln=True, align='C')
    pdf.ln(10)
    
    # Iterate through modules
    for module, questions in ranked_data.items():
        pdf.set_font("Helvetica", "B", 14)
        pdf.set_text_color(12, 59, 235) # KalamBot Primary Blue
        pdf.cell(0, 10, module, ln=True)
        pdf.set_text_color(0, 0, 0)
        
        pdf.set_font("Helvetica", size=11)
        for q in questions:
            rank_text = f"[Rank {q['rank']} | Asked {q['frequency']} times]"
            pdf.set_font("Helvetica", "B", 10)
            pdf.cell(0, 8, rank_text, ln=True)
            
            pdf.set_font("Helvetica", size=11)
            pdf.multi_cell(0, 8, q['question'])
            pdf.ln(2)
            
        pdf.ln(5)
        
    output_dir = Path("data/output_pdfs")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = output_dir / f"{subject_code}_ranked.pdf"
    pdf.output(str(file_path))
    
    logger.info(f"PDF successfully generated at {file_path}")
    return str(file_path)
