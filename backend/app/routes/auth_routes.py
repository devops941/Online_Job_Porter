import re
from datetime import datetime, timedelta, timezone

from fastapi import Depends, APIRouter, BackgroundTasks, HTTPException, status

from app.auth import (
    CurrentUser,
    create_access_token,
    hash_password,
    random_token,
    verify_password,
)
from app.database.client import db
from app.schemas import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    Message,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
)
from app.services import email_service
from app.services.notification_service import notify

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "company"


async def _unique_company_slug(name: str) -> str:
    base = slugify(name)
    slug = base
    suffix = 2
    while await db.company.find_unique(where={"slug": slug}):
        slug = f"{base}-{suffix}"
        suffix += 1
    return slug


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, background: BackgroundTasks):
    existing = await db.user.find_unique(where={"email": payload.email.lower()})
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    token = random_token(16)
    user = await db.user.create(
        data={
            "email": payload.email.lower(),
            "passwordHash": hash_password(payload.password),
            "fullName": payload.fullName,
            "phone": payload.phone,
            "role": payload.role,
            "isVerified": False,
            "verificationToken": token,
        }
    )

    if payload.role == "job_seeker":
        await db.jobseeker.create(
            data={
                "userId": user.id,
                "skills": [],
                "experienceYears": 0.0,
                "profileVisible": True,
            }
        )
    else:
        company = None
        if payload.companyName:
            company = await db.company.create(
                data={"name": payload.companyName, "slug": await _unique_company_slug(payload.companyName)}
            )
        await db.employer.create(
            data={"userId": user.id, "companyId": company.id if company else None, "isApproved": False}
        )

    subject, body = email_service.verification_email(user.fullName, token)
    background.add_task(email_service.send_email, user.email, subject, body)
    await notify(
        user.id,
        "Welcome to Online Job Portal",
        "Verify your email address to unlock every feature.",
        type_="info",
    )

    return TokenResponse(
        access_token=create_access_token(user.id, user.role),
        user=user,
    )


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest):
    user = await db.user.find_unique(where={"email": payload.email.lower()})
    if not user or not verify_password(payload.password, user.passwordHash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.isActive:
        raise HTTPException(status_code=403, detail="This account has been suspended")
    return TokenResponse(access_token=create_access_token(user.id, user.role), user=user)


@router.get("/me")
async def me(user: CurrentUser):
    return user


@router.post("/verify-email", response_model=Message)
async def verify_email(token: str):
    user = await db.user.find_first(where={"verificationToken": token})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")
    await db.user.update(
        where={"id": user.id},
        data={"isVerified": True, "verificationToken": None},
    )
    return Message(detail="Email verified successfully")


@router.post("/resend-verification", response_model=Message)
async def resend_verification(user: CurrentUser, background: BackgroundTasks):
    if user.isVerified:
        return Message(detail="Email is already verified")
    token = random_token(16)
    await db.user.update(where={"id": user.id}, data={"verificationToken": token})
    subject, body = email_service.verification_email(user.fullName, token)
    background.add_task(email_service.send_email, user.email, subject, body)
    return Message(detail="Verification email sent")


@router.post("/forgot-password", response_model=Message)
async def forgot_password(payload: ForgotPasswordRequest, background: BackgroundTasks):
    user = await db.user.find_unique(where={"email": payload.email.lower()})
    # Always answer the same way so the endpoint cannot enumerate accounts.
    if user:
        token = random_token(24)
        await db.user.update(
            where={"id": user.id},
            data={
                "resetToken": token,
                "resetTokenExpiry": datetime.now(timezone.utc) + timedelta(hours=1),
            },
        )
        subject, body = email_service.reset_email(user.fullName, token)
        background.add_task(email_service.send_email, user.email, subject, body)
    return Message(detail="If the email exists, a reset link has been sent")


@router.post("/reset-password", response_model=Message)
async def reset_password(payload: ResetPasswordRequest):
    user = await db.user.find_first(where={"resetToken": payload.token})
    if not user or not user.resetTokenExpiry:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    expiry = user.resetTokenExpiry
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)
    if expiry < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    await db.user.update(
        where={"id": user.id},
        data={
            "passwordHash": hash_password(payload.newPassword),
            "resetToken": None,
            "resetTokenExpiry": None,
        },
    )
    return Message(detail="Password reset successfully")


@router.post("/change-password", response_model=Message)
async def change_password(payload: ChangePasswordRequest, user: CurrentUser):
    if not verify_password(payload.currentPassword, user.passwordHash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    await db.user.update(
        where={"id": user.id}, data={"passwordHash": hash_password(payload.newPassword)}
    )
    return Message(detail="Password updated successfully")
