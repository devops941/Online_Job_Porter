import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database.client import connect_db, disconnect_db
from app.routes import (
    application_routes,
    auth_routes,
    dashboard_routes,
    interview_routes,
    job_routes,
    notification_routes,
    profile_routes,
    report_routes,
    resume_routes,
    saved_job_routes,
    taxonomy_routes,
    user_routes,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("jobportal")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    logger.info("Connected to MongoDB via Prisma")
    yield
    await disconnect_db()


app = FastAPI(
    title="Online Job Portal API",
    description=(
        "REST API for the Online Job Portal. The FastAPI backend owns authentication, "
        "authorisation and every MongoDB access path (through Prisma Client)."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError):
    first = exc.errors()[0] if exc.errors() else {}
    field = ".".join(str(p) for p in first.get("loc", [])[1:]) or "request"
    return JSONResponse(
        status_code=422,
        content={"detail": f"{field}: {first.get('msg', 'invalid value')}"},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    # Keep internal details out of the response body while logging them server-side.
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


for module in (
    auth_routes,
    user_routes,
    profile_routes,
    taxonomy_routes,
    job_routes,
    saved_job_routes,
    resume_routes,
    application_routes,
    interview_routes,
    notification_routes,
    dashboard_routes,
    report_routes,
):
    app.include_router(module.router)


@app.get("/", tags=["System"])
async def root():
    return {
        "status": "online",
        "message": "Online Job Portal Backend API is running successfully",
        "version": app.version,
        "docs": "/docs",
        "health": "/api/health",
    }


@app.get("/api/health", tags=["System"])
async def health():
    from app.database.client import db

    return {
        "status": "ok",
        "database": "connected" if db.is_connected() else "disconnected",
        "version": app.version,
    }
