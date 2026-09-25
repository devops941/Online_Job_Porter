#!/usr/bin/env python3
"""End-to-end API smoke test for the Online Job Portal backend.

Start the API first (uvicorn app.main:app), then: python tests/smoke_test.py
"""
import io
import json
import random
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:8000"


def call(method, path, token=None, body=None, raw=None, content_type="application/json"):
    url = BASE + path
    data = None
    headers = {}
    if raw is not None:
        data = raw
        headers["Content-Type"] = content_type
    elif body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            payload = resp.read()
            ctype = resp.headers.get("Content-Type", "")
            if "application/json" in ctype:
                return resp.status, json.loads(payload)
            return resp.status, payload
    except urllib.error.HTTPError as exc:
        payload = exc.read()
        try:
            return exc.code, json.loads(payload)
        except Exception:
            return exc.code, payload


def login(email, password="Password123"):
    status, data = call("POST", "/api/auth/login", body={"email": email, "password": password})
    assert status == 200, f"login failed for {email}: {status} {data}"
    return data["access_token"]


def head(title):
    print(f"\n{'=' * 12} {title} {'=' * 12}")


failures = []


def check(label, condition, detail=""):
    mark = "PASS" if condition else "FAIL"
    if not condition:
        failures.append(label)
    print(f"[{mark}] {label} {detail}")


suffix = random.randint(100000, 999999)

head("accounts")
admin = login("admin@jobportal.com")
employer = login("meera@novatech.example.com")
seeker = login("aarav@example.com")
check("admin / employer / seeker login", True)

status, _ = call("POST", "/api/auth/login", body={"email": "aarav@example.com", "password": "bad"})
check("wrong password rejected", status == 401, f"-> {status}")

head("registration, verification and password reset")
new_email = f"newuser{suffix}@example.com"
status, data = call("POST", "/api/auth/register", body={
    "email": new_email, "password": "Password123", "fullName": "New Tester", "role": "job_seeker"})
check("job seeker registration", status == 201, f"-> {status} {data if status != 201 else ''}")
new_seeker_token = data.get("access_token") if isinstance(data, dict) else None
check("new account starts unverified",
      isinstance(data, dict) and data.get("user", {}).get("isVerified") is False)
check("duplicate email rejected", call("POST", "/api/auth/register", body={
    "email": new_email, "password": "Password123", "fullName": "Dup", "role": "job_seeker"})[0] == 409)
check("weak password rejected", call("POST", "/api/auth/register", body={
    "email": f"weak{suffix}@example.com", "password": "123", "fullName": "Weak", "role": "job_seeker"})[0] == 422)
check("invalid role rejected", call("POST", "/api/auth/register", body={
    "email": f"role{suffix}@example.com", "password": "Password123", "fullName": "Role", "role": "admin"})[0] == 422)

check("forgot password accepts request",
      call("POST", "/api/auth/forgot-password", body={"email": new_email})[0] == 200)
status, data = call("POST", "/api/auth/forgot-password", body={"email": "nobody@example.com"})
check("forgot password does not leak account existence",
      status == 200 and "reset link has been sent" in data.get("detail", ""))
check("reset with bogus token rejected",
      call("POST", "/api/auth/reset-password", body={"token": "bogus", "newPassword": "NewPass123"})[0] == 400)
status, data = call("POST", "/api/auth/change-password", token=seeker,
                    body={"currentPassword": "wrong", "newPassword": "Whatever123"})
check("change password needs the current password", status == 400)

head("job search and filters")
status, data = call("GET", "/api/jobs?pageSize=100")
open_jobs = data["items"]
check("approved jobs listed", status == 200 and data["total"] > 0, f"-> {data['total']} jobs")
check("only approved jobs in public listing", all(j["status"] == "approved" for j in open_jobs))
check("keyword search matches", call("GET", "/api/jobs?q=python")[1]["total"] > 0)
check("bogus category returns empty page",
      call("GET", "/api/jobs?categoryId=000000000000000000000000")[1]["total"] == 0)
check("location filter is case-insensitive", call("GET", "/api/jobs?location=bengaluru")[1]["total"] > 0)
check("multi-skill filter (hasEvery)", call("GET", "/api/jobs?skills=React&skills=MongoDB")[0] == 200)
check("experience filter", call("GET", "/api/jobs?experienceMax=2")[0] == 200)
status, page2 = call("GET", "/api/jobs?pageSize=2&page=2")
check("pagination metadata", status == 200 and page2["page"] == 2 and len(page2["items"]) <= 2)

job_id = open_jobs[0]["id"]
status, detail = call("GET", f"/api/jobs/{job_id}")
check("job detail increments views", status == 200 and detail["views"] >= 1)
check("unknown job -> 404", call("GET", "/api/jobs/000000000000000000000000")[0] == 404)

head("saved jobs")
target = open_jobs[0]["id"]
check("save a job", call("POST", f"/api/saved-jobs/{target}", token=seeker)[0] in (200, 201))
check("saving twice is idempotent", call("POST", f"/api/saved-jobs/{target}", token=seeker)[0] in (200, 201))
status, listing = call("GET", "/api/saved-jobs", token=seeker)
check("saved list contains the job", status == 200 and any(s["jobId"] == target for s in listing["items"]))
check("unsave", call("DELETE", f"/api/saved-jobs/{target}", token=seeker)[0] == 200)
check("unsave unknown -> 404", call("DELETE", f"/api/saved-jobs/{target}", token=seeker)[0] == 404)

head("resume upload and parsing")
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

buffer = io.BytesIO()
pdf_canvas = canvas.Canvas(buffer, pagesize=letter)
lines = [
    "Jane Candidate - Python Backend Developer",
    "Skills: Python, FastAPI, MongoDB, Docker, AWS, PostgreSQL, Machine Learning",
    "Experience: 4 years building async REST APIs and data pipelines.",
]
for offset, text in enumerate(lines):
    pdf_canvas.drawString(72, 720 - offset * 20, text)
pdf_canvas.save()
pdf = buffer.getvalue()
boundary = "----jobportaltest"
parts = [
    f"--{boundary}\r\n".encode(),
    b'Content-Disposition: form-data; name="file"; filename="resume.pdf"\r\n',
    b"Content-Type: application/pdf\r\n\r\n",
    pdf, b"\r\n", f"--{boundary}--\r\n".encode(),
]
status, data = call("POST", "/api/resumes/upload", token=new_seeker_token,
                    raw=b"".join(parts), content_type=f"multipart/form-data; boundary={boundary}")
check("PDF resume accepted", status == 201, f"-> {status} {data if status != 201 else ''}")
resume_id = data.get("id") if isinstance(data, dict) else None
if resume_id:
    check("resume skills parsed", len(data["parsedSkills"]) >= 4, f"-> {data['parsedSkills']}")
    check("first resume marked primary", data["isPrimary"] is True)

bad_boundary = "----bad"
bad_parts = [
    f"--{bad_boundary}\r\n".encode(),
    b'Content-Disposition: form-data; name="file"; filename="evil.exe"\r\n',
    b"Content-Type: application/octet-stream\r\n\r\n",
    b"MZ\x90\x00 definitely not a resume\r\n", f"--{bad_boundary}--\r\n".encode(),
]
status, data = call("POST", "/api/resumes/upload", token=new_seeker_token,
                    raw=b"".join(bad_parts),
                    content_type=f"multipart/form-data; boundary={bad_boundary}")
check("non-document upload rejected", status == 400, f"-> {status}")

if resume_id:
    check("owner can download resume",
          call("GET", f"/api/resumes/{resume_id}/download", token=new_seeker_token)[0] == 200)
    check("unrelated employer blocked from resume",
          call("GET", f"/api/resumes/{resume_id}/download", token=employer)[0] == 403)

head("profile management")
status, prof = call("PUT", "/api/profiles/job-seeker/me", token=new_seeker_token, body={
    "headline": "Junior Python Developer", "location": "Pune, India", "experienceYears": 1,
    "skills": ["Python", "Git"], "education": "B.Sc CS"})
check("update seeker profile", status == 200 and prof["headline"] == "Junior Python Developer")
check("update employer profile",
      call("PUT", "/api/profiles/employer/me", token=employer, body={"designation": "Head of Engineering"})[0] == 200)
check("seeker cannot write employer profile",
      call("PUT", "/api/profiles/employer/me", token=seeker, body={"designation": "x"})[0] == 403)

head("application flow")
status, apps = call("GET", "/api/applications/me", token=new_seeker_token)
already = {a["jobId"] for a in apps["items"]}
candidates = [j["id"] for j in open_jobs if j["id"] not in already]
new_job = candidates[0]
status, data = call("POST", "/api/applications", token=new_seeker_token, body={
    "jobId": new_job, "resumeId": resume_id, "coverLetter": "Keen to join."})
check("apply to a job", status == 201, f"-> {status} {data if status != 201 else ''}")
application_id = data.get("id") if isinstance(data, dict) else None
check("match score computed on apply",
      isinstance(data, dict) and data.get("matchScore", 0) > 0,
      f"-> {data.get('matchScore') if isinstance(data, dict) else None}")
check("duplicate application blocked",
      call("POST", "/api/applications", token=new_seeker_token, body={"jobId": new_job})[0] == 409)

if application_id:
    head("employer review, shortlisting and interviews")
    status, data = call("PATCH", f"/api/applications/{application_id}/status", token=employer,
                        body={"status": "shortlisted", "employerNotes": "Strong profile"})
    check("shortlist applicant", status == 200 and data["status"] == "shortlisted")

    status, data = call("POST", "/api/interviews", token=employer, body={
        "applicationId": application_id, "scheduledAt": "2026-10-10T10:00:00Z",
        "mode": "online", "meetingLink": "https://meet.example.com/x"})
    check("schedule interview", status == 201, f"-> {status} {data if status != 201 else ''}")
    check("application moves to interview",
          call("GET", f"/api/applications/{application_id}", token=employer)[1]["status"] == "interview")
    check("seeker sees their interviews",
          len(call("GET", "/api/interviews/me", token=new_seeker_token)[1]) >= 1)

    status, data = call("PATCH", f"/api/applications/{application_id}/status", token=employer,
                        body={"status": "hired"})
    check("mark hired", status == 200 and data["status"] == "hired")

    status, notifs = call("GET", "/api/notifications", token=new_seeker_token)
    types = {n["type"] for n in notifs}
    check("status/interview notifications delivered",
          bool(types & {"status_update", "interview"}), f"-> {sorted(types)}")

    status, d = call("GET", "/api/dashboard/job-seeker", token=new_seeker_token)
    check("dashboard reflects the new application",
          any(a["jobId"] == new_job for a in d["recentApplications"]) or d["totals"]["applications"] > 0)

head("withdraw and ownership guards")
status, apps = call("GET", "/api/applications/me", token=new_seeker_token)
applied = [a for a in apps["items"] if a["status"] == "applied"]
if applied:
    check("withdraw an applied application",
          call("PATCH", f"/api/applications/{applied[0]['id']}/withdraw", token=new_seeker_token)[0] == 200)
else:
    print("[SKIP] no 'applied' application available to withdraw")

other_app = call("GET", "/api/applications/me", token=seeker)[1]["items"][0]["id"]
check("cross-seeker withdraw blocked",
      call("PATCH", f"/api/applications/{other_app}/withdraw", token=new_seeker_token)[0] == 404)

head("employer job posting lifecycle")
cat_id = call("GET", "/api/categories")[1][0]["id"]
status, created = call("POST", "/api/jobs", token=employer, body={
    "title": f"QA Automation Engineer {suffix}", "description": "Own the test pyramid end to end.",
    "location": "Remote", "categoryId": cat_id, "salaryMin": 12000, "salaryMax": 18000,
    "experienceMin": 2, "skills": ["Python", "Docker", "Git"], "employmentType": "full_time",
    "workMode": "remote", "deadline": "2026-12-01T00:00:00Z"})
check("employer creates job", status == 201, f"-> {status} {created if status != 201 else ''}")
new_job_id = created.get("id") if isinstance(created, dict) else None
check("new job enters pending moderation",
      isinstance(created, dict) and created.get("status") == "pending")
check("pending job hidden from public search",
      all(j["id"] != new_job_id for j in call("GET", "/api/jobs?pageSize=100")[1]["items"]))

status, pending = call("GET", "/api/jobs/admin/pending", token=admin)
check("admin sees pending queue", status == 200 and any(j["id"] == new_job_id for j in pending))
status, moderated = call("PATCH", f"/api/jobs/{new_job_id}/status", token=admin, body={"status": "approved"})
check("admin approves job", status == 200 and moderated["status"] == "approved")
check("approved job now public",
      any(j["id"] == new_job_id for j in call("GET", "/api/jobs?pageSize=100")[1]["items"]))
status, moderated = call("PATCH", f"/api/jobs/{new_job_id}/status", token=admin,
                         body={"status": "rejected", "rejectionReason": "Duplicate listing"})
check("admin rejects with reason",
      status == 200 and moderated["status"] == "rejected"
      and moderated["rejectionReason"] == "Duplicate listing")
check("employer cannot approve own job",
      call("PATCH", f"/api/jobs/{new_job_id}/status", token=employer, body={"status": "approved"})[0] == 403)
check("employer cannot edit another employer's job",
      call("PUT", f"/api/jobs/{job_id}", token=employer, body={"title": "Hijacked"})[0] == 403)
check("seeker cannot post a job",
      call("POST", "/api/jobs", token=seeker, body={"title": "x", "description": "y", "location": "z"})[0] == 403)
check("employer can close own job",
      call("DELETE", f"/api/jobs/{new_job_id}", token=employer)[0] == 200)

head("taxonomy administration")
status, created_cat = call("POST", "/api/categories", token=admin,
                           body={"name": f"Legal {suffix}", "description": "Compliance roles"})
check("admin creates category", status == 201, f"-> {status} {created_cat if status != 201 else ''}")
new_cat_id = created_cat.get("id") if isinstance(created_cat, dict) else None
check("category slug generated",
      isinstance(created_cat, dict) and created_cat.get("slug", "").startswith("legal"))
check("duplicate category rejected",
      call("POST", "/api/categories", token=admin, body={"name": f"Legal {suffix}"})[0] == 409)
check("non-admin cannot create category",
      call("POST", "/api/categories", token=employer, body={"name": f"Sneaky {suffix}"})[0] == 403)
check("admin deletes unused category",
      call("DELETE", f"/api/categories/{new_cat_id}", token=admin)[0] == 200)
first_id = call("GET", "/api/categories")[1][0]["id"]
status, result = call("DELETE", f"/api/categories/{first_id}", token=admin)
check("in-use category deactivated instead of deleted",
      status == 200 and "deactivated" in result.get("detail", ""), f"-> {result}")
status, skills = call("GET", "/api/skills")
check("skills listed", status == 200 and len(skills) > 0, f"-> {len(skills)} skills")
check("admin creates skill",
      call("POST", "/api/skills", token=admin, body={"name": f"Skill {suffix}"})[0] == 201)

head("admin user management")
status, users = call("GET", "/api/users?role=job_seeker&pageSize=100", token=admin)
check("admin lists users", status == 200 and users["total"] > 0, f"-> {users['total']} seekers")
victim = [u for u in users["items"] if u["email"] != "aarav@example.com"][0]
status, blocked = call("PATCH", f"/api/users/{victim['id']}/block?blocked=true", token=admin)
check("admin blocks a user", status == 200 and blocked["isActive"] is False)
check("blocked user cannot log in",
      call("POST", "/api/auth/login", body={"email": victim["email"], "password": "Password123"})[0] == 403)
status, unblocked = call("PATCH", f"/api/users/{victim['id']}/block?blocked=false", token=admin)
check("admin unblocks a user", status == 200 and unblocked["isActive"] is True)
admin_id = call("GET", "/api/auth/me", token=admin)[1]["id"]
check("admin cannot block another admin",
      call("PATCH", f"/api/users/{admin_id}/block", token=admin)[0] == 400)

head("employer approval workflow")
new_employer_email = f"boss{suffix}@acme.example.com"
status, reg = call("POST", "/api/auth/register", body={
    "email": new_employer_email, "password": "Password123", "fullName": "Acme Boss",
    "role": "employer", "companyName": f"Acme Corp {suffix}"})
check("employer registration creates company", status == 201, f"-> {status} {reg if status != 201 else ''}")
new_employer_token = reg.get("access_token") if isinstance(reg, dict) else None
check("unapproved employer cannot post a job",
      call("POST", "/api/jobs", token=new_employer_token, body={
          "title": "Blocked", "description": "should fail", "location": "Remote"})[0] == 403)
status, pending_emp = call("GET", "/api/profiles/employers/pending", token=admin)
check("admin sees pending employers", status == 200 and len(pending_emp) >= 1, f"-> {len(pending_emp)}")
found = [e for e in pending_emp if e["user"]["email"] == new_employer_email]
if found:
    status, approved_emp = call("PATCH", f"/api/profiles/employers/{found[0]['id']}/approve?approved=true",
                                token=admin)
    check("admin approves employer", status == 200 and approved_emp["isApproved"] is True)
    check("approved employer can post a job",
          call("POST", "/api/jobs", token=new_employer_token, body={
              "title": f"Acme Role {suffix}", "description": "Now allowed to post.",
              "location": "Remote"})[0] == 201)

head("dashboards")
status, d = call("GET", "/api/dashboard/admin", token=admin)
check("admin dashboard totals", status == 200 and d["totals"]["jobs"] > 0, f"-> {d['totals']}")
check("admin dashboard breakdowns",
      bool(d["jobsByCategory"]) and bool(d["applicationStatus"]) and len(d["topJobs"]) > 0)
check("non-admin blocked from admin dashboard",
      call("GET", "/api/dashboard/admin", token=employer)[0] == 403)
status, d = call("GET", "/api/dashboard/employer", token=employer)
check("employer dashboard", status == 200 and d["totals"]["jobs"] > 0, f"-> {d['totals']}")
check("non-employer blocked from employer dashboard",
      call("GET", "/api/dashboard/employer", token=seeker)[0] == 403)
status, d = call("GET", "/api/dashboard/job-seeker", token=seeker)
check("seeker dashboard", status == 200 and d["totals"]["applications"] > 0, f"-> {d['totals']}")
check("seeker profile completeness computed", 0 <= d["profile"]["completeness"] <= 100,
      f"-> {d['profile']['completeness']}%")
status, recs = call("GET", "/api/jobs/recommended?limit=3", token=seeker)
check("AI recommendations ranked", status == 200 and len(recs) > 0,
      f"-> top {recs[0]['matchScore'] if recs else 'n/a'}")
check("recommendations include matched skills",
      bool(recs) and isinstance(recs[0]["matchedSkills"], list))
check("employer cannot request seeker recommendations",
      call("GET", "/api/jobs/recommended", token=employer)[0] == 403)

head("reports and exports")
status, idx = call("GET", "/api/reports", token=admin)
check("admin report index includes users report", status == 200 and "users" in idx["availableReports"])
status, idx = call("GET", "/api/reports", token=employer)
check("employer report index omits users report", status == 200 and "users" not in idx["availableReports"])
status, data = call("GET", "/api/reports/jobs?fmt=json", token=admin)
check("jobs report json", status == 200 and bool(data["columns"]) and bool(data["rows"]))
status, blob = call("GET", "/api/reports/jobs?fmt=xlsx", token=employer)
check("jobs report xlsx", status == 200 and isinstance(blob, bytes) and blob[:2] == b"PK",
      f"-> {len(blob)} bytes")
status, blob = call("GET", "/api/reports/applications?fmt=pdf", token=employer)
check("applications report pdf", status == 200 and blob[:5] == b"%PDF-", f"-> {len(blob)} bytes")
check("employer denied users report", call("GET", "/api/reports/users?fmt=pdf", token=employer)[0] == 403)
check("unknown report scope -> 404", call("GET", "/api/reports/nonsense", token=admin)[0] == 404)

head("job alerts")
status, alert = call("POST", "/api/job-alerts", token=seeker,
                     body={"keywords": "python", "location": "Bengaluru", "frequency": "daily"})
check("create job alert", status == 201, f"-> {status} {alert if status != 201 else ''}")
alert_id = alert.get("id") if isinstance(alert, dict) else None
check("list job alerts", call("GET", "/api/job-alerts", token=seeker)[0] == 200)
check("update job alert", call("PATCH", f"/api/job-alerts/{alert_id}", token=seeker,
                               body={"keywords": "python fastapi", "frequency": "weekly"})[0] == 200)
check("delete job alert", call("DELETE", f"/api/job-alerts/{alert_id}", token=seeker)[0] == 200)

head("notifications")
check("notification list", call("GET", "/api/notifications", token=seeker)[0] == 200)
check("unread count endpoint", call("GET", "/api/notifications/unread-count", token=seeker)[0] == 200)
check("mark all read", call("PATCH", "/api/notifications/read-all", token=seeker)[0] == 200)
status, count = call("GET", "/api/notifications/unread-count", token=seeker)
check("unread count is zero after read-all", count["count"] == 0, f"-> {count}")
status, notifs = call("GET", "/api/notifications", token=seeker)
if notifs:
    check("mark single notification read",
          call("PATCH", f"/api/notifications/{notifs[0]['id']}/read", token=seeker)[0] == 200)
    check("delete notification",
          call("DELETE", f"/api/notifications/{notifs[0]['id']}", token=seeker)[0] == 200)

head("security checks")
check("no token -> 401", call("GET", "/api/applications/me")[0] == 401)
check("garbage token -> 401", call("GET", "/api/applications/me", token="not.a.jwt")[0] == 401)
check("seeker blocked from employer applicant list", call("GET", "/api/applications", token=seeker)[0] == 403)
check("employer blocked from seeker dashboard",
      call("GET", "/api/dashboard/job-seeker", token=employer)[0] == 403)
check("admin blocked from seeker-only alert creation",
      call("POST", "/api/job-alerts", token=admin, body={"keywords": "x"})[0] == 403)
status, data = call("GET", "/api/jobs?q=%27%29%3B%20DROP%20TABLE%20users%3B--")
check("regex/injection-style query handled safely", status == 200 and data["total"] == 0,
      f"-> {status} {data.get('total') if isinstance(data, dict) else data}")
status, data = call("GET", "/api/jobs?q=.%2A")
check("wildcard-style query treated literally", status == 200 and data["total"] == 0, f"-> {data.get('total')}")
status, users_after = call("GET", "/api/users?pageSize=1", token=admin)
check("user collection intact after injection attempt",
      status == 200 and users_after["total"] > 0)
check("oversized page size rejected", call("GET", "/api/jobs?pageSize=9999")[0] == 422)

print(f"\n{'#' * 50}")
if failures:
    print(f"FAILURES ({len(failures)}):")
    for f in failures:
        print("  -", f)
else:
    print("ALL CHECKS PASSED")
print("#" * 50)
