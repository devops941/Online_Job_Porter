"""Email delivery.

When SMTP credentials are configured mail is sent for real; otherwise the
message is logged so local development flows (verification, reset, alerts)
remain observable without an SMTP server.
"""

import logging
import smtplib
from email.message import EmailMessage

from app.config import settings

logger = logging.getLogger("jobportal.email")


def send_email(to: str, subject: str, body: str) -> bool:
    message = EmailMessage()
    message["From"] = settings.smtp_from
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)

    if not settings.smtp_host:
        logger.info("[email:dev] to=%s subject=%s\n%s", to, subject, body)
        return False

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
            smtp.starttls()
            if settings.smtp_user:
                smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.send_message(message)
        return True
    except Exception as exc:  # pragma: no cover - depends on external SMTP
        logger.warning("email send failed to=%s: %s", to, exc)
        return False


def verification_email(full_name: str, token: str) -> tuple[str, str]:
    return (
        "Verify your Online Job Portal account",
        f"Hi {full_name},\n\nConfirm your email address with this code:\n{token}\n\n"
        "Enter it on the verification screen to activate your account.",
    )


def reset_email(full_name: str, token: str) -> tuple[str, str]:
    return (
        "Reset your Online Job Portal password",
        f"Hi {full_name},\n\nUse this code to reset your password:\n{token}\n\n"
        "If you did not request a reset you can ignore this message.",
    )


def status_email(full_name: str, job_title: str, company: str, status: str) -> tuple[str, str]:
    pretty = status.replace("_", " ").title()
    return (
        f"Application update: {job_title}",
        f"Hi {full_name},\n\nYour application for {job_title} at {company} "
        f"is now marked as: {pretty}.\n\nSign in to view the details.",
    )


def interview_email(full_name: str, job_title: str, when: str, mode: str) -> tuple[str, str]:
    return (
        f"Interview invitation: {job_title}",
        f"Hi {full_name},\n\nYou have been invited to interview for {job_title}.\n"
        f"When: {when}\nMode: {mode}\n\nSign in to view the details.",
    )


def job_alert_email(full_name: str, keyword: str, count: int) -> tuple[str, str]:
    return (
        f"{count} new job(s) matching '{keyword}'",
        f"Hi {full_name},\n\n{count} new job posting(s) match your saved alert "
        f"'{keyword}'.\n\nSign in to see them.",
    )
