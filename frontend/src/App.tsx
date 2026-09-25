import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { RedirectIfAuthed, RequireAuth } from "@/components/shared/route-guards";
import { Skeleton } from "@/components/ui/skeleton";

const LandingPage = lazy(() => import("@/pages/public/landing-page"));
const JobsPage = lazy(() => import("@/pages/public/jobs-page"));
const JobDetailPage = lazy(() => import("@/pages/public/job-detail-page"));
const CompaniesPage = lazy(() => import("@/pages/public/companies-page"));
const LoginPage = lazy(() => import("@/pages/public/login-page"));
const RegisterPage = lazy(() => import("@/pages/public/register-page"));
const ForgotPasswordPage = lazy(() => import("@/pages/public/forgot-password-page"));
const ResetPasswordPage = lazy(() => import("@/pages/public/reset-password-page"));
const VerifyEmailPage = lazy(() => import("@/pages/public/verify-email-page"));
const NotificationsPage = lazy(() => import("@/pages/public/notifications-page"));
const ProfilePage = lazy(() => import("@/pages/public/profile-page"));
const NotFoundPage = lazy(() => import("@/pages/public/not-found-page"));

const JobSeekerDashboard = lazy(() => import("@/pages/jobseeker/dashboard-page"));
const SeekerApplicationsPage = lazy(() => import("@/pages/jobseeker/applications-page"));
const SavedJobsPage = lazy(() => import("@/pages/jobseeker/saved-jobs-page"));
const SeekerInterviewsPage = lazy(() => import("@/pages/jobseeker/interviews-page"));
const ResumesPage = lazy(() => import("@/pages/jobseeker/resumes-page"));
const JobAlertsPage = lazy(() => import("@/pages/jobseeker/alerts-page"));

const EmployerDashboard = lazy(() => import("@/pages/employer/dashboard-page"));
const EmployerJobsPage = lazy(() => import("@/pages/employer/jobs-page"));
const EmployerApplicantsPage = lazy(() => import("@/pages/employer/applicants-page"));
const EmployerInterviewsPage = lazy(() => import("@/pages/employer/interviews-page"));
const EmployerReportsPage = lazy(() => import("@/pages/employer/reports-page"));

const AdminDashboard = lazy(() => import("@/pages/admin/dashboard-page"));
const AdminModerationPage = lazy(() => import("@/pages/admin/moderation-page"));
const AdminEmployersPage = lazy(() => import("@/pages/admin/employers-page"));
const AdminUsersPage = lazy(() => import("@/pages/admin/users-page"));
const AdminTaxonomyPage = lazy(() => import("@/pages/admin/taxonomy-page"));
const AdminReportsPage = lazy(() => import("@/pages/admin/reports-page"));

function RouteFallback() {
  return (
    <div className="container space-y-4 py-10">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/jobs/:jobId" element={<JobDetailPage />} />
          <Route path="/companies" element={<CompaniesPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />

          {/* Auth screens — hidden from already signed-in users */}
          <Route element={<RedirectIfAuthed />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Shared authenticated screens */}
          <Route element={<RequireAuth />}>
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          {/* Job seeker */}
          <Route element={<RequireAuth roles={["job_seeker"]} />}>
            <Route path="/job-seeker" element={<JobSeekerDashboard />} />
            <Route path="/job-seeker/applications" element={<SeekerApplicationsPage />} />
            <Route path="/job-seeker/saved" element={<SavedJobsPage />} />
            <Route path="/job-seeker/interviews" element={<SeekerInterviewsPage />} />
            <Route path="/job-seeker/resumes" element={<ResumesPage />} />
            <Route path="/job-seeker/alerts" element={<JobAlertsPage />} />
          </Route>

          {/* Employer */}
          <Route element={<RequireAuth roles={["employer"]} />}>
            <Route path="/employer" element={<EmployerDashboard />} />
            <Route path="/employer/jobs" element={<EmployerJobsPage />} />
            <Route path="/employer/applicants" element={<EmployerApplicantsPage />} />
            <Route path="/employer/interviews" element={<EmployerInterviewsPage />} />
            <Route path="/employer/reports" element={<EmployerReportsPage />} />
          </Route>

          {/* Admin */}
          <Route element={<RequireAuth roles={["admin"]} />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/moderation" element={<AdminModerationPage />} />
            <Route path="/admin/employers" element={<AdminEmployersPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/taxonomy" element={<AdminTaxonomyPage />} />
            <Route path="/admin/reports" element={<AdminReportsPage />} />
          </Route>

          <Route path="/dashboard" element={<Navigate to="/profile" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
