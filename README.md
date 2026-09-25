# Online Job Portal

A full-stack job portal that connects job seekers with employers, with an admin
overseeing the platform. Built from `Online_Job_Portal_Overview.pdf`.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React + Vite + TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Python FastAPI (async REST APIs) |
| Database | MongoDB via Prisma Client Python |
| Auth | JWT issued and verified in FastAPI, bcrypt password hashing |
| Matching | scikit-learn TF-IDF job matching, resume keyword parsing |

The frontend talks to the backend over REST only. The backend owns
authentication, authorisation and all database access; the frontend never
connects to MongoDB directly.

## Structure

```
.
├── frontend/   React SPA (Vite + TypeScript + shadcn/ui)
└── backend/    FastAPI app, Prisma schema, services and tests
```

## Modules

1. Login & authentication (separate seeker/employer registration, email verification, password reset)
2. Admin dashboard (statistics, employer approval, categories, moderation)
3. Job seeker profile (details, education, skills, resume upload PDF/DOCX)
4. Employer & company management
5. Job posting management (post, edit, close)
6. Job search & filter (keyword, location, category, salary, experience; save jobs)
7. Job application management (apply with resume, history, status, withdraw)
8. Applicant review & shortlisting (view applicants, download resumes, interviews)
9. Job alerts & notifications
10. AI job recommendation (skill-based matching, resume parsing)
11. Reports & analytics (PDF / Excel export)

## Getting started

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # then edit values
prisma generate --schema prisma/schema.prisma
prisma db push --schema prisma/schema.prisma
python -m app.seed
uvicorn app.main:app --reload --port 8000
```

Interactive API docs: http://127.0.0.1:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The dev server proxies `/api` to `http://127.0.0.1:8000`.

## Tests

```bash
cd backend
python tests/smoke_test.py       # end-to-end API checks
python tests/contract_check.py   # API contract checks
```

## Demo accounts

Seeded accounts all use the password `Password123`.

| Role | Email |
| --- | --- |
| Job seeker | aarav@example.com |
| Employer | meera@novatech.example.com |
| Admin | admin@jobportal.com |

## Security notes

- `.env` files, virtualenvs, `node_modules`, build output and uploaded resumes are gitignored.
- Only PDF and DOCX resumes are accepted, validated by extension, content type and magic bytes.
- Passwords are bcrypt-hashed; JWTs are verified on every protected route.
