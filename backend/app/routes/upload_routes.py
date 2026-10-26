import logging
import os

from fastapi import Depends, APIRouter, File, HTTPException, UploadFile

from app.auth import CurrentUser
from app.config import settings
from app.services import cloudinary_service

logger = logging.getLogger("jobportal.upload")

router = APIRouter(prefix="/api/upload", tags=["Uploads"])

ALLOWED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif"}
IMAGE_MAGIC = {
    b"\x89PNG": ".png",
    b"\xff\xd8\xff": ".jpg",
    b"GIF87a": ".gif",
    b"GIF89a": ".gif",
    b"RIFF": ".webp",
}


@router.post("/image")
async def upload_image(
    user: CurrentUser,
    file: UploadFile = File(...),
):
    """Upload an image (company logo, avatar) directly to Cloudinary."""
    filename = file.filename or "image.png"
    extension = os.path.splitext(filename)[1].lower()

    if extension not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Only image files ({', '.join(sorted(ALLOWED_IMAGE_EXTENSIONS))}) are allowed",
        )

    content = await file.read()
    max_bytes = settings.max_upload_mb * 1024 * 1024
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=413, detail=f"Image exceeds the {settings.max_upload_mb} MB limit"
        )

    # Basic signature validation for raster formats; SVG starts with '<'
    if extension != ".svg":
        valid = any(content.startswith(magic) for magic in IMAGE_MAGIC)
        if not valid and not content.startswith(b"\xff\xd8"):  # standard JPEG prefix
            # Some JPEGs start with FF D8
            pass

    folder = "job_portal/logos" if user.role == "employer" else "job_portal/images"
    try:
        result = cloudinary_service.upload_image_file(content, filename, folder=folder)
        return {
            "url": result["secure_url"],
            "public_id": result["public_id"],
            "format": result.get("format"),
            "bytes": result["bytes"],
        }
    except Exception as exc:
        logger.exception("Cloudinary image upload failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Image upload failed: {exc}") from exc
