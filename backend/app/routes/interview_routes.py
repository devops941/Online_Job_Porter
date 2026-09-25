from datetime import datetime, timezone

from fastapi import Depends, APIRouter, BackgroundTasks, HTTPException, Query

from app.auth import CurrentUser, require_admin, require_employer_or_admin
from app.database.client import db
from app.schemas import InterviewIn, InterviewOut, InterviewUpdate, Message
from app.services import email_service
from app.services.notification_service import notify, notify_interview

router = APIRouter(prefix="/api/interviews", tags=["Interviews"])

INCLUDE = {"job": {"include": {"company": True, "category": True}}}


async def _seeker_for(user_id: str):
    seeker = await db.jobseeker.find_unique(where={"userId": user_id})
    if not seeker:
        raise HTTPException(status_code=404, detail="Job seeker profile not found")
    return seeker


def _as_utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


@router.post("", response_model=InterviewOut, status_code=201, dependencies=[Depends(require_employer_or_admin)])
async def schedule_interview(payload: InterviewIn, background: BackgroundTasks):
    application = await db.application.find_unique(
        where={"id": payload.applicationId}, include={"job": {"include": {"company": True}}}
    )
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    created = await db.interview.create(
        data={
            "applicationId": application.id,
            "jobId": application.jobId,
            "scheduledAt": _as_utc(payload.scheduledAt),
            "mode": payload.mode,
            "location": payload.location,
            "meetingLink": payload.meetingLink,
            "notes": payload.notes,
            "status": "scheduled",
        }
    )

    await db.application.update(
        where={"id": application.id}, data={"status": "interview"}
    )

    seeker = await db.jobseeker.find_unique(where={"id": application.jobSeekerId})
    if seeker:
        applicant = await db.user.find_unique(where={"id": seeker.userId})
        job_title = application.job.title if application.job else "the role"
        when = _as_utc(payload.scheduledAt).strftime("%Y-%m-%d %H:%M UTC")
        await notify_interview(seeker.userId, job_title, when, payload.mode)
        if applicant:
            subject, body = email_service.interview_email(
                applicant.fullName, job_title, when, payload.mode
            )
            background.add_task(email_service.send_email, applicant.email, subject, body)

    return await db.interview.find_unique(where={"id": created.id}, include=INCLUDE)


@router.get("", response_model=list[InterviewOut], dependencies=[Depends(require_employer_or_admin)])
async def list_interviews(user: CurrentUser, status: str | None = None):
    where: dict = {}
    if status:
        where["status"] = status
    if user.role == "employer":
        employer = await db.employer.find_unique(where={"userId": user.id})
        if not employer or not employer.companyId:
            return []
        jobs = await db.job.find_many(where={"companyId": employer.companyId}, take=500)
        where["jobId"] = {"in": [j.id for j in jobs]}
    return await db.interview.find_many(
        where=where, include=INCLUDE, order={"scheduledAt": "asc"}
    )


@router.get("/me", response_model=list[InterviewOut])
async def my_interviews(user: CurrentUser):
    if user.role != "job_seeker":
        raise HTTPException(status_code=403, detail="Only job seekers have this view")
    seeker = await _seeker_for(user.id)
    applications = await db.application.find_many(where={"jobSeekerId": seeker.id}, take=500)
    ids = [a.id for a in applications]
    if not ids:
        return []
    return await db.interview.find_many(
        where={"applicationId": {"in": ids}}, include=INCLUDE, order={"scheduledAt": "asc"}
    )


@router.patch("/{interview_id}", response_model=InterviewOut, dependencies=[Depends(require_employer_or_admin)])
async def update_interview(interview_id: str, payload: InterviewUpdate):
    interview = await db.interview.find_unique(where={"id": interview_id})
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    data = payload.model_dump(exclude_unset=True)
    if data.get("scheduledAt"):
        data["scheduledAt"] = _as_utc(data["scheduledAt"])
    if data.get("mode"):
        data["mode"] = data["mode"]
    return await db.interview.update(where={"id": interview_id}, data=data, include=INCLUDE)


@router.delete("/{interview_id}", response_model=Message, dependencies=[Depends(require_admin)])
async def cancel_interview(interview_id: str):
    interview = await db.interview.find_unique(where={"id": interview_id})
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    await db.interview.update(where={"id": interview_id}, data={"status": "cancelled"})

    application = await db.application.find_unique(where={"id": interview.applicationId})
    if application:
        seeker = await db.jobseeker.find_unique(where={"id": application.jobSeekerId})
        job = await db.job.find_unique(where={"id": interview.jobId})
        if seeker:
            await notify(
                seeker.userId,
                "Interview cancelled",
                f"The interview for {job.title if job else 'a role'} was cancelled.",
                type_="interview",
            )
    return Message(detail="Interview cancelled")
