import os
import uuid
from pathlib import Path

from fastapi import Depends, APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.auth import CurrentUser, require_job_seeker
from app.config import settings
from app.database.client import db
from app.schemas import Message, ResumeOut
from app.services.resume_service import ResumeParseError, parse_resume

router = APIRouter(prefix="/api/resumes", tags=["Resumes"])

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc"}
ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "application/octet-stream",
}
MAGIC = {b"%PDF": ".pdf", b"PK\x03\x04": ".docx", b"\xd0\xcf\x11\xe0": ".doc"}


async def _seeker_for(user_id: str):
    seeker = await db.jobseeker.find_unique(where={"userId": user_id})
    if not seeker:
        raise HTTPException(status_code=404, detail="Job seeker profile not found")
    return seeker


async def _display_skills(parsed: list[str]) -> list[str]:
    """Map parser output onto the taxonomy's display names.

    The parser emits canonical lowercase keys; the skills collection holds the
    human-readable labels shown across the UI. Unknown keys fall back to the
    parser's own casing so custom vocabulary still round-trips.
    """
    catalog = await db.skill.find_many()
    labels = {s.name.lower(): s.name for s in catalog}
    return [labels.get(skill.lower(), skill) for skill in parsed]


def _merge_skills(existing: list[str], incoming: list[str]) -> list[str]:
    """Union two skill lists without introducing case-only duplicates."""
    merged = list(existing)
    seen = {skill.lower() for skill in existing}
    for skill in incoming:
        if skill.lower() not in seen:
            merged.append(skill)
            seen.add(skill.lower())
    return sorted(merged, key=str.lower)


def _upload_root() -> Path:
    root = Path(__file__).resolve().parents[2] / settings.upload_dir
    root.mkdir(parents=True, exist_ok=True)
    return root


@router.post("/upload", response_model=ResumeOut, status_code=201, dependencies=[Depends(require_job_seeker)])
async def upload_resume(user: CurrentUser, file: UploadFile = File(...)):
    seeker = await _seeker_for(user.id)
    filename = file.filename or "resume"
    extension = os.path.splitext(filename)[1].lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are allowed")
    if file.content_type and file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported file content type")

    content = await file.read()
    max_bytes = settings.max_upload_mb * 1024 * 1024
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=413, detail=f"File exceeds the {settings.max_upload_mb} MB limit"
        )

    # Verify the real file signature rather than trusting the extension alone.
    detected = next((ext for magic, ext in MAGIC.items() if content.startswith(magic)), None)
    if detected is None:
        raise HTTPException(status_code=400, detail="File content is not a valid PDF or DOCX")

    try:
        text, parsed = parse_resume(filename, content)
    except ResumeParseError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    skills = await _display_skills(parsed)

    stored_name = f"{seeker.id}-{uuid.uuid4().hex}{detected}"
    destination = _upload_root() / stored_name
    destination.write_bytes(content)

    has_primary = await db.resume.find_first(where={"jobSeekerId": seeker.id, "isPrimary": True})
    resume = await db.resume.create(
        data={
            "jobSeekerId": seeker.id,
            "fileName": filename,
            "filePath": stored_name,
            "fileType": (file.content_type or detected),
            "fileSize": len(content),
            "parsedText": text[:20000],
            "parsedSkills": skills,
            "isPrimary": not bool(has_primary),
        }
    )

    # Keep the seeker's skill list in sync with what the resume states.
    merged = _merge_skills(seeker.skills or [], skills)
    await db.jobseeker.update(
        where={"id": seeker.id},
        data={"resumeUrl": stored_name, "skills": merged},
    )
    return resume


@router.get("", response_model=list[ResumeOut], dependencies=[Depends(require_job_seeker)])
async def list_my_resumes(user: CurrentUser):
    seeker = await _seeker_for(user.id)
    return await db.resume.find_many(where={"jobSeekerId": seeker.id}, order={"createdAt": "desc"})


@router.patch("/{resume_id}/primary", response_model=ResumeOut, dependencies=[Depends(require_job_seeker)])
async def set_primary(resume_id: str, user: CurrentUser):
    seeker = await _seeker_for(user.id)
    resume = await db.resume.find_first(where={"id": resume_id, "jobSeekerId": seeker.id})
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    await db.resume.update_many(where={"jobSeekerId": seeker.id}, data={"isPrimary": False})
    updated = await db.resume.update(where={"id": resume_id}, data={"isPrimary": True})
    await db.jobseeker.update(where={"id": seeker.id}, data={"resumeUrl": resume.filePath})
    return updated


@router.get("/{resume_id}/download")
async def download_resume(resume_id: str, user: CurrentUser):
    resume = await db.resume.find_unique(where={"id": resume_id})
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    allowed = user.role == "admin"
    if user.role == "job_seeker":
        seeker = await _seeker_for(user.id)
        allowed = seeker.id == resume.jobSeekerId
    if user.role == "employer" and not allowed:
        employer = await db.employer.find_unique(where={"userId": user.id})
        if employer and employer.companyId:
            applications = await db.application.find_many(
                where={"resumeId": resume_id}, include={"job": True}
            )
            allowed = any(a.job and a.job.companyId == employer.companyId for a in applications)
    if not allowed:
        raise HTTPException(status_code=403, detail="You cannot access this resume")

    path = _upload_root() / resume.filePath
    if not path.exists():
        raise HTTPException(status_code=404, detail="Resume file is missing on the server")
    return FileResponse(path, filename=resume.fileName, media_type=resume.fileType)


@router.delete("/{resume_id}", response_model=Message, dependencies=[Depends(require_job_seeker)])
async def delete_resume(resume_id: str, user: CurrentUser):
    seeker = await _seeker_for(user.id)
    resume = await db.resume.find_first(where={"id": resume_id, "jobSeekerId": seeker.id})
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    path = _upload_root() / resume.filePath
    path.unlink(missing_ok=True)
    await db.resume.delete(where={"id": resume_id})

    if resume.isPrimary:
        fallback = await db.resume.find_first(
            where={"jobSeekerId": seeker.id}, order={"createdAt": "desc"}
        )
        if fallback:
            await db.resume.update(where={"id": fallback.id}, data={"isPrimary": True})
        await db.jobseeker.update(
            where={"id": seeker.id}, data={"resumeUrl": fallback.filePath if fallback else None}
        )
    return Message(detail="Resume deleted")
