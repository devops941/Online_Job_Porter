from fastapi import Depends, APIRouter, HTTPException, Query

from app.auth import CurrentUser
from app.database.client import db
from app.schemas import JobAlertIn, JobAlertOut, Message, NotificationOut

router = APIRouter(prefix="/api", tags=["Notifications & Alerts"])


@router.get("/notifications", response_model=list[NotificationOut])
async def list_notifications(
    user: CurrentUser, unreadOnly: bool = False, limit: int = Query(50, ge=1, le=200)
):
    where: dict = {"userId": user.id}
    if unreadOnly:
        where["isRead"] = False
    return await db.notification.find_many(where=where, take=limit, order={"createdAt": "desc"})


@router.get("/notifications/unread-count")
async def unread_count(user: CurrentUser):
    count = await db.notification.count(where={"userId": user.id, "isRead": False})
    return {"count": count}


@router.patch("/notifications/{notification_id}/read", response_model=NotificationOut)
async def mark_read(notification_id: str, user: CurrentUser):
    notification = await db.notification.find_first(
        where={"id": notification_id, "userId": user.id}
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    return await db.notification.update(where={"id": notification_id}, data={"isRead": True})


@router.patch("/notifications/read-all", response_model=Message)
async def mark_all_read(user: CurrentUser):
    await db.notification.update_many(where={"userId": user.id}, data={"isRead": True})
    return Message(detail="All notifications marked as read")


@router.delete("/notifications/{notification_id}", response_model=Message)
async def delete_notification(notification_id: str, user: CurrentUser):
    notification = await db.notification.find_first(
        where={"id": notification_id, "userId": user.id}
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    await db.notification.delete(where={"id": notification_id})
    return Message(detail="Notification deleted")


# ---------- Job alerts ----------
async def _seeker_for(user_id: str):
    seeker = await db.jobseeker.find_unique(where={"userId": user_id})
    if not seeker:
        raise HTTPException(status_code=404, detail="Job seeker profile not found")
    return seeker


@router.get("/job-alerts", response_model=list[JobAlertOut])
async def list_alerts(user: CurrentUser):
    if user.role != "job_seeker":
        raise HTTPException(status_code=403, detail="Job alerts are available to job seekers only")
    seeker = await _seeker_for(user.id)
    return await db.jobalert.find_many(where={"jobSeekerId": seeker.id}, order={"createdAt": "desc"})


@router.post("/job-alerts", response_model=JobAlertOut, status_code=201)
async def create_alert(payload: JobAlertIn, user: CurrentUser):
    if user.role != "job_seeker":
        raise HTTPException(status_code=403, detail="Job alerts are available to job seekers only")
    seeker = await _seeker_for(user.id)
    return await db.jobalert.create(data={**payload.model_dump(), "jobSeekerId": seeker.id})


@router.patch("/job-alerts/{alert_id}", response_model=JobAlertOut)
async def update_alert(alert_id: str, payload: JobAlertIn, user: CurrentUser):
    seeker = await _seeker_for(user.id)
    alert = await db.jobalert.find_first(where={"id": alert_id, "jobSeekerId": seeker.id})
    if not alert:
        raise HTTPException(status_code=404, detail="Job alert not found")
    return await db.jobalert.update(
        where={"id": alert_id}, data=payload.model_dump(exclude_unset=True)
    )

@router.delete("/job-alerts/{alert_id}", response_model=Message)
async def delete_alert(alert_id: str, user: CurrentUser):
    seeker = await _seeker_for(user.id)
    alert = await db.jobalert.find_first(where={"id": alert_id, "jobSeekerId": seeker.id})
    if not alert:
        raise HTTPException(status_code=404, detail="Job alert not found")
    await db.jobalert.delete(where={"id": alert_id})
    return Message(detail="Job alert deleted")
