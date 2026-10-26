"""Skill-based job matching.

The score blends a Jaccard overlap on required skills (70%) with a TF-IDF
cosine similarity over job seeker profile text vs job text (30%). Everything is
computed locally from the job seeker's profile, resumes and the job documents,
so no external service is involved.
"""

import math
import re
from collections import Counter

from app.services.skills_data import ROLE_EXPANSIONS

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    HAS_SKLEARN = True
except Exception:
    HAS_SKLEARN = False


def _normalise(skill: str) -> str:
    return re.sub(r"[^a-z0-9+#./]", "", skill.lower().strip())


def expand_skills(skills: list[str] | None, texts: tuple[str, ...] = ()) -> list[str]:
    """Return original skills plus concrete skills implied by umbrella/role terms
    found in the declared skills or in free text (headline/summary). Order-preserving,
    deduped by _normalise.

    A role term triggers when its normalised form matches a declared skill exactly,
    or when it appears as a whole word (case-insensitive) in the joined free text.
    """
    result: list[str] = list(skills or [])
    seen = {_normalise(s) for s in result}
    declared = {_normalise(s) for s in result}
    blob = " ".join(t for t in texts if t).lower()
    for key, concrete in ROLE_EXPANSIONS.items():
        triggered = _normalise(key) in declared or bool(
            re.search(r"\b" + re.escape(key) + r"\b", blob)
        )
        if not triggered:
            continue
        for skill in concrete:
            norm = _normalise(skill)
            if norm not in seen:
                result.append(skill)
                seen.add(norm)
    return result


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
    headline = profile.headline or ""
    parts = [
        # Repeat the headline so TF-IDF weights the role title more heavily.
        headline,
        headline,
        headline,
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


def score_job(
    profile,
    job,
    extra_skills: list[str] | None = None,
    extra_text: str = "",
) -> tuple[float, float, list[str], list[str]]:
    """Return (final_score_percent, skill_ratio, matched, missing).

    extra_skills: additional skills from a parsed resume (merged with profile skills, deduped).
    extra_text: additional text from a parsed resume (appended to seeker profile text).
    """
    # Merge profile skills with extra_skills, preserving order and deduplicating.
    base_skills: list[str] = list(profile.skills or [])
    if extra_skills:
        seen = {_normalise(s) for s in base_skills}
        for s in extra_skills:
            if _normalise(s) not in seen:
                base_skills.append(s)
                seen.add(_normalise(s))

    # Expand umbrella/role terms (e.g. "frontend") into concrete skills so exact
    # token matching against job skills works. Role terms may come from the
    # declared skills or from the headline/summary free text.
    expanded_skills = expand_skills(
        base_skills, texts=(profile.headline or "", profile.summary or "")
    )
    skill_ratio, matched, missing = skill_overlap(expanded_skills, job.skills or [])

    # Merge profile text with extra resume text.
    profile_text = seeker_profile_text(profile)
    if extra_text:
        profile_text = (profile_text + " " + extra_text).strip()

    text_score = text_similarity(profile_text, job_text(job))
    exp = experience_fit(profile.experienceYears or 0, job.experienceMin, job.experienceMax)
    base = 0.7 * skill_ratio + 0.3 * text_score
    final = round((0.75 * base + 0.25 * exp) * 100, 2)
    return final, round(skill_ratio, 4), matched, missing


def rank_jobs(
    profile,
    jobs,
    extra_skills: list[str] | None = None,
    extra_text: str = "",
) -> list[tuple]:
    """Content-based ranking of jobs for a seeker, driven by profile + resume.

    Fits TF-IDF over the whole candidate job corpus so term importance (IDF) is
    meaningful, projects the seeker's profile+resume text into that space, and
    cosine-ranks every job. Blends the text score with skill overlap and
    experience fit using the same weights as score_job.

    Returns a list of tuples sorted by final score desc:
        (job, final_score, matched_skills, missing_skills)
    """
    if not jobs:
        return []

    # Merge profile skills with extra_skills, preserving order and deduplicating.
    seeker_skills: list[str] = list(profile.skills or [])
    if extra_skills:
        seen = {_normalise(s) for s in seeker_skills}
        for s in extra_skills:
            if _normalise(s) not in seen:
                seeker_skills.append(s)
                seen.add(_normalise(s))

    # Expand umbrella/role terms into concrete skills (see score_job) so skill
    # overlap works for seekers who only declare a role like "frontend".
    seeker_skills = expand_skills(
        seeker_skills, texts=(profile.headline or "", profile.summary or "")
    )

    profile_doc = (seeker_profile_text(profile) + " " + (extra_text or "")).strip()
    job_docs = [job_text(j) for j in jobs]

    # Corpus-level TF-IDF: fit over all job docs so IDF is meaningful across the
    # whole candidate set, then project the seeker profile into that space.
    text_scores: list[float]
    use_fallback = True
    if HAS_SKLEARN and any(job_docs):
        try:
            vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2))
            all_docs = job_docs + [profile_doc]
            matrix = vectorizer.fit_transform(all_docs)
            job_matrix = matrix[: len(job_docs)]
            profile_vec = matrix[len(job_docs) :]
            text_scores = cosine_similarity(profile_vec, job_matrix)[0].tolist()
            use_fallback = False
        except Exception:
            pass

    if use_fallback:
        text_scores = [_fallback_text_similarity(profile_doc, d) for d in job_docs]

    results = []
    for i, job in enumerate(jobs):
        skill_ratio, matched, missing = skill_overlap(seeker_skills, job.skills or [])
        text_score = float(text_scores[i])
        exp = experience_fit(profile.experienceYears or 0, job.experienceMin, job.experienceMax)
        base = 0.7 * skill_ratio + 0.3 * text_score
        final = round((0.75 * base + 0.25 * exp) * 100, 2)
        results.append((job, final, matched, missing))

    # Python sort is stable: equal scores keep input order (callers pass newest-first).
    results.sort(key=lambda t: t[1], reverse=True)
    return results
