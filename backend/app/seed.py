"""Seed the Online Job Portal with realistic demo data.

Usage: python -m app.seed
"""

import asyncio
import random
from datetime import datetime, timedelta, timezone

from app.auth.security import hash_password
from app.database.client import connect_db, db, disconnect_db

random.seed(42)

PASSWORD = "Password123"

CATEGORIES = [
    ("Software Development", "Engineering roles building and maintaining software products"),
    ("Data Science & AI", "Analytics, machine learning and artificial intelligence roles"),
    ("Design & UX", "Product, visual and user-experience design roles"),
    ("Marketing & Sales", "Growth, marketing, sales and business development roles"),
    ("Finance & Accounting", "Finance, accounting, audit and compliance roles"),
    ("Human Resources", "Recruitment, HR operations and people-partner roles"),
]

SKILLS = [
    ("Python", "Backend"),
    ("JavaScript", "Frontend"),
    ("TypeScript", "Frontend"),
    ("React", "Frontend"),
    ("FastAPI", "Backend"),
    ("Django", "Backend"),
    ("Node.js", "Backend"),
    ("MongoDB", "Database"),
    ("PostgreSQL", "Database"),
    ("Prisma", "Database"),
    ("Docker", "DevOps"),
    ("Kubernetes", "DevOps"),
    ("AWS", "Cloud"),
    ("Machine Learning", "Data"),
    ("Pandas", "Data"),
    ("scikit-learn", "Data"),
    ("Figma", "Design"),
    ("UI/UX", "Design"),
    ("Agile", "Process"),
    ("Git", "Tooling"),
    ("Communication", "Soft skill"),
    ("SQL", "Database"),
    ("Excel", "Tooling"),
    ("Recruitment", "HR"),
    ("Sales", "Business"),
]

COMPANIES = [
    {
        "name": "NovaTech Solutions",
        "industry": "Information Technology",
        "location": "Bengaluru, India",
        "size": "201-500",
        "website": "https://novatech.example.com",
        "description": "A product engineering company building cloud platforms for logistics.",
    },
    {
        "name": "BlueWave Analytics",
        "industry": "Data & Analytics",
        "location": "Remote",
        "size": "51-200",
        "website": "https://bluewave.example.com",
        "description": "Data consultancy specialising in forecasting and decision intelligence.",
    },
    {
        "name": "Meridian Finance Group",
        "industry": "Financial Services",
        "location": "Mumbai, India",
        "size": "501-1000",
        "website": "https://meridianfg.example.com",
        "description": "Retail banking and wealth-management group with a technology-first mandate.",
    },
    {
        "name": "PixelCraft Studio",
        "industry": "Design Agency",
        "location": "Pune, India",
        "size": "11-50",
        "website": "https://pixelcraft.example.com",
        "description": "A design studio crafting digital products for startups and enterprises.",
    },
    {
        "name": "Greenfield Retail",
        "industry": "Retail",
        "location": "Delhi, India",
        "size": "1000+",
        "website": "https://greenfield.example.com",
        "description": "Omni-channel retail chain modernising its supply chain and analytics.",
    },
]

JOBS = [
    {
        "title": "Senior Backend Engineer (Python)",
        "category": "Software Development",
        "employmentType": "full_time",
        "workMode": "hybrid",
        "location": "Bengaluru, India",
        "salaryMin": 22000,
        "salaryMax": 32000,
        "experienceMin": 4,
        "experienceMax": 8,
        "skills": ["Python", "FastAPI", "MongoDB", "Docker", "AWS", "Git"],
        "description": (
            "Design and scale the REST APIs that power our logistics platform. You will own "
            "service architecture, data modelling and performance work."
        ),
        "requirements": "4+ years with Python, strong FastAPI/Django background, MongoDB or PostgreSQL, Docker.",
        "responsibilities": "Build async APIs, review code, mentor juniors, own observability.",
    },
    {
        "title": "Frontend Engineer (React)",
        "category": "Software Development",
        "employmentType": "full_time",
        "workMode": "remote",
        "location": "Remote",
        "salaryMin": 15000,
        "salaryMax": 24000,
        "experienceMin": 2,
        "experienceMax": 6,
        "skills": ["React", "TypeScript", "JavaScript", "Git", "Communication"],
        "description": (
            "Craft accessible, fast React interfaces for a data-heavy dashboard product used by "
            "operations teams every day."
        ),
        "requirements": "Strong React and TypeScript, solid CSS fundamentals, testing experience.",
        "responsibilities": "Ship features, improve design-system components, pair with designers.",
    },
    {
        "title": "Machine Learning Engineer",
        "category": "Data Science & AI",
        "employmentType": "full_time",
        "workMode": "onsite",
        "location": "Bengaluru, India",
        "salaryMin": 26000,
        "salaryMax": 38000,
        "experienceMin": 3,
        "experienceMax": 8,
        "skills": ["Python", "Machine Learning", "scikit-learn", "Pandas", "Docker"],
        "description": (
            "Take models from notebook to production: feature pipelines, training jobs and "
            "online scoring services."
        ),
        "requirements": "Python, scikit-learn or PyTorch, feature engineering, MLOps exposure.",
        "responsibilities": "Build pipelines, evaluate models, partner with product on metrics.",
    },
    {
        "title": "Data Analyst",
        "category": "Data Science & AI",
        "employmentType": "full_time",
        "workMode": "hybrid",
        "location": "Delhi, India",
        "salaryMin": 9000,
        "salaryMax": 15000,
        "experienceMin": 1,
        "experienceMax": 4,
        "skills": ["SQL", "Pandas", "Excel", "Communication"],
        "description": (
            "Turn retail transaction data into decisions: dashboards, cohort studies and "
            "weekly business reviews."
        ),
        "requirements": "Advanced SQL, Python or Excel modelling, clear written communication.",
        "responsibilities": "Own reporting, investigate anomalies, present findings.",
    },
    {
        "title": "Product Designer (UI/UX)",
        "category": "Design & UX",
        "employmentType": "full_time",
        "workMode": "onsite",
        "location": "Pune, India",
        "salaryMin": 11000,
        "salaryMax": 18000,
        "experienceMin": 2,
        "experienceMax": 6,
        "skills": ["Figma", "UI/UX", "Communication", "Agile"],
        "description": (
            "Own end-to-end product design: research, flows, high-fidelity UI and a maintained "
            "design system."
        ),
        "requirements": "Strong Figma portfolio, design-system thinking, user-research experience.",
        "responsibilities": "Run discovery, prototype, hand off specs, test with users.",
    },
    {
        "title": "DevOps Engineer",
        "category": "Software Development",
        "employmentType": "full_time",
        "workMode": "remote",
        "location": "Remote",
        "salaryMin": 18000,
        "salaryMax": 28000,
        "experienceMin": 3,
        "experienceMax": 7,
        "skills": ["Docker", "Kubernetes", "AWS", "Git", "Python"],
        "description": (
            "Own CI/CD, infrastructure-as-code and platform reliability for a multi-tenant SaaS."
        ),
        "requirements": "Kubernetes, Terraform-style IaC, AWS networking, scripting.",
        "responsibilities": "Automate delivery, improve incident response, control cloud cost.",
    },
    {
        "title": "Digital Marketing Specialist",
        "category": "Marketing & Sales",
        "employmentType": "full_time",
        "workMode": "hybrid",
        "location": "Mumbai, India",
        "salaryMin": 7000,
        "salaryMax": 12000,
        "experienceMin": 2,
        "experienceMax": 5,
        "skills": ["Communication", "Excel", "Sales", "Agile"],
        "description": "Run paid and organic campaigns, own the funnel and report on CAC and ROI.",
        "requirements": "Hands-on SEO/SEM, analytics tooling, campaign budgeting.",
        "responsibilities": "Plan campaigns, A/B test creatives, report weekly.",
    },
    {
        "title": "Financial Analyst",
        "category": "Finance & Accounting",
        "employmentType": "full_time",
        "workMode": "onsite",
        "location": "Mumbai, India",
        "salaryMin": 10000,
        "salaryMax": 16000,
        "experienceMin": 2,
        "experienceMax": 5,
        "skills": ["Excel", "SQL", "Communication"],
        "description": "Build forecasting models, support budgeting cycles and investor reporting.",
        "requirements": "Financial modelling, advanced Excel, attention to detail.",
        "responsibilities": "Own monthly close inputs, variance analysis, board packs.",
    },
    {
        "title": "Technical Recruiter",
        "category": "Human Resources",
        "employmentType": "full_time",
        "workMode": "hybrid",
        "location": "Bengaluru, India",
        "salaryMin": 8000,
        "salaryMax": 14000,
        "experienceMin": 2,
        "experienceMax": 6,
        "skills": ["Recruitment", "Communication", "Excel", "Agile"],
        "description": "Partner with engineering leaders to hire across backend, data and design.",
        "requirements": "Technical sourcing experience, strong candidate communication.",
        "responsibilities": "Own pipelines, run structured interviews, improve employer brand.",
    },
    {
        "title": "Junior Python Developer",
        "category": "Software Development",
        "employmentType": "internship",
        "workMode": "onsite",
        "location": "Pune, India",
        "salaryMin": 3000,
        "salaryMax": 5000,
        "experienceMin": 0,
        "experienceMax": 2,
        "skills": ["Python", "Git", "SQL"],
        "description": "A six-month internship supporting internal automation tools, with mentorship.",
        "requirements": "Python fundamentals, willingness to learn, basic SQL.",
        "responsibilities": "Write scripts, fix bugs, write tests, document work.",
    },
    {
        "title": "Full Stack Developer (MERN)",
        "category": "Software Development",
        "employmentType": "contract",
        "workMode": "remote",
        "location": "Remote",
        "salaryMin": 13000,
        "salaryMax": 20000,
        "experienceMin": 3,
        "experienceMax": 7,
        "skills": ["React", "Node.js", "MongoDB", "JavaScript", "Docker"],
        "description": "Build customer-facing features across a React front end and Node services.",
        "requirements": "React, Node.js, MongoDB, REST API design.",
        "responsibilities": "Ship features end to end, write tests, review pull requests.",
    },
    {
        "title": "Business Development Executive",
        "category": "Marketing & Sales",
        "employmentType": "full_time",
        "workMode": "onsite",
        "location": "Delhi, India",
        "salaryMin": 6000,
        "salaryMax": 11000,
        "experienceMin": 1,
        "experienceMax": 4,
        "skills": ["Sales", "Communication", "Excel"],
        "description": "Own outbound prospecting and close mid-market deals for our retail platform.",
        "requirements": "B2B sales exposure, CRM discipline, strong presentation skills.",
        "responsibilities": "Prospect, demo, negotiate, maintain pipeline hygiene.",
    },
]

SEEKERS = [
    {
        "fullName": "Aarav Sharma",
        "email": "aarav@example.com",
        "headline": "Backend Engineer with 5 years in Python and FastAPI",
        "location": "Bengaluru, India",
        "education": "B.Tech Computer Science, IIT Hyderabad",
        "experienceYears": 5,
        "summary": "I build async Python services, model data in MongoDB and care about observability.",
        "skills": ["Python", "FastAPI", "MongoDB", "Docker", "AWS", "SQL", "Git", "Communication"],
    },
    {
        "fullName": "Priya Nair",
        "email": "priya@example.com",
        "headline": "Frontend Engineer specialising in React and TypeScript",
        "location": "Remote",
        "education": "B.E Information Technology, VIT Vellore",
        "experienceYears": 4,
        "summary": "Design-system focused React developer who enjoys performance and accessibility work.",
        "skills": ["React", "TypeScript", "JavaScript", "Git", "UI/UX", "Communication"],
    },
    {
        "fullName": "Rahul Verma",
        "email": "rahul@example.com",
        "headline": "Data Scientist working on forecasting and churn models",
        "location": "Delhi, India",
        "education": "M.Sc Statistics, Delhi University",
        "experienceYears": 3,
        "summary": "I turn messy transactional data into models the business actually uses.",
        "skills": ["Python", "Machine Learning", "Pandas", "scikit-learn", "SQL", "Excel"],
    },
    {
        "fullName": "Sneha Iyer",
        "email": "sneha@example.com",
        "headline": "Product Designer (UI/UX) with a systems mindset",
        "location": "Pune, India",
        "education": "B.Des Communication Design, NID Ahmedabad",
        "experienceYears": 3,
        "summary": "End-to-end product designer: research, flows, high-fidelity UI and design systems.",
        "skills": ["Figma", "UI/UX", "Communication", "Agile"],
    },
    {
        "fullName": "Karan Mehta",
        "email": "karan@example.com",
        "headline": "DevOps Engineer focused on Kubernetes and delivery automation",
        "location": "Remote",
        "education": "B.Tech Electronics, NIT Surat",
        "experienceYears": 6,
        "summary": "I make deployments boring: CI/CD, IaC, autoscaling and good alerts.",
        "skills": ["Docker", "Kubernetes", "AWS", "Python", "Git", "Communication"],
    },
]

EMPLOYERS = [
    {"fullName": "Meera Krishnan", "email": "meera@novatech.example.com", "company": 0, "designation": "Head of Engineering"},
    {"fullName": "Arjun Rao", "email": "arjun@bluewave.example.com", "company": 1, "designation": "Talent Lead"},
    {"fullName": "Nisha Kapoor", "email": "nisha@meridianfg.example.com", "company": 2, "designation": "HR Director"},
    {"fullName": "Dev Patel", "email": "dev@pixelcraft.example.com", "company": 3, "designation": "Studio Manager"},
    {"fullName": "Farah Khan", "email": "farah@greenfield.example.com", "company": 4, "designation": "Recruitment Manager"},
]

ADMIN = {"fullName": "Platform Administrator", "email": "admin@jobportal.com"}


def slugify(value: str) -> str:
    import re

    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


async def reset_collections() -> None:
    for model in (
        db.interview,
        db.application,
        db.savedjob,
        db.resume,
        db.jobalert,
        db.notification,
        db.job,
        db.employer,
        db.company,
        db.jobseeker,
        db.skill,
        db.category,
        db.user,
    ):
        await model.delete_many()


async def seed() -> None:
    await connect_db()
    await reset_collections()

    categories = {}
    for name, description in CATEGORIES:
        categories[name] = await db.category.create(
            data={"name": name, "slug": slugify(name), "description": description, "isActive": True}
        )

    for name, category in SKILLS:
        await db.skill.create(data={"name": name, "category": category})

    admin = await db.user.create(
        data={
            "email": ADMIN["email"],
            "passwordHash": hash_password(PASSWORD),
            "fullName": ADMIN["fullName"],
            "role": "admin",
            "isVerified": True,
            "isActive": True,
        }
    )

    companies = []
    for index, spec in enumerate(COMPANIES):
        companies.append(
            await db.company.create(
                data={
                    "name": spec["name"],
                    "slug": slugify(spec["name"]),
                    "industry": spec["industry"],
                    "location": spec["location"],
                    "size": spec["size"],
                    "website": spec["website"],
                    "description": spec["description"],
                    "isVerified": True,
                }
            )
        )

    employers = []
    for spec in EMPLOYERS:
        user = await db.user.create(
            data={
                "email": spec["email"],
                "passwordHash": hash_password(PASSWORD),
                "fullName": spec["fullName"],
                "role": "employer",
                "isVerified": True,
                "isActive": True,
            }
        )
        employers.append(
            await db.employer.create(
                data={
                    "userId": user.id,
                    "companyId": companies[spec["company"]].id,
                    "designation": spec["designation"],
                    "isApproved": True,
                }
            )
        )

    seekers = []
    for spec in SEEKERS:
        user = await db.user.create(
            data={
                "email": spec["email"],
                "passwordHash": hash_password(PASSWORD),
                "fullName": spec["fullName"],
                "role": "job_seeker",
                "isVerified": True,
                "isActive": True,
            }
        )
        seeker = await db.jobseeker.create(
            data={
                "userId": user.id,
                "headline": spec["headline"],
                "summary": spec["summary"],
                "location": spec["location"],
                "education": spec["education"],
                "experienceYears": spec["experienceYears"],
                "skills": spec["skills"],
                "profileVisible": True,
            }
        )
        seekers.append(seeker)

    now = datetime.now(timezone.utc)
    created_jobs = []
    for index, spec in enumerate(JOBS):
        employer = employers[index % len(employers)]
        # Leave the two most recent postings pending so an admin has a queue to work.
        status = "pending" if index >= len(JOBS) - 2 else "approved"
        created_jobs.append(
            await db.job.create(
                data={
                    "title": spec["title"],
                    "description": spec["description"],
                    "requirements": spec["requirements"],
                    "responsibilities": spec["responsibilities"],
                    "companyId": employer.companyId,
                    "categoryId": categories[spec["category"]].id,
                    "postedById": employer.userId,
                    "employmentType": spec["employmentType"],
                    "workMode": spec["workMode"],
                    "location": spec["location"],
                    "salaryMin": spec["salaryMin"],
                    "salaryMax": spec["salaryMax"],
                    "currency": "USD",
                    "experienceMin": spec["experienceMin"],
                    "experienceMax": spec["experienceMax"],
                    "skills": spec["skills"],
                    "vacancies": random.choice([1, 1, 2, 3]),
                    "status": status,
                    "deadline": now + timedelta(days=random.randint(20, 60)),
                    "views": random.randint(15, 480),
                    "createdAt": now - timedelta(days=random.randint(1, 45)),
                }
            )
        )

    from app.services.matching_service import score_job

    approved = [j for j in created_jobs if j.status == "approved"]
    statuses = ["applied", "under_review", "shortlisted", "interview", "hired", "rejected"]
    applications = []
    for seeker in seekers:
        targets = random.sample(approved, k=min(len(approved), random.randint(3, 5)))
        for job in targets:
            status = random.choices(
                statuses, weights=[35, 20, 15, 10, 10, 10], k=1
            )[0]
            score, _ratio, _matched, _missing = score_job(seeker, job)
            applications.append(
                await db.application.create(
                    data={
                        "jobId": job.id,
                        "jobSeekerId": seeker.id,
                        "status": status,
                        "matchScore": score,
                        "coverLetter": "I am excited about this role and believe my background fits well.",
                        "createdAt": now - timedelta(days=random.randint(0, 20)),
                    }
                )
            )

    for seeker in seekers:
        pool = [j for j in approved if j.id not in {a.jobId for a in applications if a.jobSeekerId == seeker.id}]
        for job in random.sample(pool, k=min(len(pool), 2)):
            await db.savedjob.create(data={"jobId": job.id, "jobSeekerId": seeker.id})

    for application in [a for a in applications if a.status == "interview"]:
        await db.interview.create(
            data={
                "applicationId": application.id,
                "jobId": application.jobId,
                "scheduledAt": now + timedelta(days=random.randint(1, 14)),
                "mode": random.choice(["online", "onsite", "phone"]),
                "meetingLink": "https://meet.example.com/interview",
                "notes": "Technical round with the hiring manager.",
                "status": "scheduled",
            }
        )

    await db.jobalert.create(
        data={
            "jobSeekerId": seekers[0].id,
            "keywords": "python backend",
            "location": "Bengaluru",
            "frequency": "daily",
            "isActive": True,
        }
    )
    await db.jobalert.create(
        data={
            "jobSeekerId": seekers[1].id,
            "keywords": "react frontend",
            "frequency": "weekly",
            "isActive": True,
        }
    )

    for seeker in seekers[:2]:
        user = await db.user.find_unique(where={"id": seeker.userId})
        await db.notification.create(
            data={
                "userId": seeker.userId,
                "title": "Welcome to Online Job Portal",
                "message": f"Hi {user.fullName}, complete your profile to get better matches.",
                "type": "info",
                "isRead": False,
            }
        )

    print("Seed complete")
    print(f"  admin     {ADMIN['email']} / {PASSWORD}")
    print(f"  employer  {EMPLOYERS[0]['email']} / {PASSWORD}")
    print(f"  seeker    {SEEKERS[0]['email']} / {PASSWORD}")
    print(f"  categories={len(CATEGORIES)} companies={len(companies)} jobs={len(created_jobs)} "
          f"seekers={len(seekers)} applications={len(applications)}")

    await disconnect_db()


if __name__ == "__main__":
    asyncio.run(seed())
