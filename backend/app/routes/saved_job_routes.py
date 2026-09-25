from fastapi import Depends, APIRouter, HTTPException, Query

from app.auth import CurrentUser, require_job_seeker
from app.database.client import db
from app.schemas import Message, Page, RecommendedJob, SavedJobOut
from app.services.matching_service import score_job

router = APIRouter(prefix="/api/saved-jobs", tags=["Saved Jobs"])

INCLUDE = {"job": {"include": {"company": True, "category": True}}}


async def _seeker_for(user_id: str):
    seeker = await db.jobseeker.find_unique(where={"userId": user_id})
    if not seeker:
        raise HTTPException(status_code=404, detail="Job seeker profile not found")
    return seeker


@router.get("", response_model=Page[SavedJobOut], dependencies=[Depends(require_job_seeker)])
async def list_saved_jobs(
    user: CurrentUser,
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
):
    seeker = await _seeker_for(user.id)
    where = {"jobSeekerId": seeker.id}
    total = await db.savedjob.count(where=where)
    items = await db.savedjob.find_many(
        where=where, include=INCLUDE, skip=(page - 1) * pageSize, take=pageSize, order={"createdAt": "desc"}
    )
    return Page[SavedJobOut](
        items=items, total=total, page=page, page_size=pageSize, pages=max(1, -(-total // pageSize))
    )


@router.post("/{job_id}", response_model=SavedJobOut, status_code=201, dependencies=[Depends(require_job_seeker)])
async def save_job(job_id: str, user: CurrentUser):
    seeker = await _seeker_for(user.id)
    job = await db.job.find_unique(where={"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    existing = await db.savedjob.find_first(where={"jobId": job_id, "jobSeekerId": seeker.id})
    if existing:
        return await db.savedjob.find_unique(where={"id": existing.id}, include=INCLUDE)

    created = await db.savedjob.create(data={"jobId": job_id, "jobSeekerId": seeker.id})
    return await db.savedjob.find_unique(where={"id": created.id}, include=INCLUDE)


@router.delete("/{job_id}", response_model=Message, dependencies=[Depends(require_job_seeker)])
async def unsave_job(job_id: str, user: CurrentUser):
    seeker = await _seeker_for(user.id)
    existing = await db.savedjob.find_first(where={"jobId": job_id, "jobSeekerId": seeker.id})
    if not existing:
        raise HTTPException(status_code=404, detail="Job was not saved")
    await db.savedjob.delete(where={"id": existing.id})
    return Message(detail="Removed from saved jobs")


@router.get("/recommendations", response_model=list[RecommendedJob], dependencies=[Depends(require_job_seeker)])
async def saved_recommendations(user: CurrentUser, limit: int = Query(10, ge=1, le=50)):
    seeker = await _seeker_for(user.id)
    jobs = await db.job.find_many(
        where={"status": "approved"},
        include={"company": True, "category": True},
        take=200,
        order={"createdAt": "desc"},
    )
    results = []
    for job in jobs:
        final, _ratio, matched, missing = score_job(seeker, job)
        if final <= 0:
            continue
        results.append(
            RecommendedJob(
                job=job, matchScore=final, matchedSkills=matched, missingSkills=missing
            )
        )
    results.sort(key=lambda r: r.matchScore, reverse=True)
    return results[:limit]
