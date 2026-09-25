"""Resume text extraction and keyword parsing.

PDF text is read with pypdf, DOCX with python-docx. Skills are detected with a
vocabulary + word-boundary regex pass, which keeps parsing deterministic and
free of any model download at install time. When a spaCy pipeline is available
it is used to enrich multi-word skill detection.
"""

import io
import re

from app.services.skills_data import SKILL_VOCABULARY

try:  # pragma: no cover - optional dependency
    import pypdf
except ImportError:  # pragma: no cover
    pypdf = None  # type: ignore[assignment]

try:  # pragma: no cover - optional dependency
    import docx  # type: ignore
except ImportError:  # pragma: no cover
    docx = None  # type: ignore[assignment]

try:  # pragma: no cover - optional dependency, heavy model
    import spacy

    _NLP = spacy.blank("en")
except Exception:  # pragma: no cover
    _NLP = None


class ResumeParseError(ValueError):
    pass


def extract_text(filename: str, content: bytes) -> str:
    lower = filename.lower()
    if lower.endswith(".pdf"):
        return _extract_pdf(content)
    if lower.endswith((".docx", ".doc")):
        return _extract_docx(content)
    raise ResumeParseError("Only PDF and DOCX resumes are supported")


def _extract_pdf(content: bytes) -> str:
    if pypdf is None:
        raise ResumeParseError("PDF support is not installed on the server")
    try:
        reader = pypdf.PdfReader(io.BytesIO(content))
        return "\n".join((page.extract_text() or "") for page in reader.pages)
    except Exception as exc:
        raise ResumeParseError(f"Could not read PDF file: {exc}") from exc


def _extract_docx(content: bytes) -> str:
    if docx is None:
        raise ResumeParseError("DOCX support is not installed on the server")
    try:
        document = docx.Document(io.BytesIO(content))
        parts = [p.text for p in document.paragraphs]
        for table in document.tables:
            for row in table.rows:
                parts.extend(cell.text for cell in row.cells)
        return "\n".join(parts)
    except Exception as exc:
        raise ResumeParseError(f"Could not read DOCX file: {exc}") from exc


def _alias_index() -> dict[str, str]:
    """Map every alias to its canonical skill name so variants collapse."""
    return {
        alias.lower(): canonical
        for canonical, aliases in SKILL_VOCABULARY.items()
        for alias in aliases
    }


def _vocabulary_matches(text: str) -> set[str]:
    lowered = text.lower()
    found: set[str] = set()
    for canonical, aliases in SKILL_VOCABULARY.items():
        for alias in aliases:
            pattern = r"(?<![a-z0-9])" + re.escape(alias) + r"(?![a-z0-9])"
            if re.search(pattern, lowered):
                found.add(canonical)
                break
    return found


def parse_resume(filename: str, content: bytes) -> tuple[str, list[str]]:
    text = extract_text(filename, content)
    skills = _vocabulary_matches(text)

    if _NLP is not None:  # pragma: no cover - depends on optional model
        aliases = _alias_index()
        doc = _NLP(text[:20000])
        for token in doc:
            canonical = aliases.get(token.text.strip().lower())
            if canonical:
                skills.add(canonical)

    return text, sorted(skills)
