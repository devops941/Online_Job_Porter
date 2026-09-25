from datetime import datetime, timezone

from fastapi import Depends, APIRouter, BackgroundTasks, HTTPException, Query

from app.auth import CurrentUser, require_admin, require_employer, require_employer_or_admin
from app.database.client import db
from app.schemas import (
    JobIn,
    JobOut,
    JobStatusUpdate,
    JobUpdate,
    Message,
    Page,
    RecommendedJob,
)
from app.services import email_service
from app.services.matching_service import score_job
from app.services.notification_service import notify, notify_new_job
from app.utils.text import safe_term

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])

JOB_INCLUDE = {"company": True, "category": True}


async def _employer_for(user_id: str):
    employer = await db.employer.find_unique(where={"userId": user_id})
    if not employer:
        raise HTTPException(status_code=404, detail="Employer profile not found")
    return employer


def _build_job_where(filters: dict) -> dict:
    where: dict = {}
    if filters.get("status"):
        where["status"] = filters["status"]
    if filters.get("location"):
        where["location"] = {"contains": safe_term(filters["location"]), "mode": "insensitive"}
    if filters.get("categoryId"):
        where["categoryId"] = filters["categoryId"]
    if filters.get("companyId"):
        where["companyId"] = filters["companyId"]
    if filters.get("employmentType"):
        where["employmentType"] = filters["employmentType"]
    if filters.get("workMode"):
        where["workMode"] = filters["workMode"]
    if filters.get("experienceMax") is not None:
        where["experienceMin"] = {"lte": filters["experienceMax"]}
    if filters.get("salaryMin") is not None:
        where["salaryMax"] = {"gte": filters["salaryMin"]}
    if filters.get("skills"):
        where["skills"] = {"hasEvery": filters["skills"]}
    if filters.get("q"):
        term = safe_term(filters["q"])
        where["OR"] = [
            {"title": {"contains": term, "mode": "insensitive"}},
            {"description": {"contains": term, "mode": "insensitive"}},
            {"requirements": {"contains": term, "mode": "insensitive"}},
            {"location": {"contains": term, "mode": "insensitive"}},
            {"skills": {"has": filters["q"]}},
        ]
    return where


def _order_for(sort: str) -> dict:
    return {
        "oldest": {"createdAt": "asc"},
        "salary": {"salaryMax": "desc"},
        "newest": {"createdAt": "desc"},
    }.get(sort, {"createdAt": "desc"})


# ---------- Public search ----------
@router.get("", response_model=Page[JobOut])
async def search_jobs(
    q: str | None = None,
    location: str | None = None,
    categoryId: str | None = None,
    skills: list[str] | None = Query(None),
    salaryMin: float | None = None,
    experienceMax: float | None = None,
    employmentType: str | None = None,
    workMode: str | None = None,
    companyId: str | None = None,
    sort: str = "newest",
    page: int = Query(1, ge=1),
    pageSize: int = Query(12, ge=1, le=100),
):
    where = _build_job_where(
        {
            "q": q,
            "location": location,
            "categoryId": categoryId,
            "skills": skills,
            "salaryMin": salaryMin,
            "experienceMax": experienceMax,
            "employmentType": employmentType,
            "workMode": workMode,
            "companyId": companyId,
            "status": "approved",
        }
    )
    total = await db.job.count(where=where)
    items = await db.job.find_many(
        where=where,
        include=JOB_INCLUDE,
        skip=(page - 1) * pageSize,
        take=pageSize,
        order=_order_for(sort),
    )
    return Page[JobOut](
        items=items, total=total, page=page, page_size=pageSize, pages=max(1, -(-total // pageSize))
    )


@router.get("/recommended", response_model=list[RecommendedJob])
async def recommended_jobs(user: CurrentUser, limit: int = Query(10, ge=1, le=50)):
    if user.role != "job_seeker":
        raise HTTPException(status_code=403, detail="Only job seekers receive recommendations")
    seeker = await db.jobseeker.find_unique(where={"userId": user.id})
    if not seeker:
        raise HTTPException(status_code=404, detail="Job seeker profile not found")

    jobs = await db.job.find_many(
        where={"status": "approved"}, include=JOB_INCLUDE, take=200, order={"createdAt": "desc"}
    )
    scored = []
    for job in jobs:
        final, _ratio, matched, missing = score_job(seeker, job)
        if final <= 0:
            continue
        scored.append(
            RecommendedJob(
                job=JobOut.model_validate(job), matchScore=final, matchedSkills=matched, missingSkills=missing
            )
        )
    scored.sort(key=lambda r: r.matchScore, reverse=True)
    return scored[:limit]


@router.get("/mine", response_model=Page[JobOut], dependencies=[Depends(require_employer_or_admin)])
async def my_jobs(
    user: CurrentUser,
    status: str | None = None,
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
):
    where = _build_job_where({"status": status})
    if user.role == "employer":
        employer = await _employer_for(user.id)
        if not employer.companyId:
            return Page[JobOut](items=[], total=0, page=page, page_size=pageSize, pages=1)
        where["companyId"] = employer.companyId

    total = await db.job.count(where=where)
    items = await db.job.find_many(
        where=where,
        include=JOB_INCLUDE,
        skip=(page - 1) * pageSize,
        take=pageSize,
        order={"createdAt": "desc"},
    )
    return Page[JobOut](
        items=items, total=total, page=page, page_size=pageSize, pages=max(1, -(-total // pageSize))
    )


# ---------- Admin moderation ----------
@router.get("/admin/pending", response_model=list[JobOut], dependencies=[Depends(require_admin)])
async def pending_jobs():
    return await db.job.find_many(where={"status": "pending"}, include=JOB_INCLUDE, order={"createdAt": "asc"})


@router.patch("/{job_id}/status", response_model=JobOut, dependencies=[Depends(require_admin)])
async def moderate_job(job_id: str, payload: JobStatusUpdate, background: BackgroundTasks):
    job = await db.job.find_unique(where={"id": job_id}, include=JOB_INCLUDE)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    updated = await db.job.update(
        where={"id": job_id},
        data={"status": payload.status, "rejectionReason": payload.rejectionReason},
        include=JOB_INCLUDE,
    )

    poster = await db.user.find_unique(where={"id": job.postedById})
    if poster:
        readable = payload.status.title()
        await notify(
            poster.id,
            f"Job post {readable}",
            f"Your job '{job.title}' was marked {readable}."
            + (f" Reason: {payload.rejectionReason}" if payload.rejectionReason else ""),
            type_="status_update",
        )
        subject, body = email_service.status_email(
            poster.fullName, job.title, job.company.name if job.company else "your company", payload.status
        )
        background.add_task(email_service.send_email, poster.email, subject, body)

    if payload.status == "approved":
        await notify_new_job(
            {
                "id": updated.id,
                "title": updated.title,
                "description": updated.description,
                "skills": updated.skills,
                "location": updated.location,
                "categoryId": updated.categoryId,
                "companyName": updated.company.name if updated.company else "",
            }
        )
    return updated


# ---------- Single job ----------
@router.get("/{job_id}", response_model=JobOut)
async def get_job(job_id: str):
    job = await db.job.find_unique(where={"id": job_id}, include=JOB_INCLUDE)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    await db.job.update(where={"id": job_id}, data={"views": job.views + 1})
    job.views += 1
    return job


# ---------- Employer CRUD ----------
@router.post("", response_model=JobOut, status_code=201, dependencies=[Depends(require_employer)])
async def create_job(payload: JobIn, user: CurrentUser):
    employer = await _employer_for(user.id)
    if not employer.isApproved:
        raise HTTPException(
            status_code=403,
            detail="Your recruiter account is awaiting admin approval",
        )
    if not employer.companyId:
        raise HTTPException(status_code=400, detail="Create your company profile before posting jobs")

    data = payload.model_dump()
    deadline = data.get("deadline")
    if deadline and deadline.tzinfo is None:
        data["deadline"] = deadline.replace(tzinfo=timezone.utc)

    return await db.job.create(
        data={**data, "companyId": employer.companyId, "postedById": user.id, "status": "pending"},
        include=JOB_INCLUDE,
    )


@router.put("/{job_id}", response_model=JobOut, dependencies=[Depends(require_employer)])
async def update_job(job_id: str, payload: JobUpdate, user: CurrentUser):
    job = await db.job.find_unique(where={"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.postedById != user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own job posts")

    data = payload.model_dump(exclude_unset=True)
    if user.role == "employer" and data.get("status") and data["status"] != "closed":
        raise HTTPException(status_code=403, detail="Employers may only close a posting")
    if data.get("status") in {"pending", "approved"} and user.role == "employer":
        # Editing re-enters moderation so admins see the new content.
        data["status"] = "pending"
    deadline = data.get("deadline")
    if deadline and deadline.tzinfo is None:
        data["deadline"] = deadline.replace(tzinfo=timezone.utc)

    return await db.job.update(where={"id": job_id}, data=data, include=JOB_INCLUDE)


@router.delete("/{job_id}", response_model=Message, dependencies=[Depends(require_employer)])
async def close_job(job_id: str, user: CurrentUser):
    job = await db.job.find_unique(where={"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.postedById != user.id:
        raise HTTPException(status_code=403, detail="You can only close your own job posts")
    await db.job.update(where={"id": job_id}, data={"status": "closed"})
    return Message(detail="Job closed")
