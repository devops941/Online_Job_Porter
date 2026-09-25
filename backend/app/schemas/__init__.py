from datetime import datetime
from typing import Any, Generic, TypeVar

from pydantic import BaseModel, ConfigDict, EmailStr, Field

T = TypeVar("T")


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    pages: int


class Message(BaseModel):
    detail: str


# ---------- Auth ----------
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    fullName: str = Field(min_length=2, max_length=120)
    phone: str | None = None
    role: str = Field(pattern="^(employer|job_seeker)$")
    companyName: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    newPassword: str = Field(min_length=6, max_length=128)


class ChangePasswordRequest(BaseModel):
    currentPassword: str
    newPassword: str = Field(min_length=6, max_length=128)


# ---------- Users ----------
class UserOut(ORMModel):
    id: str
    email: EmailStr
    fullName: str
    phone: str | None = None
    role: str
    isVerified: bool
    isActive: bool
    createdAt: datetime


class UserUpdate(BaseModel):
    fullName: str | None = Field(default=None, min_length=2, max_length=120)
    phone: str | None = None


# ---------- Profiles ----------
class JobSeekerProfileIn(BaseModel):
    headline: str | None = None
    summary: str | None = None
    location: str | None = None
    experienceYears: float | None = Field(default=None, ge=0, le=60)
    education: str | None = None
    skills: list[str] | None = None
    profileVisible: bool | None = None


class JobSeekerProfileOut(ORMModel):
    id: str
    userId: str
    headline: str | None = None
    summary: str | None = None
    location: str | None = None
    experienceYears: float
    education: str | None = None
    skills: list[str]
    resumeUrl: str | None = None
    profileVisible: bool
    user: UserOut | None = None


class CompanyIn(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    website: str | None = None
    description: str | None = None
    location: str | None = None
    industry: str | None = None
    size: str | None = None
    logoUrl: str | None = None


class CompanyOut(ORMModel):
    id: str
    name: str
    slug: str
    logoUrl: str | None = None
    website: str | None = None
    description: str | None = None
    location: str | None = None
    industry: str | None = None
    size: str | None = None
    isVerified: bool


class EmployerProfileIn(BaseModel):
    designation: str | None = None
    company: CompanyIn | None = None


class EmployerProfileOut(ORMModel):
    id: str
    userId: str
    designation: str | None = None
    isApproved: bool
    company: CompanyOut | None = None
    user: UserOut | None = None


# ---------- Taxonomy ----------
class CategoryIn(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    description: str | None = None
    isActive: bool | None = True


class CategoryOut(ORMModel):
    id: str
    name: str
    slug: str
    description: str | None = None
    isActive: bool


class SkillIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    category: str | None = None


class SkillOut(ORMModel):
    id: str
    name: str
    category: str | None = None


# ---------- Jobs ----------
class JobIn(BaseModel):
    title: str = Field(min_length=3, max_length=180)
    description: str = Field(min_length=10)
    requirements: str | None = None
    responsibilities: str | None = None
    categoryId: str | None = None
    employmentType: str = "full_time"
    workMode: str = "onsite"
    location: str = Field(min_length=1, max_length=160)
    salaryMin: float | None = Field(default=None, ge=0)
    salaryMax: float | None = Field(default=None, ge=0)
    currency: str = "USD"
    experienceMin: float = Field(default=0, ge=0, le=60)
    experienceMax: float | None = Field(default=None, ge=0, le=60)
    skills: list[str] = []
    vacancies: int = Field(default=1, ge=1, le=999)
    deadline: datetime | None = None


class JobUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    requirements: str | None = None
    responsibilities: str | None = None
    categoryId: str | None = None
    employmentType: str | None = None
    workMode: str | None = None
    location: str | None = None
    salaryMin: float | None = None
    salaryMax: float | None = None
    currency: str | None = None
    experienceMin: float | None = None
    experienceMax: float | None = None
    skills: list[str] | None = None
    vacancies: int | None = None
    deadline: datetime | None = None
    status: str | None = None


class JobOut(ORMModel):
    id: str
    title: str
    description: str
    requirements: str | None = None
    responsibilities: str | None = None
    companyId: str
    categoryId: str | None = None
    postedById: str
    employmentType: str
    workMode: str
    location: str
    salaryMin: float | None = None
    salaryMax: float | None = None
    currency: str
    experienceMin: float
    experienceMax: float | None = None
    skills: list[str]
    vacancies: int
    status: str
    rejectionReason: str | None = None
    deadline: datetime | None = None
    views: int
    createdAt: datetime
    updatedAt: datetime
    company: CompanyOut | None = None
    category: CategoryOut | None = None


class JobStatusUpdate(BaseModel):
    status: str = Field(pattern="^(approved|rejected|closed|pending)$")
    rejectionReason: str | None = None


class JobSearchFilters(BaseModel):
    q: str | None = None
    location: str | None = None
    categoryId: str | None = None
    skills: list[str] | None = None
    salaryMin: float | None = None
    experienceMax: float | None = None
    employmentType: str | None = None
    workMode: str | None = None
    companyId: str | None = None
    status: str | None = None
    sort: str = "newest"  # newest | oldest | salary | relevance
    page: int = Field(default=1, ge=1)
    pageSize: int = Field(default=12, ge=1, le=100)


class RecommendedJob(BaseModel):
    job: JobOut
    matchScore: float
    matchedSkills: list[str]
    missingSkills: list[str]


# ---------- Applications ----------
class ApplicationIn(BaseModel):
    jobId: str
    resumeId: str | None = None
    coverLetter: str | None = Field(default=None, max_length=4000)


class ApplicationStatusUpdate(BaseModel):
    status: str = Field(
        pattern="^(applied|under_review|shortlisted|rejected|interview|hired|withdrawn)$"
    )
    employerNotes: str | None = None


class ApplicationOut(ORMModel):
    id: str
    jobId: str
    jobSeekerId: str
    resumeId: str | None = None
    coverLetter: str | None = None
    status: str
    matchScore: float
    employerNotes: str | None = None
    createdAt: datetime
    updatedAt: datetime
    job: JobOut | None = None
    jobSeeker: JobSeekerProfileOut | None = None


# ---------- Saved Jobs ----------
class SavedJobOut(ORMModel):
    id: str
    jobId: str
    jobSeekerId: str
    createdAt: datetime
    job: JobOut | None = None


# ---------- Resumes ----------
class ResumeOut(ORMModel):
    id: str
    jobSeekerId: str
    fileName: str
    filePath: str
    fileType: str
    fileSize: int
    parsedSkills: list[str]
    isPrimary: bool
    createdAt: datetime


# ---------- Interviews ----------
class InterviewIn(BaseModel):
    applicationId: str
    scheduledAt: datetime
    mode: str = Field(default="online", pattern="^(online|onsite|phone)$")
    location: str | None = None
    meetingLink: str | None = None
    notes: str | None = None


class InterviewUpdate(BaseModel):
    scheduledAt: datetime | None = None
    mode: str | None = None
    location: str | None = None
    meetingLink: str | None = None
    notes: str | None = None
    status: str | None = Field(default=None, pattern="^(scheduled|completed|cancelled)$")


class InterviewOut(ORMModel):
    id: str
    applicationId: str
    jobId: str
    scheduledAt: datetime
    mode: str
    location: str | None = None
    meetingLink: str | None = None
    notes: str | None = None
    status: str
    createdAt: datetime
    job: JobOut | None = None


# ---------- Notifications ----------
class NotificationOut(ORMModel):
    id: str
    userId: str
    title: str
    message: str
    type: str
    isRead: bool
    link: str | None = None
    createdAt: datetime


class JobAlertIn(BaseModel):
    keywords: str | None = None
    location: str | None = None
    categoryId: str | None = None
    frequency: str = Field(default="daily", pattern="^(daily|weekly|instant)$")
    isActive: bool = True


class JobAlertOut(ORMModel):
    id: str
    jobSeekerId: str
    keywords: str | None = None
    location: str | None = None
    categoryId: str | None = None
    frequency: str
    isActive: bool
    createdAt: datetime


# ---------- Reports ----------
class ReportSummary(BaseModel):
    meta: dict[str, Any]
    data: list[dict[str, Any]] = []


TokenResponse.model_rebuild()
