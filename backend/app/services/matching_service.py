"""Skill-based job matching.

The score blends a Jaccard overlap on required skills (70%) with a TF-IDF
cosine similarity over job seeker profile text vs job text (30%). Everything is
computed locally from the job seeker's profile, resumes and the job documents,
so no external service is involved.
"""

import math
import re
from collections import Counter

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    HAS_SKLEARN = True
except Exception:
    HAS_SKLEARN = False


def _normalise(skill: str) -> str:
    return re.sub(r"[^a-z0-9+#./]", "", skill.lower().strip())


def skill_overlap(seeker_skills: list[str], job_skills: list[str]) -> tuple[float, list[str], list[str]]:
    seeker = {_normalise(s) for s in seeker_skills if s and s.strip()}
    required = {_normalise(s) for s in job_skills if s and s.strip()}
    if not required:
        return 0.0, [], []
    matched = sorted(seeker & required)
    missing = sorted(required - seeker)
    return len(matched) / len(required), matched, missing


def _fallback_text_similarity(text1: str, text2: str) -> float:
    words1 = re.findall(r"\w+", text1.lower())
    words2 = re.findall(r"\w+", text2.lower())
    if not words1 or not words2:
        return 0.0
    vec1 = Counter(words1)
    vec2 = Counter(words2)
    intersection = set(vec1.keys()) & set(vec2.keys())
    numerator = sum(vec1[x] * vec2[x] for x in intersection)
    sum1 = sum(v ** 2 for v in vec1.values())
    sum2 = sum(v ** 2 for v in vec2.values())
    denominator = math.sqrt(sum1) * math.sqrt(sum2)
    if not denominator:
        return 0.0
    return float(numerator / denominator)


def text_similarity(profile_text: str, job_text: str) -> float:
    if not profile_text.strip() or not job_text.strip():
        return 0.0
    if HAS_SKLEARN:
        try:
            matrix = TfidfVectorizer(stop_words="english", ngram_range=(1, 2)).fit_transform(
                [profile_text, job_text]
            )
            return float(cosine_similarity(matrix[0:1], matrix[1:2])[0][0])
        except Exception:
            pass
    return _fallback_text_similarity(profile_text, job_text)


def combined_score(skill_score: float, text_score: float) -> float:
    return round((0.7 * skill_score + 0.3 * text_score) * 100, 2)


def seeker_profile_text(profile) -> str:
    if profile is None:
        return ""
    parts = [
        profile.headline or "",
        profile.summary or "",
        profile.education or "",
        profile.location or "",
        " ".join(profile.skills or []),
    ]
    return " ".join(p for p in parts if p)


def job_text(job) -> str:
    parts = [
        job.title,
        job.description or "",
        job.requirements or "",
        job.responsibilities or "",
        job.location or "",
        " ".join(job.skills or []),
        str(job.experienceMin or ""),
    ]
    return " ".join(p for p in parts if p)


def experience_fit(seeker_years: float, job_min: float, job_max: float | None) -> float:
    """1.0 when the seeker sits inside the band, tapering off outside it."""
    if job_min is None:
        job_min = 0
    if seeker_years < job_min:
        gap = job_min - seeker_years
        return max(0.0, 1.0 - gap / 5.0)
    if job_max is not None and seeker_years > job_max:
        gap = seeker_years - job_max
        return max(0.0, 1.0 - gap / 5.0)
    return 1.0


def score_job(profile, job) -> tuple[float, float, list[str], list[str]]:
    """Return (final_score_percent, skill_ratio, matched, missing)."""
    skill_ratio, matched, missing = skill_overlap(profile.skills or [], job.skills or [])
    text_score = text_similarity(seeker_profile_text(profile), job_text(job))
    exp = experience_fit(profile.experienceYears or 0, job.experienceMin, job.experienceMax)
    base = 0.7 * skill_ratio + 0.3 * text_score
    final = round((0.75 * base + 0.25 * exp) * 100, 2)
    return final, round(skill_ratio, 4), matched, missing
