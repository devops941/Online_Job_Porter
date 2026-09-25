import re

from fastapi import Depends, APIRouter, HTTPException

from app.auth import CurrentUser, require_admin, require_employer, require_job_seeker
from app.database.client import db
from app.utils.text import safe_term
from app.schemas import (
    CompanyIn,
    CompanyOut,
    EmployerProfileIn,
    EmployerProfileOut,
    JobSeekerProfileIn,
    JobSeekerProfileOut,
)
from app.services.notification_service import notify

router = APIRouter(prefix="/api/profiles", tags=["Profiles"])


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-") or "company"


async def _get_seeker(user_id: str):
    seeker = await db.jobseeker.find_unique(where={"userId": user_id})
    if not seeker:
        raise HTTPException(status_code=404, detail="Job seeker profile not found")
    return seeker


async def _get_employer(user_id: str):
    employer = await db.employer.find_unique(where={"userId": user_id})
    if not employer:
        raise HTTPException(status_code=404, detail="Employer profile not found")
    return employer


# ---------- Job seeker ----------
@router.get("/job-seeker/me", response_model=JobSeekerProfileOut, dependencies=[Depends(require_job_seeker)])
async def get_my_seeker_profile(user: CurrentUser):
    seeker = await _get_seeker(user.id)
    return await db.jobseeker.find_unique(where={"id": seeker.id}, include={"user": True})


@router.put("/job-seeker/me", response_model=JobSeekerProfileOut, dependencies=[Depends(require_job_seeker)])
async def update_my_seeker_profile(payload: JobSeekerProfileIn, user: CurrentUser):
    seeker = await _get_seeker(user.id)
    data = payload.model_dump(exclude_unset=True)
    await db.jobseeker.update(where={"id": seeker.id}, data=data)
    return await db.jobseeker.find_unique(where={"id": seeker.id}, include={"user": True})


@router.get(
    "/job-seeker/{seeker_id}",
    response_model=JobSeekerProfileOut,
    dependencies=[Depends(require_admin)],
)
async def get_seeker_profile(seeker_id: str):
    seeker = await db.jobseeker.find_unique(where={"id": seeker_id}, include={"user": True})
    if not seeker:
        raise HTTPException(status_code=404, detail="Job seeker not found")
    return seeker


# ---------- Employer & company ----------
@router.get("/employer/me", response_model=EmployerProfileOut, dependencies=[Depends(require_employer)])
async def get_my_employer_profile(user: CurrentUser):
    employer = await _get_employer(user.id)
    return await db.employer.find_unique(
        where={"id": employer.id}, include={"user": True, "company": True}
    )


@router.put("/employer/me", response_model=EmployerProfileOut, dependencies=[Depends(require_employer)])
async def update_my_employer_profile(payload: EmployerProfileIn, user: CurrentUser):
    employer = await _get_employer(user.id)

    if payload.designation is not None:
        await db.employer.update(where={"id": employer.id}, data={"designation": payload.designation})

    if payload.company is not None:
        company_data = payload.company.model_dump(exclude_none=True)
        if employer.companyId:
            await db.company.update(where={"id": employer.companyId}, data=company_data)
        else:
            company_data["slug"] = slugify(payload.company.name)
            created = await db.company.create(data=company_data)
            await db.employer.update(
                where={"id": employer.id}, data={"companyId": created.id}
            )

    return await db.employer.find_unique(
        where={"id": employer.id}, include={"user": True, "company": True}
    )


@router.get("/companies", response_model=list[CompanyOut])
async def list_companies(q: str | None = None, limit: int = 50):
    where = {}
    if q:
        where["name"] = {"contains": safe_term(q), "mode": "insensitive"}
    return await db.company.find_many(where=where, take=min(limit, 100), order={"name": "asc"})


@router.get("/companies/{company_id}")
async def get_company(company_id: str):
    company = await db.company.find_unique(where={"id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    jobs = await db.job.count(where={"companyId": company_id, "status": "approved"})
    return {**company.model_dump(), "openJobs": jobs}


# ---------- Admin: employer approvals ----------
@router.get(
    "/employers/pending",
    response_model=list[EmployerProfileOut],
    dependencies=[Depends(require_admin)],
)
async def pending_employers():
    return await db.employer.find_many(
        where={"isApproved": False}, include={"user": True, "company": True}
    )


@router.get(
    "/employers",
    response_model=list[EmployerProfileOut],
    dependencies=[Depends(require_admin)],
)
async def list_employers(approved: bool | None = None):
    where = {} if approved is None else {"isApproved": approved}
    return await db.employer.find_many(
        where=where, include={"user": True, "company": True}, order={"createdAt": "desc"}
    )


@router.patch(
    "/employers/{employer_id}/approve",
    response_model=EmployerProfileOut,
    dependencies=[Depends(require_admin)],
)
async def approve_employer(employer_id: str, approved: bool = True):
    employer = await db.employer.find_unique(where={"id": employer_id})
    if not employer:
        raise HTTPException(status_code=404, detail="Employer not found")

    await db.employer.update(where={"id": employer_id}, data={"isApproved": approved})
    if approved and employer.companyId:
        await db.company.update(where={"id": employer.companyId}, data={"isVerified": True})

    await notify(
        employer.userId,
        "Employer account approved" if approved else "Employer account rejected",
        "An administrator reviewed your recruiter account.",
    )
    return await db.employer.find_unique(
        where={"id": employer_id}, include={"user": True, "company": True}
    )
