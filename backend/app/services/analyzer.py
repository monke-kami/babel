import json
import logging
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from pypdf import PdfReader

try:
    import chromadb
except ImportError:
    chromadb = None

try:
    import numpy as np
except ImportError:
    np = None

try:
    from langchain_huggingface import HuggingFaceEmbeddings
except ImportError:
    HuggingFaceEmbeddings = None

logger = logging.getLogger(__name__)
BACKEND_DIR = Path(__file__).resolve().parents[2]


STOPWORDS = {
    "the", "and", "for", "with", "from", "into", "that", "this", "what",
    "how", "why", "when", "where", "which", "write", "explain", "describe",
    "discuss", "define", "differentiate", "compare", "between", "using",
    "give", "list", "state", "briefly", "detail", "note", "short", "answer",
    "following", "suitable", "diagram", "example", "examples", "neat",
    "also", "each", "any", "all", "are", "is", "was", "were", "can",
    "could", "should", "would", "will", "shall", "has", "have", "had",
    "its", "their", "there", "they", "them", "his", "her", "our", "your",
    "marks", "mark", "ktu", "question", "paper", "module", "part", "section",
    "semester", "regular", "supplementary", "scheme", "exam", "examination"
}


SUBJECT_NAMES = {
    "CST302": "Operating Systems",
    "CST304": "Database Management Systems",
    "CST306": "Computer Networks",
    "CST308": "Software Engineering",
}


TOPIC_RULES = {
    "CST302": {
        "Process Management": {
            "module": "Module 1",
            "keywords": [
                "process", "process state", "process states", "pcb",
                "process control block", "context switch", "thread",
                "multithreading", "system call", "scheduler", "scheduling queues"
            ],
        },
        "CPU Scheduling": {
            "module": "Module 1",
            "keywords": [
                "cpu scheduling", "fcfs", "sjf", "srtf", "round robin",
                "priority scheduling", "gantt chart", "waiting time",
                "turnaround time", "response time", "dispatcher"
            ],
        },
        "Process Synchronization": {
            "module": "Module 2",
            "keywords": [
                "synchronization", "critical section", "critical-section",
                "semaphore", "mutex", "lock", "producer consumer",
                "producer-consumer", "readers writers", "reader writer",
                "dining philosopher", "monitor"
            ],
        },
        "Deadlock": {
            "module": "Module 2",
            "keywords": [
                "deadlock", "banker", "banker's", "safe state",
                "unsafe state", "resource allocation graph",
                "deadlock prevention", "deadlock avoidance",
                "deadlock detection", "circular wait", "hold and wait"
            ],
        },
        "Memory Management": {
            "module": "Module 3",
            "keywords": [
                "memory management", "paging", "segmentation",
                "virtual memory", "page table", "tlb", "logical address",
                "physical address", "address translation", "demand paging"
            ],
        },
        "Page Replacement": {
            "module": "Module 3",
            "keywords": [
                "page replacement", "page fault", "fifo", "lru",
                "optimal page", "optimal replacement", "reference string",
                "belady", "thrashing", "working set"
            ],
        },
        "File System": {
            "module": "Module 4",
            "keywords": [
                "file system", "directory", "inode", "file allocation",
                "contiguous allocation", "linked allocation", "indexed allocation",
                "free space", "access methods"
            ],
        },
        "Disk Scheduling": {
            "module": "Module 4",
            "keywords": [
                "disk scheduling", "seek time", "sstf", "scan", "c-scan",
                "look", "c-look", "cylinder", "disk arm", "fcfs disk"
            ],
        },
        "Protection and Security": {
            "module": "Module 4",
            "keywords": [
                "protection", "security", "access matrix", "access control",
                "authentication", "authorization", "capability", "domain"
            ],
        },
    }
}


class AnalyzerService:
    def __init__(self):
        self.raw_pdfs_dir = BACKEND_DIR / "data" / "raw_pdfs"
        self.processed_dir = BACKEND_DIR / "data" / "processed"
        self.processed_dir.mkdir(parents=True, exist_ok=True)

        self.chroma_client = None
        self.embeddings = None

        if chromadb and HuggingFaceEmbeddings:
            try:
                self.chroma_client = chromadb.PersistentClient(path=str(BACKEND_DIR / "data" / "chroma_db"))
                self.embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
            except Exception as e:
                logger.warning("Vector clustering disabled; using lexical fallback: %s", e)

    def list_subjects(self) -> list[dict[str, Any]]:
        subjects = []

        for subject_dir in self.raw_pdfs_dir.glob("*"):
            if subject_dir.is_dir():
                code = subject_dir.name.upper()
                subjects.append({
                    "code": code,
                    "name": SUBJECT_NAMES.get(code, code),
                    "pdf_count": len(list(subject_dir.glob("*.pdf"))),
                })

        for code, name in SUBJECT_NAMES.items():
            if not any(item["code"] == code for item in subjects):
                subjects.append({
                    "code": code,
                    "name": name,
                    "pdf_count": 0,
                })

        return sorted(subjects, key=lambda x: x["code"])

    def process_pdfs_for_subject(self, subject_code: str) -> dict[str, Any]:
        subject_code = subject_code.upper().strip()
        subject_dir = self.raw_pdfs_dir / subject_code

        if not subject_dir.exists():
            raise FileNotFoundError(
                f"No downloaded PDFs found for {subject_code}. Run scraping first."
            )

        pdf_paths = sorted(subject_dir.glob("*.pdf"))

        if not pdf_paths:
            raise FileNotFoundError(
                f"No PDF files found in data/raw_pdfs/{subject_code}."
            )

        extracted_questions = []

        for pdf_path in pdf_paths:
            logger.info(f"Extracting questions from {pdf_path.name}")

            text = self._read_pdf_text(pdf_path)
            questions = self._extract_questions(text)
            year = self._extract_year(pdf_path.name)

            logger.info(f"{pdf_path.name}: extracted {len(questions)} questions")

            for question in questions:
                extracted_questions.append({
                    "question": question,
                    "year": year,
                    "source": pdf_path.name,
                    "subject_code": subject_code,
                })

        if not extracted_questions:
            raise ValueError(
                "PDFs were downloaded, but no questions could be extracted. "
                "The PDFs may be scanned images or unsupported format."
            )

        logger.info(f"Total extracted questions: {len(extracted_questions)}")

        clusters = self._cluster_similar_questions(extracted_questions)
        clusters = self._assign_topics(subject_code, clusters)

        analysis = self._build_analysis(
            subject_code=subject_code,
            clusters=clusters,
            pdf_count=len(pdf_paths),
            raw_question_count=len(extracted_questions),
        )

        self._save_analysis(subject_code, analysis)
        self._store_in_chroma(subject_code, extracted_questions)

        return analysis

    def analyze_and_rank_questions(self, subject_code: str) -> dict[str, list[dict[str, Any]]]:
        analysis = self.get_analysis(subject_code)
        return analysis["ranked_by_module"]

    def get_analysis(self, subject_code: str) -> dict[str, Any]:
        subject_code = subject_code.upper().strip()
        path = self.processed_dir / f"{subject_code}_analysis.json"

        if not path.exists():
            return self.process_pdfs_for_subject(subject_code)

        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def get_topics(self, subject_code: str) -> list[dict[str, Any]]:
        return self.get_analysis(subject_code)["important_topics"]

    def get_topic_insight(self, subject_code: str, topic_name: str) -> dict[str, Any]:
        analysis = self.get_analysis(subject_code)
        topic_query = topic_name.lower().strip()

        matches = [
            q for q in analysis["frequently_asked_questions"]
            if topic_query in q["topic"].lower()
            or topic_query in q["question"].lower()
        ]

        if not matches:
            return {
                "topic": topic_name,
                "message": "No matching topic was found in the analyzed PYQs.",
                "most_frequent_question": None,
                "frequency": 0,
                "years": [],
                "sources": [],
            }

        best = sorted(matches, key=lambda x: x["frequency"], reverse=True)[0]

        return {
            "topic": best["topic"],
            "most_frequent_question": best["question"],
            "frequency": best["frequency"],
            "years": best["years"],
            "sources": best["sources"],
        }

    def chat(self, subject_code: str, message: str) -> dict[str, Any]:
        subject_code = subject_code.upper().strip()
        analysis = self.get_analysis(subject_code)
        message_lower = message.lower()

        if "important" in message_lower or "topics" in message_lower:
            top_topics = analysis["important_topics"][:7]

            lines = [
                f"{i + 1}. {topic['topic']} — appeared {topic['count']} times"
                for i, topic in enumerate(top_topics)
            ]

            return {
                "answer": "Important topics found from analyzed PYQs:\n\n" + "\n".join(lines),
                "data": top_topics,
            }

        if "frequent" in message_lower or "repeated" in message_lower or "asked" in message_lower:
            for topic in analysis["important_topics"]:
                if topic["topic"].lower() in message_lower:
                    insight = self.get_topic_insight(subject_code, topic["topic"])

                    return {
                        "answer": (
                            f"Most repeated question from **{insight['topic']}**:\n\n"
                            f"**{insight['most_frequent_question']}**\n\n"
                            f"Frequency: **{insight['frequency']}**\n"
                            f"Years: {', '.join(insight['years']) if insight['years'] else 'Not available'}"
                        ),
                        "data": insight,
                    }

            top_questions = analysis["frequently_asked_questions"][:7]

            lines = [
                f"{i + 1}. {q['question']} — asked {q['frequency']} times"
                for i, q in enumerate(top_questions)
            ]

            return {
                "answer": "Most frequently repeated questions:\n\n" + "\n".join(lines),
                "data": top_questions,
            }

        for topic in analysis["important_topics"]:
            if topic["topic"].lower() in message_lower:
                insight = self.get_topic_insight(subject_code, topic["topic"])

                return {
                    "answer": (
                        f"For **{insight['topic']}**, the most frequent question is:\n\n"
                        f"**{insight['most_frequent_question']}**\n\n"
                        f"It appeared **{insight['frequency']} times**."
                    ),
                    "data": insight,
                }

        return {
            "answer": (
                f"I analyzed **{subject_code} - {analysis['subject_name']}** from downloaded PYQs.\n\n"
                f"PDFs analyzed: **{analysis['pdf_count']}**\n"
                f"Questions extracted: **{analysis['raw_question_count']}**\n"
                f"Repeated question groups: **{len(analysis['frequently_asked_questions'])}**\n\n"
                "Ask things like:\n"
                "- important topics\n"
                "- most repeated questions\n"
                "- most repeated question from deadlock\n"
                "- questions from page replacement"
            ),
            "data": analysis,
        }

    def _read_pdf_text(self, pdf_path: Path) -> str:
        text_parts = []

        try:
            reader = PdfReader(str(pdf_path))

            for page_index, page in enumerate(reader.pages):
                try:
                    text = page.extract_text() or ""
                    text_parts.append(text)
                except Exception as e:
                    logger.warning(f"Could not read page {page_index + 1} from {pdf_path.name}: {e}")

        except Exception as e:
            logger.warning(f"Could not read PDF {pdf_path.name}: {e}")

        return "\n".join(text_parts)

    def _extract_questions(self, text: str) -> list[str]:
        text = text.replace("\r", "\n")
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"\n{2,}", "\n", text)

        questions = []

        pattern = re.compile(
            r"(?:^|\n)\s*"
            r"(?:Q?\s*\d{1,2}\s*[a-zA-Z]?\s*[.)]|[a-zA-Z]\s*[.)])\s+"
            r"(.{25,900}?)"
            r"(?=\n\s*(?:Q?\s*\d{1,2}\s*[a-zA-Z]?\s*[.)]|[a-zA-Z]\s*[.)])\s+|\Z)",
            re.IGNORECASE | re.DOTALL,
        )

        for match in pattern.finditer(text):
            question = self._clean_question(match.group(1))

            if self._looks_like_question(question):
                questions.append(question)

        if not questions:
            compact_text = re.sub(r"\s+", " ", text)
            possible_questions = re.split(r"(?<=[?.])\s+", compact_text)

            for item in possible_questions:
                question = self._clean_question(item)

                if self._looks_like_question(question):
                    questions.append(question)

        return self._dedupe_questions(questions)

    def _clean_question(self, question: str) -> str:
        question = re.sub(r"\s+", " ", question).strip()

        question = re.sub(
            r"\[\s*\d+\s*(marks?|mark)?\s*\]",
            "",
            question,
            flags=re.IGNORECASE,
        )

        question = re.sub(
            r"\(\s*\d+\s*(marks?|mark)?\s*\)",
            "",
            question,
            flags=re.IGNORECASE,
        )

        question = re.sub(r"^OR\s+", "", question, flags=re.IGNORECASE)
        question = re.sub(r"^\d+\s*[a-zA-Z]?\s*[.)]\s*", "", question)
        question = re.sub(r"^[a-zA-Z]\s*[.)]\s*", "", question)

        question = question.strip(" -:;")

        return question

    def _looks_like_question(self, text: str) -> bool:
        if len(text) < 25 or len(text) > 900:
            return False

        lower = text.lower()

        bad_terms = [
            "reg no", "name:", "maximum marks", "duration", "page",
            "answer all questions", "part a", "part b", "apj abdul kalam",
            "university", "course code", "course name", "scheme"
        ]

        if any(term in lower for term in bad_terms):
            return False

        question_terms = [
            "explain", "define", "describe", "discuss", "differentiate",
            "write", "what", "how", "why", "derive", "calculate",
            "illustrate", "compare", "list", "state", "solve", "design",
            "construct", "show", "prove", "find", "draw", "consider"
        ]

        return any(term in lower for term in question_terms)

    def _dedupe_questions(self, questions: list[str]) -> list[str]:
        seen = set()
        unique_questions = []

        for question in questions:
            key = re.sub(r"[^a-z0-9]+", "", question.lower())

            if key not in seen:
                seen.add(key)
                unique_questions.append(question)

        return unique_questions

    def _extract_year(self, filename: str) -> str:
        match = re.search(r"(20\d{2}|19\d{2})", filename)
        return match.group(1) if match else "Unknown"

    def _cluster_similar_questions(self, questions: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not questions:
            return []

        if len(questions) == 1:
            item = questions[0]

            return [{
                "question": item["question"],
                "frequency": 1,
                "years": [item["year"]],
                "sources": [item["source"]],
                "variations": [item["question"]],
            }]

        embeddings = None

        if self.embeddings and np is not None:
            texts = [item["question"] for item in questions]
            embeddings = np.array(self.embeddings.embed_documents(texts))

        visited = set()
        clusters = []

        for i, item in enumerate(questions):
            if i in visited:
                continue

            cluster_items = [item]
            visited.add(i)

            for j in range(i + 1, len(questions)):
                if j in visited:
                    continue

                if embeddings is not None:
                    similarity = self._cosine_similarity(embeddings[i], embeddings[j])
                else:
                    similarity = self._lexical_similarity(item["question"], questions[j]["question"])

                if similarity >= 0.82:
                    cluster_items.append(questions[j])
                    visited.add(j)

            representative = self._choose_representative_question(cluster_items)

            clusters.append({
                "question": representative,
                "frequency": len(cluster_items),
                "years": sorted(set(x["year"] for x in cluster_items)),
                "sources": sorted(set(x["source"] for x in cluster_items)),
                "variations": [x["question"] for x in cluster_items],
            })

        return sorted(clusters, key=lambda x: x["frequency"], reverse=True)

    def _choose_representative_question(self, cluster_items: list[dict[str, Any]]) -> str:
        questions = [
            self._refine_question_text(item["question"])
            for item in cluster_items
        ]
        questions = [question for question in questions if question]

        if not questions:
            return "Question text unavailable"

        def score(question: str) -> tuple[int, int]:
            lower = question.lower()
            command_terms = [
                "explain", "define", "describe", "discuss", "differentiate",
                "write", "derive", "calculate", "illustrate", "compare",
                "solve", "design", "construct", "draw"
            ]
            command_score = sum(1 for term in command_terms if term in lower)
            length_penalty = abs(len(question) - 180)
            return (command_score, -length_penalty)

        return max(questions, key=score)

    def _refine_question_text(self, question: str) -> str:
        question = re.sub(r"\bOR\b\s*$", "", question, flags=re.IGNORECASE)
        question = re.sub(r"\bModule\s+[IVXLC0-9]+\b", "", question, flags=re.IGNORECASE)
        question = re.sub(r"\b[lt]\s*\d{1,2}\s+[a-z]\)", "", question, flags=re.IGNORECASE)
        question = re.sub(r"\s+([?.!,;:])", r"\1", question)
        question = re.sub(r"([?.!])(?=[A-Za-z])", r"\1 ", question)
        question = re.sub(r"\s+", " ", question).strip(" -:;'\"")

        spelling_fixes = {
            "Speciff": "Specify",
            "Justiff": "Justify",
            "Constnrct": "Construct",
            "gftunmar": "grammar",
            "gftlrnmar": "grammar",
            "gmmmar": "grammar",
        }

        for typo, replacement in spelling_fixes.items():
            question = re.sub(rf"\b{re.escape(typo)}\b", replacement, question, flags=re.IGNORECASE)

        return question

    def _assign_topics(self, subject_code: str, clusters: list[dict[str, Any]]) -> list[dict[str, Any]]:
        for cluster in clusters:
            combined_text = " ".join(cluster["variations"])

            topic, module = self._classify_topic(subject_code, combined_text)

            cluster["topic"] = topic
            cluster["module"] = module

        return clusters

    def _classify_topic(self, subject_code: str, text: str) -> tuple[str, str]:
        rules = TOPIC_RULES.get(subject_code, {})
        lower = text.lower()

        best_topic = None
        best_module = "Dynamic PYQ Topics"
        best_score = 0

        for topic, info in rules.items():
            score = 0

            for keyword in info["keywords"]:
                keyword_lower = keyword.lower()

                if keyword_lower in lower:
                    score += len(keyword_lower.split()) + 1

            if score > best_score:
                best_score = score
                best_topic = topic
                best_module = info["module"]

        if best_topic and best_score > 0:
            return best_topic, best_module

        return self._extract_dynamic_topic_name(text), "Dynamic PYQ Topics"

    def _extract_dynamic_topic_name(self, text: str) -> str:
        words = re.findall(r"[A-Za-z][A-Za-z+-]*", text.lower())
        words = [word for word in words if word not in STOPWORDS and len(word) > 2]

        candidates = []

        for n in [3, 2, 1]:
            for i in range(len(words) - n + 1):
                phrase_words = words[i:i + n]

                if any(word in STOPWORDS for word in phrase_words):
                    continue

                phrase = " ".join(phrase_words)

                if len(phrase) >= 4:
                    candidates.append(phrase)

        if not candidates:
            return "General Concepts"

        counter = Counter(candidates)
        topic = counter.most_common(1)[0][0]

        return topic.title()

    def _cosine_similarity(self, a: Any, b: Any) -> float:
        if np is None:
            return 0.0

        denominator = np.linalg.norm(a) * np.linalg.norm(b)

        if denominator == 0:
            return 0.0

        return float(np.dot(a, b) / denominator)

    def _lexical_similarity(self, first: str, second: str) -> float:
        first_tokens = self._content_tokens(first)
        second_tokens = self._content_tokens(second)

        if not first_tokens or not second_tokens:
            return 0.0

        overlap = first_tokens.intersection(second_tokens)
        union = first_tokens.union(second_tokens)

        return len(overlap) / len(union)

    def _content_tokens(self, text: str) -> set[str]:
        return {
            word
            for word in re.findall(r"[a-zA-Z][a-zA-Z0-9+-]*", text.lower())
            if word not in STOPWORDS and len(word) > 2
        }

    def _build_analysis(
        self,
        subject_code: str,
        clusters: list[dict[str, Any]],
        pdf_count: int,
        raw_question_count: int,
    ) -> dict[str, Any]:
        topic_counts = defaultdict(int)
        ranked_by_module = defaultdict(list)

        for cluster in clusters:
            topic_counts[cluster["topic"]] += cluster["frequency"]
            ranked_by_module[cluster["module"]].append(cluster)

        important_topics = []

        max_count = max(topic_counts.values()) if topic_counts else 1

        for topic, count in topic_counts.items():
            important_topics.append({
                "topic": topic,
                "count": count,
                "importance_score": round((count / max_count) * 100),
            })

        important_topics.sort(key=lambda x: x["count"], reverse=True)

        final_ranked_by_module = {}

        for module, questions in ranked_by_module.items():
            sorted_questions = sorted(
                questions,
                key=lambda x: x["frequency"],
                reverse=True,
            )

            for index, question in enumerate(sorted_questions):
                question["rank"] = index + 1

            final_ranked_by_module[module] = sorted_questions

        frequently_asked_questions = sorted(
            clusters,
            key=lambda x: x["frequency"],
            reverse=True,
        )

        for index, question in enumerate(frequently_asked_questions):
            question["overall_rank"] = index + 1

        return {
            "subject_code": subject_code,
            "subject_name": SUBJECT_NAMES.get(subject_code, subject_code),
            "pdf_count": pdf_count,
            "raw_question_count": raw_question_count,
            "important_topics": important_topics,
            "frequently_asked_questions": frequently_asked_questions,
            "ranked_by_module": final_ranked_by_module,
        }

    def _save_analysis(self, subject_code: str, analysis: dict[str, Any]) -> None:
        path = self.processed_dir / f"{subject_code}_analysis.json"

        with open(path, "w", encoding="utf-8") as f:
            json.dump(analysis, f, indent=2, ensure_ascii=False)

    def _store_in_chroma(self, subject_code: str, questions: list[dict[str, Any]]) -> None:
        if not questions or not self.chroma_client or not self.embeddings:
            return

        collection_name = f"ktu_{subject_code.lower()}"

        try:
            self.chroma_client.delete_collection(collection_name)
        except Exception:
            pass

        collection = self.chroma_client.get_or_create_collection(name=collection_name)

        documents = [item["question"] for item in questions]
        embeddings = self.embeddings.embed_documents(documents)

        ids = [
            f"{subject_code}_{index}_{abs(hash(item['question']))}"
            for index, item in enumerate(questions)
        ]

        metadatas = [
            {
                "subject_code": item["subject_code"],
                "year": item["year"],
                "source": item["source"],
            }
            for item in questions
        ]

        collection.upsert(
            ids=ids,
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas,
        )
