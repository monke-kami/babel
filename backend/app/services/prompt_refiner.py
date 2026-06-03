import logging
import os
import re
from typing import Any

import requests

logger = logging.getLogger(__name__)


class PromptRefinerService:
    MODEL_ID = os.getenv("HF_TINYLAMA_MODEL", "TinyLlama/TinyLlama-1.1B-Chat-v1.0")
    PROVIDER = os.getenv("HF_TINYLAMA_PROVIDER", "featherless-ai")
    API_URL = f"https://router.huggingface.co/{PROVIDER}/v1/chat/completions"

    def __init__(self) -> None:
        self.token = (
            os.getenv("HF_TOKEN")
            or os.getenv("HF_TOKENS")
            or os.getenv("HF_Tokens")
            or os.getenv("HUGGINGFACE_TOKEN")
            or os.getenv("HUGGINGFACEHUB_API_TOKEN")
        )

    def refine_search_prompt(
        self,
        subject_code: str,
        subject_name: str | None,
        user_prompt: str,
    ) -> dict[str, Any]:
        if not self.token:
            raise RuntimeError(
                "Hugging Face token is not configured. Set HF_TOKEN or HF_TOKENS before starting the backend."
            )

        subject_code = subject_code.upper().strip()
        subject_name = (subject_name or subject_code).strip()
        user_prompt = user_prompt.strip()

        system_prompt, prompt = self._build_prompt(subject_code, subject_name, user_prompt)

        response = requests.post(
            self.API_URL,
            headers={
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json",
            },
            json={
                "model": self.MODEL_ID,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt},
                ],
                "max_tokens": 60,
                "temperature": 0.2,
                "top_p": 0.9,
            },
            timeout=8,
        )

        if response.status_code >= 400:
            logger.error("TinyLlama prompt refinement failed: %s", response.text[:500])
            raise RuntimeError(f"TinyLlama request failed with status {response.status_code}")

        raw_text = self._extract_generated_text(response.json())
        refined_prompt = self._clean_refined_prompt(raw_text, subject_code, subject_name)

        if not refined_prompt:
            raise RuntimeError("TinyLlama returned an empty prompt")

        return {
            "model": self.MODEL_ID,
            "input_prompt": user_prompt,
            "refined_prompt": refined_prompt,
        }

    def _build_prompt(self, subject_code: str, subject_name: str, user_prompt: str) -> tuple[str, str]:
        system_prompt = (
            "You rewrite student requests into concise APJAKTU/KTU question-paper search queries. "
            "Return only one search query in the exact format QUERY: <search query>. Do not explain."
        )
        user_message = (
            f"Subject code: {subject_code}\n"
            f"Subject name: {subject_name}\n"
            f"Student request: {user_prompt}\n\n"
            "Create the best web/archive search query for finding previous year question paper PDFs. "
            "The query must include the subject code, subject name, KTU or APJAKTU, previous year question paper, and pdf.\n"
            "Use only keywords. No punctuation-heavy sentence. No explanation.\n"
        )

        return system_prompt, user_message

    def _extract_generated_text(self, payload: Any) -> str:
        if isinstance(payload, dict) and isinstance(payload.get("choices"), list):
            choice = payload["choices"][0] if payload["choices"] else {}
            message = choice.get("message", {}) if isinstance(choice, dict) else {}

            if isinstance(message, dict):
                return str(message.get("content", ""))

        if isinstance(payload, list) and payload:
            first_item = payload[0]

            if isinstance(first_item, dict):
                return str(first_item.get("generated_text", ""))

            return str(first_item)

        if isinstance(payload, dict):
            return str(payload.get("generated_text", payload.get("summary_text", "")))

        return str(payload)

    def _clean_refined_prompt(self, text: str, subject_code: str, subject_name: str) -> str:
        text = re.sub(r"<\|/?(?:assistant|user|system)\|>", " ", text)
        text = text.replace("</s>", " ")
        text = text.replace("`", " ")
        text = text.strip().strip("\"'")
        text = re.sub(r"\s+", " ", text).strip()
        query_match = re.search(r"\bQUERY\s*:\s*(.+)", text, flags=re.IGNORECASE)

        if query_match:
            text = query_match.group(1).strip()
        else:
            text = re.sub(r"^\W*(search query|query)\s*:\s*", "", text, flags=re.IGNORECASE)

        text = text.strip().strip("\"'")
        text = re.sub(r"\b(example format|example|format|explanation)\s*:?.*$", "", text, flags=re.IGNORECASE).strip()
        text = re.sub(r"^\W*(search query|query)\s*:\s*", "", text, flags=re.IGNORECASE).strip()

        required_terms = [subject_code, subject_name, "KTU", "previous year question paper", "pdf"]

        for term in required_terms:
            if term.lower() not in text.lower():
                text = f"{text} {term}".strip()

        return text[:220]
