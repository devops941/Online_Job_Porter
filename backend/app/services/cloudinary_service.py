"""Cloudinary storage integration.

Handles uploading and deleting resumes (raw documents) and images (company logos, avatars).
"""

import logging
import re
import urllib.request
import uuid
from typing import Any

import cloudinary
import cloudinary.uploader
import cloudinary.utils

from app.config import settings

logger = logging.getLogger("jobportal.cloudinary")

_CONFIGURED = False


def ensure_configured():
    global _CONFIGURED
    if not _CONFIGURED:
        cloudinary.config(
            cloud_name=settings.cloudinary_cloud_name,
            api_key=settings.cloudinary_api_key,
            api_secret=settings.cloudinary_api_secret,
            secure=True,
        )
        _CONFIGURED = True


def upload_resume_file(content: bytes, filename: str, seeker_id: str) -> dict[str, Any]:
    """Upload a resume document (PDF, DOC, DOCX) to Cloudinary as raw storage."""
    ensure_configured()
    # Note: Cloudinary default ACL restricts delivery on raw URLs ending in '.pdf',
    # so we store raw resumes with clean alphanumeric public IDs without trailing '.pdf'.
    # When downloaded via the backend endpoint, original filename and headers are preserved.
    public_id = f"job_portal/resumes/{seeker_id}_{uuid.uuid4().hex}"
    result = cloudinary.uploader.upload(
        content,
        resource_type="raw",
        public_id=public_id,
        overwrite=True,
    )
    logger.info("Uploaded resume to Cloudinary: public_id=%s url=%s", public_id, result.get("secure_url"))
    return {
        "secure_url": result["secure_url"],
        "public_id": result.get("public_id", public_id),
        "bytes": len(content),
    }


def upload_image_file(content: bytes, filename: str, folder: str = "job_portal/logos") -> dict[str, Any]:
    """Upload an image (company logo, user avatar) to Cloudinary."""
    ensure_configured()
    clean_base = re.sub(r"[^a-zA-Z0-9_-]", "_", filename.rsplit(".", 1)[0])[:30]
    public_id = f"{folder}/{clean_base}_{uuid.uuid4().hex[:8]}"
    result = cloudinary.uploader.upload(
        content,
        resource_type="image",
        public_id=public_id,
        overwrite=True,
    )
    logger.info("Uploaded image to Cloudinary: public_id=%s url=%s", public_id, result.get("secure_url"))
    return {
        "secure_url": result["secure_url"],
        "public_id": result.get("public_id", public_id),
        "format": result.get("format"),
        "width": result.get("width"),
        "height": result.get("height"),
        "bytes": len(content),
    }


def extract_public_id_from_url(url: str, resource_type: str = "raw") -> str | None:
    """Extract public_id from a Cloudinary URL."""
    if not url or "res.cloudinary.com" not in url:
        return None
    # Pattern: .../(raw|image)/upload/(?:v\d+/)?(job_portal/.*)
    match = re.search(r"/(?:raw|image)/upload/(?:v\d+/)?(.+)$", url)
    if match:
        extracted = match.group(1)
        # If resource_type is image, strip extension if present
        if resource_type == "image":
            extracted = extracted.rsplit(".", 1)[0]
        return extracted
    return None


def delete_file(public_id_or_url: str, resource_type: str = "raw") -> bool:
    """Delete an asset from Cloudinary."""
    ensure_configured()
    if not public_id_or_url:
        return False

    public_id = public_id_or_url
    if "res.cloudinary.com" in public_id_or_url:
        extracted = extract_public_id_from_url(public_id_or_url, resource_type)
        if extracted:
            public_id = extracted

    try:
        res = cloudinary.uploader.destroy(public_id, resource_type=resource_type)
        logger.info("Deleted Cloudinary asset %s: %s", public_id, res)
        return res.get("result") in ("ok", "not found")
    except Exception as exc:
        logger.warning("Failed to delete Cloudinary asset %s: %s", public_id, exc)
        return False


def fetch_remote_file(url: str) -> bytes:
    """Fetch file content from Cloudinary URL."""
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "JobPortal/1.0"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()
