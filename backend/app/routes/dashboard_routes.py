from datetime import datetime, timedelta, timezone

from fastapi import Depends, APIRouter

from app.auth import CurrentUser, require_employer
from app.database.client import db

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

STATUS_ORDER = [
    "applied",
    "under_review",
    "shortlisted",
    "interview",
    "hired",
    "rejected",
    "withdrawn",
]


def _bucket(rows: list, key: str) -> dict[str, int]:
    counts: dict[str, int] = {}
    for row in rows:
        value = row.get(key) or "unknown"
        counts[value] = counts.get(value, 0) + 1
    return counts


@router.get("/admin")
async def admin_dashboard(user: CurrentUser):
    if user.role != "admin":
        from fastapi import HTTPException

        raise HTTPException(status_code=403, detail="Admin access required")

    total_users = await db.user.count()
    seekers = await db.user.count(where={"role": "job_seeker"})
    employers = await db.user.count(where={"role": "employer"})
    total_jobs = await db.job.count()
    pending_jobs = await db.job.count(where={"status": "pending"})
    approved_jobs = await db.job.count(where={"status": "approved"})
    total_applications = await db.application.count()
    hires = await db.application.count(where={"status": "hired"})
    pending_employers = await db.employer.count(where={"isApproved": False})
    companies = await db.company.count()
    categories = await db.category.count()
    interviews = await db.interview.count()

    since = datetime.now(timezone.utc) - timedelta(days=30)
    recent_users = await db.user.find_many(where={"createdAt": {"gte": since}}, take=1000)
    jobs = await db.job.find_many(include={"category": True}, take=1000)
    applications = await db.application.find_many(include={"job": True}, take=2000)

    by_category: dict[str, int] = {}
    for job in jobs:
        name = job.category.name if job.category else "Uncategorised"
        by_category[name] = by_category.get(name, 0) + 1

    by_location: dict[str, int] = {}
    for job in jobs:
        by_location[job.location] = by_location.get(job.location, 0) + 1

    top_jobs: dict[str, dict] = {}
    for application in applications:
        if not application.job:
            continue
        entry = top_jobs.setdefault(
            application.jobId, {"title": application.job.title, "applications": 0}
        )
        entry["applications"] += 1
    leaderboard = sorted(top_jobs.values(), key=lambda e: e["applications"], reverse=True)[:5]

    return {
        "totals": {
            "users": total_users,
            "jobSeekers": seekers,
            "employers": employers,
            "companies": companies,
            "categories": categories,
            "jobs": total_jobs,
            "pendingJobs": pending_jobs,
            "approvedJobs": approved_jobs,
            "applications": total_applications,
            "hires": hires,
            "interviews": interviews,
            "pendingEmployers": pending_employers,
        },
        "applicationStatus": _bucket(
            [{"status": a.status} for a in applications], "status"
        ),
        "jobsByCategory": by_category,
        "jobsByLocation": dict(
            sorted(by_location.items(), key=lambda kv: kv[1], reverse=True)[:8]
        ),
        "topJobs": leaderboard,
        "newUsersLast30Days": len(recent_users),
    }


@router.get("/employer", dependencies=[Depends(require_employer)])
async def employer_dashboard(user: CurrentUser):
    employer = await db.employer.find_unique(
        where={"userId": user.id}, include={"company": True}
    )
    if not employer or not employer.companyId:
        return {
            "company": None,
            "totals": {
                "jobs": 0,
                "activeJobs": 0,
                "pendingJobs": 0,
                "applications": 0,
                "shortlisted": 0,
                "hires": 0,
                "interviews": 0,
            },
            "applicationStatus": {},
            "topJobs": [],
        }

    jobs = await db.job.find_many(where={"companyId": employer.companyId}, include={"category": True})
    job_ids = [j.id for j in jobs]
    applications = (
        await db.application.find_many(where={"jobId": {"in": job_ids}}, take=3000)
        if job_ids
        else []
    )
    interviews = (
        await db.interview.find_many(where={"jobId": {"in": job_ids}}, take=3000) if job_ids else []
    )

    per_job: dict[str, dict] = {}
    for job in jobs:
        per_job[job.id] = {"title": job.title, "applications": 0, "views": job.views, "status": job.status}
    for application in applications:
        if application.jobId in per_job:
            per_job[application.jobId]["applications"] += 1

    return {
        "company": employer.company.model_dump() if employer.company else None,
        "isApproved": employer.isApproved,
        "totals": {
            "jobs": len(jobs),
            "activeJobs": sum(1 for j in jobs if j.status == "approved"),
            "pendingJobs": sum(1 for j in jobs if j.status == "pending"),
            "applications": len(applications),
            "shortlisted": sum(1 for a in applications if a.status == "shortlisted"),
            "hires": sum(1 for a in applications if a.status == "hired"),
            "interviews": len(interviews),
        },
        "applicationStatus": _bucket(
            [{"status": a.status} for a in applications], "status"
        ),
        "topJobs": sorted(per_job.values(), key=lambda e: e["applications"], reverse=True)[:5],
    }


@router.get("/job-seeker")
async def job_seeker_dashboard(user: CurrentUser):
    if user.role != "job_seeker":
        from fastapi import HTTPException

        raise HTTPException(status_code=403, detail="Job seeker access required")

    seeker = await db.jobseeker.find_unique(where={"userId": user.id})
    if not seeker:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Job seeker profile not found")

    applications = await db.application.find_many(
        where={"jobSeekerId": seeker.id}, include={"job": {"include": {"company": True}}}
    )
    saved = await db.savedjob.count(where={"jobSeekerId": seeker.id})
    resumes = await db.resume.count(where={"jobSeekerId": seeker.id})
    interviews = await db.interview.find_many(
        where={"applicationId": {"in": [a.id for a in applications]}}, include={"job": True}
    )
    upcoming = [i for i in interviews if i.scheduledAt and i.scheduledAt >= datetime.now(timezone.utc)]

    completeness_fields = [
        seeker.headline,
        seeker.summary,
        seeker.location,
        seeker.education,
        seeker.skills,
        seeker.resumeUrl,
    ]
    filled = sum(1 for f in completeness_fields if f)
    completeness = round(filled / len(completeness_fields) * 100)

    return {
        "profile": {
            "id": seeker.id,
            "headline": seeker.headline,
            "location": seeker.location,
            "skills": seeker.skills,
            "experienceYears": seeker.experienceYears,
            "completeness": completeness,
        },
        "totals": {
            "applications": len(applications),
            "savedJobs": saved,
            "resumes": resumes,
            "interviews": len(interviews),
            "upcomingInterviews": len(upcoming),
        },
        "applicationStatus": _bucket(
            [{"status": a.status} for a in applications], "status"
        ),
        "recentApplications": [
            {
                "id": a.id,
                "status": a.status,
                "matchScore": a.matchScore,
                "appliedAt": a.createdAt,
                "jobId": a.jobId,
                "jobTitle": a.job.title if a.job else None,
                "company": a.job.company.name if a.job and a.job.company else None,
            }
            for a in sorted(applications, key=lambda a: a.createdAt, reverse=True)[:5]
        ],
        "upcomingInterviews": [
            {
                "id": i.id,
                "scheduledAt": i.scheduledAt,
                "mode": i.mode,
                "jobTitle": i.job.title if i.job else None,
                "status": i.status,
            }
            for i in sorted(upcoming, key=lambda i: i.scheduledAt)[:5]
        ],
    }
