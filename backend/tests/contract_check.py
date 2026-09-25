"""Verify the frontend API client contract against the live backend."""
import json
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:8000"


def req(method, path, token=None, body=None):
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(BASE + path, data=data, method=method)
    request.add_header("Content-Type", "application/json")
    if token:
        request.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            raw = response.read()
            try:
                return response.status, json.loads(raw)
            except Exception:
                return response.status, raw[:80]
    except urllib.error.HTTPError as error:
        raw = error.read()
        try:
            return error.code, json.loads(raw)
        except Exception:
            return error.code, raw[:200]


results = []


def check(label, condition, extra=""):
    results.append((label, condition, extra))


def login(email, password="Password123"):
    status, data = req("POST", "/api/auth/login", body={"email": email, "password": password})
    check(f"login {email}", status == 200 and "access_token" in data, str(status))
    return data.get("access_token")


admin = login("admin@jobportal.com")
employer = login("meera@novatech.example.com")
seeker = login("aarav@example.com")

status, data = req("GET", "/api/auth/me", seeker)
check(
    "GET /api/auth/me shape",
    status == 200
    and {"id", "email", "fullName", "role", "isVerified", "isActive", "createdAt"} <= set(data),
    str(sorted(data)[:12]),
)

status, data = req("GET", "/api/jobs?page=1&pageSize=9&sort=newest")
check(
    "GET /api/jobs paged envelope",
    status == 200 and {"items", "total", "page", "page_size", "pages"} <= set(data),
    str(list(data)[:8]),
)
job_id = data["items"][0]["id"] if data.get("items") else None

status, _ = req("GET", "/api/jobs?skills=Python&skills=MongoDB")
check("GET /api/jobs repeated skills param", status == 200, str(status))

status, data = req("GET", f"/api/jobs/{job_id}")
check("GET /api/jobs/{id} nested company+category", status == 200 and "company" in data and "category" in data, str(status))

status, data = req("GET", "/api/jobs/recommended?limit=4", seeker)
check(
    "GET /api/jobs/recommended shape",
    status == 200
    and isinstance(data, list)
    and (not data or {"job", "matchScore", "matchedSkills", "missingSkills"} <= set(data[0])),
    str(status),
)

status, data = req("GET", "/api/jobs/mine?page=1&pageSize=10", employer)
check("GET /api/jobs/mine", status == 200 and "items" in data, str(status))

status, data = req("GET", "/api/jobs/admin/pending", admin)
check("GET /api/jobs/admin/pending", status == 200 and isinstance(data, list), str(status))

status, data = req("GET", "/api/saved-jobs?page=1&pageSize=100", seeker)
check("GET /api/saved-jobs", status == 200 and "items" in data, str(status))

status, data = req("GET", "/api/profiles/job-seeker/me", seeker)
check(
    "GET /api/profiles/job-seeker/me",
    status == 200 and {"id", "userId", "skills", "profileVisible"} <= set(data),
    str(sorted(data)[:12]),
)

status, data = req("GET", "/api/profiles/employer/me", employer)
check(
    "GET /api/profiles/employer/me",
    status == 200 and {"id", "userId", "isApproved"} <= set(data),
    str(sorted(data)[:12]),
)

status, data = req("GET", "/api/profiles/companies?q=a")
check("GET /api/profiles/companies", status == 200 and isinstance(data, list), str(status))

status, data = req("GET", "/api/profiles/employers/pending", admin)
check("GET /api/profiles/employers/pending", status == 200 and isinstance(data, list), str(status))

status, data = req("GET", "/api/profiles/employers", admin)
check("GET /api/profiles/employers", status == 200 and isinstance(data, list), str(status))

status, data = req("GET", "/api/resumes", seeker)
check("GET /api/resumes", status == 200 and isinstance(data, list), str(status))

status, data = req("GET", "/api/applications/me?page=1&pageSize=10", seeker)
check("GET /api/applications/me", status == 200 and "items" in data, str(status))

status, data = req("GET", "/api/applications?page=1&pageSize=10", employer)
check("GET /api/applications (employer)", status == 200 and "items" in data, str(status))

status, data = req("GET", "/api/applications?page=1&pageSize=10", admin)
check("GET /api/applications (admin)", status == 200 and "items" in data, str(status))
if data.get("items"):
    check("application includes job/jobSeeker", "job" in data["items"][0], str(sorted(data["items"][0])[:14]))

status, data = req("GET", "/api/interviews/me", seeker)
check("GET /api/interviews/me", status == 200 and isinstance(data, list), str(status))

status, data = req("GET", "/api/interviews", employer)
check("GET /api/interviews (employer)", status == 200 and isinstance(data, list), str(status))

status, data = req("GET", "/api/notifications", seeker)
check("GET /api/notifications", status == 200 and isinstance(data, list), str(status))

status, data = req("GET", "/api/notifications/unread-count", seeker)
check("GET unread-count returns count", status == 200 and "count" in data, str(data))

status, data = req("GET", "/api/job-alerts", seeker)
check("GET /api/job-alerts", status == 200 and isinstance(data, list), str(status))

status, data = req("GET", "/api/categories?activeOnly=true")
check("GET /api/categories", status == 200 and isinstance(data, list), str(status))

status, data = req("GET", "/api/skills")
check("GET /api/skills", status == 200 and isinstance(data, list), str(status))

status, data = req("GET", "/api/dashboard/admin", admin)
check(
    "GET /api/dashboard/admin shape",
    status == 200
    and {"totals", "applicationStatus", "jobsByCategory", "jobsByLocation", "topJobs", "newUsersLast30Days"} <= set(data),
    str(sorted(data)[:8]),
)

status, data = req("GET", "/api/dashboard/employer", employer)
check(
    "GET /api/dashboard/employer shape",
    status == 200 and {"totals", "applicationStatus", "topJobs"} <= set(data),
    str(sorted(data)[:8]),
)

status, data = req("GET", "/api/dashboard/job-seeker", seeker)
check(
    "GET /api/dashboard/job-seeker shape",
    status == 200
    and {"profile", "totals", "applicationStatus", "recentApplications", "upcomingInterviews"} <= set(data),
    str(sorted(data)[:8]),
)

status, data = req("GET", "/api/reports", admin)
check("GET /api/reports index", status == 200 and "availableReports" in data, str(data))

for scope in ["jobs", "applications", "interviews", "hiring", "users"]:
    status, data = req("GET", f"/api/reports/{scope}?fmt=json", admin)
    check(
        f"GET /api/reports/{scope} json",
        status == 200 and {"title", "columns", "rows", "summary"} <= set(data),
        str(status),
    )

status, _ = req("GET", "/api/reports/jobs?fmt=xlsx", employer)
check("reports xlsx export", status == 200, str(status))

status, _ = req("GET", "/api/reports/jobs?fmt=pdf", employer)
check("reports pdf export", status == 200, str(status))

status, data = req("GET", "/api/users?page=1&pageSize=15", admin)
check("GET /api/users", status == 200 and "items" in data, str(status))

status, _ = req("GET", "/api/users?page=1&pageSize=15", seeker)
check("seeker blocked from /api/users", status == 403, str(status))

status, _ = req("GET", "/api/dashboard/admin", seeker)
check("seeker blocked from admin dashboard", status == 403, str(status))

status, _ = req("GET", "/api/jobs/mine", seeker)
check("seeker blocked from /api/jobs/mine", status == 403, str(status))

for label, ok, extra in results:
    print(("PASS " if ok else "FAIL ") + label + ("" if ok else f"  <- {extra}"))
failed = [entry for entry in results if not entry[1]]
print(f"\n{len(results) - len(failed)}/{len(results)} contract checks passed")
