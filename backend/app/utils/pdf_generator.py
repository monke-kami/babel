import logging
import re
import unicodedata
from pathlib import Path
from typing import Any

from fpdf import FPDF

logger = logging.getLogger(__name__)
BACKEND_DIR = Path(__file__).resolve().parents[2]


class ReportPDF(FPDF):
    def header(self) -> None:
        self.set_fill_color(16, 20, 31)
        self.rect(0, 0, self.w, 18, "F")
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(255, 255, 255)
        self.cell(0, 8, "KalamBot AI PYQ Intelligence", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(4)

    def footer(self) -> None:
        self.set_y(-14)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 8, f"Page {self.page_no()}", align="C")


def generate_pdf(subject_code: str, ranked_data: dict[str, list[dict[str, Any]]]) -> str:
    """
    Generate a polished ranked-question PDF grouped by module.
    Returns the absolute path to the generated PDF.
    """
    output_dir = BACKEND_DIR / "data" / "output_pdfs"
    output_dir.mkdir(parents=True, exist_ok=True)

    file_path = output_dir / f"{subject_code}_ranked.pdf"

    pdf = ReportPDF()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()

    _draw_title(pdf, subject_code, ranked_data)

    for module, questions in ranked_data.items():
        if not questions:
            continue

        _draw_module_heading(pdf, module)

        for question in questions:
            _draw_question_card(pdf, question)

    pdf.output(str(file_path))

    logger.info("PDF successfully generated at %s", file_path)
    return str(file_path)


def _draw_title(
    pdf: ReportPDF,
    subject_code: str,
    ranked_data: dict[str, list[dict[str, Any]]],
) -> None:
    total_questions = sum(len(questions) for questions in ranked_data.values())
    total_modules = len([module for module, questions in ranked_data.items() if questions])

    pdf.set_text_color(22, 27, 39)
    pdf.set_font("Helvetica", "B", 20)
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(0, 10, _pdf_text(f"{subject_code} Ranked PYQ Report"), align="C")

    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(88, 96, 115)
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(
        0,
        6,
        "Questions are clustered across downloaded papers, refined into readable canonical forms, "
        "and ranked by recurrence.",
        align="C",
    )
    pdf.ln(4)

    pdf.set_fill_color(240, 245, 255)
    pdf.set_draw_color(206, 217, 238)
    pdf.set_text_color(36, 54, 90)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_x(pdf.l_margin)
    pdf.cell(58, 10, _pdf_text(f"{total_questions} ranked questions"), border=1, align="C", fill=True)
    pdf.cell(58, 10, _pdf_text(f"{total_modules} topic groups"), border=1, align="C", fill=True)
    pdf.cell(58, 10, "Generated PDF", border=1, align="C", fill=True)
    pdf.ln(16)


def _draw_module_heading(pdf: ReportPDF, module: str) -> None:
    if pdf.get_y() > 245:
        pdf.add_page()

    pdf.set_fill_color(21, 31, 52)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 13)
    pdf.cell(0, 9, _pdf_text(module), new_x="LMARGIN", new_y="NEXT", fill=True)
    pdf.ln(3)


def _draw_question_card(pdf: ReportPDF, question: dict[str, Any]) -> None:
    if pdf.get_y() > 238:
        pdf.add_page()

    rank = question.get("rank", "-")
    frequency = question.get("frequency", 1)
    topic = question.get("topic", "General")
    years = ", ".join(question.get("years", []) or ["Unknown"])
    text = _pdf_text(question.get("question", "Question text unavailable"))

    x = pdf.get_x()
    y = pdf.get_y()
    card_width = pdf.epw

    pdf.set_fill_color(248, 250, 252)
    pdf.set_draw_color(225, 231, 239)
    pdf.rect(x, y, card_width, 12, "DF")

    pdf.set_xy(x + 3, y + 2.3)
    pdf.set_text_color(23, 37, 84)
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(42, 6, _pdf_text(f"Rank {rank}"), border=0)

    pdf.set_text_color(73, 86, 109)
    pdf.set_font("Helvetica", "", 8.5)
    pdf.cell(50, 6, _pdf_text(f"Asked {frequency} time{'s' if frequency != 1 else ''}"), border=0)
    pdf.cell(0, 6, _pdf_text(f"Years: {years}"), border=0)

    pdf.set_xy(pdf.l_margin, y + 14)
    pdf.set_text_color(36, 54, 90)
    pdf.set_font("Helvetica", "B", 9)
    pdf.multi_cell(0, 5, _pdf_text(f"Topic: {topic}"))

    pdf.set_x(pdf.l_margin)
    pdf.set_text_color(33, 37, 47)
    pdf.set_font("Helvetica", "", 10.5)
    pdf.multi_cell(0, 6.5, text)
    pdf.ln(4)


def _pdf_text(value: Any) -> str:
    text = str(value)
    replacements = {
        "\u2013": "-",
        "\u2014": "-",
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2022": "-",
        "\u00a0": " ",
    }

    for source, target in replacements.items():
        text = text.replace(source, target)

    text = unicodedata.normalize("NFKD", text)
    text = text.encode("latin-1", "ignore").decode("latin-1")
    text = re.sub(r"\s+", " ", text).strip()

    return text
