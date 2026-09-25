from app.database.client import db


async def notify(
    user_id: str,
    title: str,
    message: str,
    type_: str = "info",
    link: str | None = None,
) -> None:
    await db.notification.create(
        data={
            "userId": user_id,
            "title": title,
            "message": message,
            "type": type_,
            "link": link,
        }
    )


async def notify_application_status(
    user_id: str, job_id: str, job_title: str, company: str, status: str
) -> None:
    await notify(
        user_id,
        f"Application {status.replace('_', ' ')}",
        f"Your application for {job_title} at {company} is now "
        f"'{status.replace('_', ' ')}'.",
        type_="status_update",
        link="/job-seeker/applications",
    )


async def notify_interview(user_id: str, job_title: str, scheduled_at: str, mode: str) -> None:
    await notify(
        user_id,
        "Interview scheduled",
        f"Interview for {job_title} on {scheduled_at} ({mode}).",
        type_="interview",
        link="/job-seeker/applications",
    )


async def notify_new_job(job: dict) -> int:
    """Fan a newly approved job out to seekers whose saved alerts match it."""
    alerts = await db.jobalert.find_many(where={"isActive": True})
    if not alerts:
        return 0

    seeker_ids = list({a.jobSeekerId for a in alerts})
    seekers = await db.jobseeker.find_many(where={"id": {"in": seeker_ids}})
    seeker_user = {s.id: s.userId for s in seekers}

    text = (
        f"{job['title']} {job.get('description') or ''} {' '.join(job.get('skills') or [])}"
    ).lower()
    delivered = 0
    for alert in alerts:
        keywords = (alert.keywords or "").lower().split()
        if keywords and not all(k in text for k in keywords):
            continue
        if alert.location and alert.location.lower() not in (job.get("location") or "").lower():
            continue
        if alert.categoryId and alert.categoryId != job.get("categoryId"):
            continue
        user_id = seeker_user.get(alert.jobSeekerId)
        if not user_id:
            continue
        await notify(
            user_id,
            "New matching job",
            f"{job['title']} at {job.get('companyName', 'a company')} matches your alert.",
            type_="job_alert",
            link=f"/jobs/{job['id']}",
        )
        delivered += 1
    return delivered
