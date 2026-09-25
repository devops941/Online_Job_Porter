from fastapi import Depends, APIRouter, HTTPException, Query

from app.auth import CurrentUser, require_admin
from app.database.client import db
from app.utils.text import safe_term
from app.schemas import Page, UserOut, UserUpdate
from app.services.notification_service import notify

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("/me", response_model=UserOut)
async def get_my_account(user: CurrentUser):
    return user


@router.patch("/me", response_model=UserOut)
async def update_my_account(payload: UserUpdate, user: CurrentUser):
    data = payload.model_dump(exclude_unset=True, exclude_none=True)
    if not data:
        return user
    return await db.user.update(where={"id": user.id}, data=data)


# ---------- Admin ----------
@router.get("", response_model=Page[UserOut], dependencies=[Depends(require_admin)])
async def list_users(
    role: str | None = None,
    q: str | None = None,
    isActive: bool | None = None,
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
):
    where: dict = {}
    if role:
        where["role"] = role
    if isActive is not None:
        where["isActive"] = isActive
    if q:
        where["OR"] = [
            {"email": {"contains": safe_term(q), "mode": "insensitive"}},
            {"fullName": {"contains": safe_term(q), "mode": "insensitive"}},
        ]

    total = await db.user.count(where=where)
    items = await db.user.find_many(
        where=where, skip=(page - 1) * pageSize, take=pageSize, order={"createdAt": "desc"}
    )
    return Page[UserOut](
        items=items,
        total=total,
        page=page,
        page_size=pageSize,
        pages=max(1, -(-total // pageSize)),
    )


@router.patch("/{user_id}/block", response_model=UserOut, dependencies=[Depends(require_admin)])
async def toggle_block(user_id: str, blocked: bool = True):
    user = await db.user.find_unique(where={"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "admin":
        raise HTTPException(status_code=400, detail="Admin accounts cannot be blocked")

    updated = await db.user.update(where={"id": user_id}, data={"isActive": not blocked})
    await notify(
        user_id,
        "Account suspended" if blocked else "Account reinstated",
        "An administrator has changed the status of your account.",
    )
    return updated


@router.delete("/{user_id}", dependencies=[Depends(require_admin)])
async def delete_user(user_id: str):
    user = await db.user.find_unique(where={"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "admin":
        raise HTTPException(status_code=400, detail="Admin accounts cannot be deleted")

    if user.role == "job_seeker":
        seeker = await db.jobseeker.find_unique(where={"userId": user_id})
        if seeker:
            await db.application.delete_many(where={"jobSeekerId": seeker.id})
            await db.savedjob.delete_many(where={"jobSeekerId": seeker.id})
            await db.jobseeker.delete(where={"id": seeker.id})
    elif user.role == "employer":
        employer = await db.employer.find_unique(where={"userId": user_id})
        if employer:
            await db.employer.delete(where={"id": employer.id})

    await db.notification.delete_many(where={"userId": user_id})
    await db.user.delete(where={"id": user_id})
    return {"detail": "User removed"}
