from datetime import datetime, timezone

from fastapi import Depends, APIRouter, HTTPException, Query
from fastapi.responses import Response

from app.auth import CurrentUser
from app.database.client import db
from app.services import report_service

router = APIRouter(prefix="/api/reports", tags=["Reports"])

EXPORTABLE = {"jobs", "applications", "users", "hiring", "interviews"}


async def _rows(scope: str, user) -> tuple[str, list[str], list[list], dict]:
    if scope == "jobs":
        where = {}
        if user.role == "employer":
            employer = await db.employer.find_unique(where={"userId": user.id})
            where["companyId"] = employer.companyId if employer else "__none__"
        jobs = await db.job.find_many(where=where, include={"company": True, "category": True}, take=5000)
        columns = ["Title", "Company", "Category", "Location", "Type", "Status", "Views", "Posted"]
        rows = [
            [
                j.title,
                j.company.name if j.company else "",
                j.category.name if j.category else "",
                j.location,
                j.employmentType,
                j.status,
                j.views,
                j.createdAt.strftime("%Y-%m-%d"),
            ]
            for j in jobs
        ]
        return "Jobs Report", columns, rows, {"Jobs": len(jobs)}

    if scope == "applications":
        where = {}
        if user.role == "employer":
            employer = await db.employer.find_unique(where={"userId": user.id})
            if not employer or not employer.companyId:
                return "Applications Report", ["Job", "Applicant", "Status", "Match %", "Applied"], [], {"Applications": 0}
            jobs = await db.job.find_many(where={"companyId": employer.companyId}, take=1000)
            where["jobId"] = {"in": [j.id for j in jobs]}
        apps = await db.application.find_many(
            where=where, include={"job": True, "jobSeeker": True}, take=5000, order={"createdAt": "desc"}
        )
        seeker_ids = [a.jobSeeker.userId for a in apps if a.jobSeeker]
        users = await db.user.find_many(where={"id": {"in": seeker_ids}}) if seeker_ids else []
        names = {u.id: f"{u.fullName} ({u.email})" for u in users}
        columns = ["Job", "Applicant", "Status", "Match %", "Applied"]
        rows = [
            [
                a.job.title if a.job else "",
                names.get(a.jobSeeker.userId, "") if a.jobSeeker else "",
                a.status,
                a.matchScore,
                a.createdAt.strftime("%Y-%m-%d"),
            ]
            for a in apps
        ]
        return "Applications Report", columns, rows, {"Applications": len(apps)}

    if scope == "users":
        if user.role != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        users = await db.user.find_many(take=5000, order={"createdAt": "desc"})
        columns = ["Name", "Email", "Role", "Verified", "Active", "Joined"]
        rows = [
            [u.fullName, u.email, u.role, "Yes" if u.isVerified else "No", "Yes" if u.isActive else "No",
             u.createdAt.strftime("%Y-%m-%d")]
            for u in users
        ]
        return "Users Report", columns, rows, {"Users": len(users)}

    if scope == "interviews":
        where = {}
        if user.role == "employer":
            employer = await db.employer.find_unique(where={"userId": user.id})
            if not employer or not employer.companyId:
                return "Interviews Report", ["Job", "When", "Mode", "Status"], [], {"Interviews": 0}
            jobs = await db.job.find_many(where={"companyId": employer.companyId}, take=1000)
            where["jobId"] = {"in": [j.id for j in jobs]}
        interviews = await db.interview.find_many(where=where, include={"job": True}, take=5000)
        columns = ["Job", "When", "Mode", "Status", "Notes"]
        rows = [
            [
                i.job.title if i.job else "",
                i.scheduledAt.strftime("%Y-%m-%d %H:%M") if i.scheduledAt else "",
                i.mode,
                i.status,
                (i.notes or "")[:80],
            ]
            for i in interviews
        ]
        return "Interviews Report", columns, rows, {"Interviews": len(interviews)}

    # hiring funnel
    where = {}
    if user.role == "employer":
        employer = await db.employer.find_unique(where={"userId": user.id})
        if not employer or not employer.companyId:
            return "Hiring Report", ["Stage", "Count"], [], {"Applications": 0}
        jobs = await db.job.find_many(where={"companyId": employer.companyId}, take=1000)
        where["jobId"] = {"in": [j.id for j in jobs]}
    apps = await db.application.find_many(where=where, take=5000)
    stages = ["applied", "under_review", "shortlisted", "interview", "hired", "rejected", "withdrawn"]
    counts = {s: sum(1 for a in apps if a.status == s) for s in stages}
    rows = [[s.replace("_", " ").title(), counts[s]] for s in stages]
    return "Hiring Funnel Report", ["Stage", "Count"], rows, {"Applications": len(apps)}


@router.get("/{scope}")
async def report_json(
    scope: str,
    user: CurrentUser,
    fmt: str = Query("json", pattern="^(json|xlsx|pdf)$"),
):
    if scope not in EXPORTABLE:
        raise HTTPException(status_code=404, detail="Unknown report scope")
    title, columns, rows, summary = await _rows(scope, user)
    summary = {**summary, "Generated": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")}

    if fmt == "json":
        return {"title": title, "columns": columns, "rows": rows, "summary": summary}

    if fmt == "xlsx":
        content = report_service.to_excel(title, columns, rows)
        media = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        extension = "xlsx"
    else:
        content = report_service.to_pdf(title, columns, rows, summary)
        media = "application/pdf"
        extension = "pdf"

    filename = f"{scope}-report-{datetime.now():%Y%m%d-%H%M%S}.{extension}"
    return Response(
        content=content,
        media_type=media,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("")
async def report_index(user: CurrentUser):
    scopes = ["jobs", "applications", "interviews", "hiring"]
    if user.role == "admin":
        scopes.append("users")
    return {"availableReports": scopes}
