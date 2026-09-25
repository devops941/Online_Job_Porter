from fastapi import Depends, APIRouter, BackgroundTasks, HTTPException, Query

from app.auth import CurrentUser, require_admin, require_employer, require_employer_or_admin, require_job_seeker
from app.database.client import db
from app.schemas import (
    ApplicationIn,
    ApplicationOut,
    ApplicationStatusUpdate,
    Message,
    Page,
)
from app.services import email_service
from app.services.matching_service import score_job
from app.services.notification_service import notify, notify_application_status
from app.utils.text import safe_term

router = APIRouter(prefix="/api/applications", tags=["Applications"])

INCLUDE = {
    "job": {"include": {"company": True, "category": True}},
    "jobSeeker": {"include": {"user": True}},
}


async def _seeker_for(user_id: str):
    seeker = await db.jobseeker.find_unique(where={"userId": user_id})
    if not seeker:
        raise HTTPException(status_code=404, detail="Job seeker profile not found")
    return seeker


# ---------- Job seeker ----------
@router.post("", response_model=ApplicationOut, status_code=201, dependencies=[Depends(require_job_seeker)])
async def apply_to_job(payload: ApplicationIn, user: CurrentUser):
    seeker = await _seeker_for(user.id)
    job = await db.job.find_unique(where={"id": payload.jobId}, include={"company": True})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != "approved":
        raise HTTPException(status_code=400, detail="This job is not open for applications")

    existing = await db.application.find_first(
        where={"jobId": payload.jobId, "jobSeekerId": seeker.id}
    )
    if existing:
        raise HTTPException(status_code=409, detail="You have already applied to this job")

    resume_id = payload.resumeId
    if resume_id:
        resume = await db.resume.find_first(where={"id": resume_id, "jobSeekerId": seeker.id})
        if not resume:
            raise HTTPException(status_code=400, detail="Resume not found on your profile")
    else:
        primary = await db.resume.find_first(where={"jobSeekerId": seeker.id, "isPrimary": True})
        resume_id = primary.id if primary else None

    match_score, _ratio, _matched, _missing = score_job(seeker, job)

    created = await db.application.create(
        data={
            "jobId": payload.jobId,
            "jobSeekerId": seeker.id,
            "resumeId": resume_id,
            "coverLetter": payload.coverLetter,
            "status": "applied",
            "matchScore": match_score,
        }
    )

    employer = await db.employer.find_first(where={"userId": job.postedById})
    if employer:
        await notify(
            employer.userId,
            "New application received",
            f"{user.fullName} applied for {job.title}.",
            type_="info",
            link="/employer/applicants",
        )

    return await db.application.find_unique(where={"id": created.id}, include=INCLUDE)


@router.get("/me", response_model=Page[ApplicationOut], dependencies=[Depends(require_job_seeker)])
async def my_applications(
    user: CurrentUser,
    status: str | None = None,
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
):
    seeker = await _seeker_for(user.id)
    where: dict = {"jobSeekerId": seeker.id}
    if status:
        where["status"] = status
    total = await db.application.count(where=where)
    items = await db.application.find_many(
        where=where, include=INCLUDE, skip=(page - 1) * pageSize, take=pageSize, order={"createdAt": "desc"}
    )
    return Page[ApplicationOut](
        items=items, total=total, page=page, page_size=pageSize, pages=max(1, -(-total // pageSize))
    )


@router.patch("/{application_id}/withdraw", response_model=ApplicationOut, dependencies=[Depends(require_job_seeker)])
async def withdraw_application(application_id: str, user: CurrentUser):
    seeker = await _seeker_for(user.id)
    application = await db.application.find_unique(where={"id": application_id})
    if not application or application.jobSeekerId != seeker.id:
        raise HTTPException(status_code=404, detail="Application not found")
    if application.status in {"hired", "withdrawn"}:
        raise HTTPException(status_code=400, detail=f"Cannot withdraw a {application.status} application")
    return await db.application.update(
        where={"id": application_id}, data={"status": "withdrawn"}, include=INCLUDE
    )


# ---------- Employer review ----------
@router.get("", response_model=Page[ApplicationOut], dependencies=[Depends(require_employer_or_admin)])
async def list_applications(
    user: CurrentUser,
    jobId: str | None = None,
    status: str | None = None,
    minScore: float | None = None,
    q: str | None = None,
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
):
    where: dict = {}
    if user.role == "employer":
        employer = await db.employer.find_unique(where={"userId": user.id})
        if not employer or not employer.companyId:
            return Page[ApplicationOut](items=[], total=0, page=page, page_size=pageSize, pages=1)
        own_jobs = await db.job.find_many(where={"companyId": employer.companyId}, take=500)
        where["jobId"] = {"in": [j.id for j in own_jobs]}
    if jobId:
        where["jobId"] = jobId
    if status:
        where["status"] = status
    if minScore is not None:
        where["matchScore"] = {"gte": minScore}
    if q:
        term = safe_term(q)
        where["OR"] = [
            {"job": {"is": {"title": {"contains": term, "mode": "insensitive"}}}},
            {"jobSeeker": {"is": {"headline": {"contains": term, "mode": "insensitive"}}}},
            {"jobSeeker": {"is": {"user": {"is": {"fullName": {"contains": term, "mode": "insensitive"}}}}}},
            {"jobSeeker": {"is": {"user": {"is": {"email": {"contains": term, "mode": "insensitive"}}}}}},
        ]

    total = await db.application.count(where=where)
    items = await db.application.find_many(
        where=where, include=INCLUDE, skip=(page - 1) * pageSize, take=pageSize, order={"matchScore": "desc"}
    )
    return Page[ApplicationOut](
        items=items, total=total, page=page, page_size=pageSize, pages=max(1, -(-total // pageSize))
    )


@router.get("/{application_id}", response_model=ApplicationOut, dependencies=[Depends(require_employer_or_admin)])
async def get_application(application_id: str):
    application = await db.application.find_unique(where={"id": application_id}, include=INCLUDE)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    return application


@router.patch(
    "/{application_id}/status",
    response_model=ApplicationOut,
    dependencies=[Depends(require_employer_or_admin)],
)
async def update_application_status(
    application_id: str, payload: ApplicationStatusUpdate, background: BackgroundTasks
):
    application = await db.application.find_unique(where={"id": application_id}, include=INCLUDE)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    data: dict = {"status": payload.status}
    if payload.employerNotes is not None:
        data["employerNotes"] = payload.employerNotes

    updated = await db.application.update(where={"id": application_id}, data=data, include=INCLUDE)

    seeker = await db.jobseeker.find_unique(where={"id": application.jobSeekerId})
    if seeker:
        job_title = application.job.title if application.job else "the role"
        company = application.job.company.name if application.job and application.job.company else "the company"
        await notify_application_status(
            seeker.userId, application.jobId, job_title, company, payload.status
        )
        applicant = await db.user.find_unique(where={"id": seeker.userId})
        if applicant:
            subject, body = email_service.status_email(
                applicant.fullName, job_title, company, payload.status
            )
            background.add_task(email_service.send_email, applicant.email, subject, body)
    return updated


@router.delete("/{application_id}", response_model=Message, dependencies=[Depends(require_admin)])
async def delete_application(application_id: str):
    application = await db.application.find_unique(where={"id": application_id})
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    await db.interview.delete_many(where={"applicationId": application_id})
    await db.application.delete(where={"id": application_id})
    return Message(detail="Application removed")
