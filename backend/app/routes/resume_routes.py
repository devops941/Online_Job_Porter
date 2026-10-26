import os
import uuid
from pathlib import Path

from fastapi import Depends, APIRouter, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, Response

from app.auth import CurrentUser, require_job_seeker
from app.config import settings
from app.database.client import db
from app.schemas import Message, ResumeOut
from app.services import cloudinary_service
from app.services.resume_service import ResumeParseError, parse_resume

router = APIRouter(prefix="/api/resumes", tags=["Resumes"])

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt", ".rtf"}
ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "application/octet-stream",
    "text/plain",
    "application/rtf",
    "text/rtf",
}
MAGIC = {
    b"%PDF": ".pdf",
    b"PK\x03\x04": ".docx",
    b"\xd0\xcf\x11\xe0": ".doc",
    b"{\\rtf": ".rtf",
}


async def _seeker_for(user_id: str):
    seeker = await db.jobseeker.find_unique(where={"userId": user_id})
    if not seeker:
        raise HTTPException(status_code=404, detail="Job seeker profile not found")
    return seeker


async def _display_skills(parsed: list[str]) -> list[str]:
    catalog = await db.skill.find_many()
    labels = {s.name.lower(): s.name for s in catalog}
    return [labels.get(skill.lower(), skill) for skill in parsed]


def _merge_skills(existing: list[str], incoming: list[str]) -> list[str]:
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
async def upload_resume(
    user: CurrentUser,
    file: UploadFile = File(...),
    isPrimary: bool = Form(False),
    customTitle: str | None = Form(None),
):
    seeker = await _seeker_for(user.id)
    filename = file.filename or "resume"
    extension = os.path.splitext(filename)[1].lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Only PDF (.pdf), Word (.docx, .doc), Text (.txt), and RTF (.rtf) files are allowed",
        )
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

    # Verify signature or allow plain text
    detected = next((ext for magic, ext in MAGIC.items() if content.startswith(magic)), None)
    if detected is None:
        if extension == ".txt":
            detected = ".txt"
        else:
            raise HTTPException(status_code=400, detail="File content is not a valid PDF, Word, or RTF document")

    try:
        text, parsed = parse_resume(filename, content)
    except ResumeParseError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    skills = await _display_skills(parsed)

    # Custom title or original filename
    display_filename = filename
    if customTitle and customTitle.strip():
        clean_title = customTitle.strip()
        display_filename = f"{clean_title}{extension}" if not clean_title.lower().endswith(extension) else clean_title

    # Upload document to Cloudinary
    cld_result = cloudinary_service.upload_resume_file(content, display_filename, seeker.id)
    stored_path = cld_result["secure_url"]

    has_primary = await db.resume.find_first(where={"jobSeekerId": seeker.id, "isPrimary": True})
    make_primary = isPrimary or not bool(has_primary)

    if make_primary:
        await db.resume.update_many(where={"jobSeekerId": seeker.id}, data={"isPrimary": False})

    resume = await db.resume.create(
        data={
            "jobSeekerId": seeker.id,
            "fileName": display_filename,
            "filePath": stored_path,
            "fileType": (file.content_type or detected),
            "fileSize": len(content),
            "parsedText": text[:20000],
            "parsedSkills": skills,
            "isPrimary": make_primary,
        }
    )

    # Keep the seeker's skill list in sync with what the resume states.
    merged = _merge_skills(seeker.skills or [], skills)
    update_data: dict = {"skills": merged}
    if make_primary:
        update_data["resumeUrl"] = stored_path
    await db.jobseeker.update(
        where={"id": seeker.id},
        data=update_data,
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
async def download_resume(resume_id: str, user: CurrentUser, inline: bool = False):
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

    disposition = f'inline; filename="{resume.fileName}"' if inline else f'attachment; filename="{resume.fileName}"'
    content_type = resume.fileType or "application/octet-stream"
    if resume.fileName.lower().endswith(".pdf"):
        content_type = "application/pdf"
    elif resume.fileName.lower().endswith(".txt"):
        content_type = "text/plain; charset=utf-8"

    # If stored in Cloudinary, fetch the remote bytes and stream to client with filename
    if resume.filePath.startswith("http://") or resume.filePath.startswith("https://"):
        try:
            file_bytes = cloudinary_service.fetch_remote_file(resume.filePath)
            headers = {
                "Content-Disposition": disposition,
            }
            return Response(
                content=file_bytes,
                media_type=content_type,
                headers=headers,
            )
        except Exception as exc:
            raise HTTPException(status_code=502, detail="Failed to fetch resume from storage") from exc

    # Legacy local file fallback
    path = _upload_root() / resume.filePath
    if not path.exists():
        raise HTTPException(status_code=404, detail="Resume file is missing on the server")
    return FileResponse(path, filename=resume.fileName, media_type=content_type, headers={"Content-Disposition": disposition})


@router.delete("/{resume_id}", response_model=Message, dependencies=[Depends(require_job_seeker)])
async def delete_resume(resume_id: str, user: CurrentUser):
    seeker = await _seeker_for(user.id)
    resume = await db.resume.find_first(where={"id": resume_id, "jobSeekerId": seeker.id})
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    # Delete from Cloudinary if remote, or unlink if local file
    if resume.filePath.startswith("http://") or resume.filePath.startswith("https://"):
        cloudinary_service.delete_file(resume.filePath, resource_type="raw")
    else:
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
