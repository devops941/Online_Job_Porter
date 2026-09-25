import { api } from "./api";
import type {
  AdminDashboard,
  Application,
  ApplicationStatus,
  AuthResponse,
  Category,
  Company,
  Employer,
  EmployerDashboard,
  Interview,
  Job,
  JobAlert,
  JobSeeker,
  Notification,
  Page,
  RecommendedJob,
  ReportTable,
  Resume,
  Role,
  SavedJob,
  SeekerDashboard,
  Skill,
  User,
} from "@/types";

export interface JobQuery {
  q?: string;
  location?: string;
  categoryId?: string;
  companyId?: string;
  employmentType?: string;
  workMode?: string;
  experienceMax?: number;
  salaryMin?: number;
  skills?: string[];
  sort?: string;
  page?: number;
  pageSize?: number;
}

export const authApi = {
  async register(payload: {
    email: string;
    password: string;
    fullName: string;
    role: Role;
    companyName?: string;
  }) {
    const { data } = await api.post<AuthResponse>("/api/auth/register", payload);
    return data;
  },
  async login(email: string, password: string) {
    const { data } = await api.post<AuthResponse>("/api/auth/login", { email, password });
    return data;
  },
  async me() {
    const { data } = await api.get<User>("/api/auth/me");
    return data;
  },
  async verifyEmail(token: string) {
    const { data } = await api.post<{ detail: string }>("/api/auth/verify-email", { token });
    return data;
  },
  async resendVerification() {
    const { data } = await api.post<{ detail: string }>("/api/auth/resend-verification");
    return data;
  },
  async forgotPassword(email: string) {
    const { data } = await api.post<{ detail: string }>("/api/auth/forgot-password", { email });
    return data;
  },
  async resetPassword(token: string, newPassword: string) {
    const { data } = await api.post<{ detail: string }>("/api/auth/reset-password", {
      token,
      newPassword,
    });
    return data;
  },
  async changePassword(currentPassword: string, newPassword: string) {
    const { data } = await api.post<{ detail: string }>("/api/auth/change-password", {
      currentPassword,
      newPassword,
    });
    return data;
  },
};

export const userApi = {
  async updateMe(payload: Partial<Pick<User, "fullName" | "avatarUrl">>) {
    const { data } = await api.patch<User>("/api/users/me", payload);
    return data;
  },
  async list(params: { q?: string; role?: Role; page?: number; pageSize?: number } = {}) {
    const { data } = await api.get<Page<User>>("/api/users", { params });
    return data;
  },
  async setBlocked(userId: string, blocked: boolean) {
    const { data } = await api.patch<User>(`/api/users/${userId}/block`, null, {
      params: { blocked },
    });
    return data;
  },
  async remove(userId: string) {
    const { data } = await api.delete<{ detail: string }>(`/api/users/${userId}`);
    return data;
  },
};

export const taxonomyApi = {
  async categories(activeOnly = true) {
    const { data } = await api.get<Category[]>("/api/categories", { params: { activeOnly } });
    return data;
  },
  async createCategory(payload: { name: string; description?: string }) {
    const { data } = await api.post<Category>("/api/categories", payload);
    return data;
  },
  async updateCategory(id: string, payload: { name?: string; description?: string; isActive?: boolean }) {
    const { data } = await api.put<Category>(`/api/categories/${id}`, payload);
    return data;
  },
  async deleteCategory(id: string) {
    const { data } = await api.delete<{ detail: string }>(`/api/categories/${id}`);
    return data;
  },
  async skills(q?: string) {
    const { data } = await api.get<Skill[]>("/api/skills", { params: { q } });
    return data;
  },
  async createSkill(payload: { name: string; category?: string }) {
    const { data } = await api.post<Skill>("/api/skills", payload);
    return data;
  },
  async deleteSkill(id: string) {
    const { data } = await api.delete<{ detail: string }>(`/api/skills/${id}`);
    return data;
  },
};

export const jobApi = {
  async search(query: JobQuery = {}) {
    const { data } = await api.get<Page<Job>>("/api/jobs", {
      params: { ...query, skills: query.skills?.length ? query.skills : undefined },
      paramsSerializer: {
        indexes: null,
      },
    });
    return data;
  },
  async detail(jobId: string) {
    const { data } = await api.get<Job>(`/api/jobs/${jobId}`);
    return data;
  },
  async recommended(limit = 6) {
    const { data } = await api.get<RecommendedJob[]>("/api/jobs/recommended", {
      params: { limit },
    });
    return data;
  },
  async mine(params: { status?: string; page?: number; pageSize?: number } = {}) {
    const { data } = await api.get<Page<Job>>("/api/jobs/mine", { params });
    return data;
  },
  async pending() {
    const { data } = await api.get<Job[]>("/api/jobs/admin/pending");
    return data;
  },
  async create(payload: Record<string, unknown>) {
    const { data } = await api.post<Job>("/api/jobs", payload);
    return data;
  },
  async update(jobId: string, payload: Record<string, unknown>) {
    const { data } = await api.put<Job>(`/api/jobs/${jobId}`, payload);
    return data;
  },
  async moderate(jobId: string, status: "approved" | "rejected", rejectionReason?: string) {
    const { data } = await api.patch<Job>(`/api/jobs/${jobId}/status`, {
      status,
      rejectionReason,
    });
    return data;
  },
  async close(jobId: string) {
    const { data } = await api.delete<{ detail: string }>(`/api/jobs/${jobId}`);
    return data;
  },
};

export const savedJobApi = {
  async list(page = 1, pageSize = 12) {
    const { data } = await api.get<Page<SavedJob>>("/api/saved-jobs", {
      params: { page, pageSize },
    });
    return data;
  },
  async save(jobId: string) {
    const { data } = await api.post<SavedJob>(`/api/saved-jobs/${jobId}`);
    return data;
  },
  async remove(jobId: string) {
    const { data } = await api.delete<{ detail: string }>(`/api/saved-jobs/${jobId}`);
    return data;
  },
};

export const profileApi = {
  async seekerMe() {
    const { data } = await api.get<JobSeeker>("/api/profiles/job-seeker/me");
    return data;
  },
  async updateSeekerMe(payload: Partial<JobSeeker>) {
    const { data } = await api.put<JobSeeker>("/api/profiles/job-seeker/me", payload);
    return data;
  },
  async seeker(seekerId: string) {
    const { data } = await api.get<JobSeeker>(`/api/profiles/job-seeker/${seekerId}`);
    return data;
  },
  async employerMe() {
    const { data } = await api.get<Employer>("/api/profiles/employer/me");
    return data;
  },
  async updateEmployerMe(payload: {
    designation?: string;
    company?: Partial<Company> & { name: string };
  }) {
    const { data } = await api.put<Employer>("/api/profiles/employer/me", payload);
    return data;
  },
  async companies(q?: string) {
    const { data } = await api.get<Company[]>("/api/profiles/companies", { params: { q } });
    return data;
  },
  async company(companyId: string) {
    const { data } = await api.get<Company & { openJobs: number }>(
      `/api/profiles/companies/${companyId}`,
    );
    return data;
  },
  async pendingEmployers() {
    const { data } = await api.get<Employer[]>("/api/profiles/employers/pending");
    return data;
  },
  async employers(approved?: boolean) {
    const { data } = await api.get<Employer[]>("/api/profiles/employers", {
      params: { approved },
    });
    return data;
  },
  async approveEmployer(employerId: string, approved = true) {
    const { data } = await api.patch<Employer>(`/api/profiles/employers/${employerId}/approve`, null, {
      params: { approved },
    });
    return data;
  },
};

export const resumeApi = {
  async list() {
    const { data } = await api.get<Resume[]>("/api/resumes");
    return data;
  },
  async upload(file: File) {
    const form = new FormData();
    form.append("file", file);
    const { data } = await api.post<Resume>("/api/resumes/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
  async setPrimary(resumeId: string) {
    const { data } = await api.patch<Resume>(`/api/resumes/${resumeId}/primary`);
    return data;
  },
  async remove(resumeId: string) {
    const { data } = await api.delete<{ detail: string }>(`/api/resumes/${resumeId}`);
    return data;
  },
  async download(resumeId: string) {
    const { data } = await api.get<Blob>(`/api/resumes/${resumeId}/download`, {
      responseType: "blob",
    });
    return data;
  },
};

export const applicationApi = {
  async apply(payload: { jobId: string; resumeId?: string; coverLetter?: string }) {
    const { data } = await api.post<Application>("/api/applications", payload);
    return data;
  },
  async mine(params: { status?: ApplicationStatus; page?: number; pageSize?: number } = {}) {
    const { data } = await api.get<Page<Application>>("/api/applications/me", { params });
    return data;
  },
  async received(params: {
    jobId?: string;
    status?: ApplicationStatus;
    page?: number;
    pageSize?: number;
  } = {}) {
    const { data } = await api.get<Page<Application>>("/api/applications", { params });
    return data;
  },
  async detail(applicationId: string) {
    const { data } = await api.get<Application>(`/api/applications/${applicationId}`);
    return data;
  },
  async withdraw(applicationId: string) {
    const { data } = await api.patch<Application>(`/api/applications/${applicationId}/withdraw`);
    return data;
  },
  async setStatus(applicationId: string, status: ApplicationStatus, employerNotes?: string) {
    const { data } = await api.patch<Application>(`/api/applications/${applicationId}/status`, {
      status,
      employerNotes,
    });
    return data;
  },
};

export const interviewApi = {
  async schedule(payload: {
    applicationId: string;
    scheduledAt: string;
    mode: string;
    meetingLink?: string;
    location?: string;
    notes?: string;
  }) {
    const { data } = await api.post<Interview>("/api/interviews", payload);
    return data;
  },
  async received() {
    const { data } = await api.get<Interview[]>("/api/interviews");
    return data;
  },
  async mine() {
    const { data } = await api.get<Interview[]>("/api/interviews/me");
    return data;
  },
  async update(interviewId: string, payload: Record<string, unknown>) {
    const { data } = await api.patch<Interview>(`/api/interviews/${interviewId}`, payload);
    return data;
  },
};

export const notificationApi = {
  async list(unreadOnly = false) {
    const { data } = await api.get<Notification[]>("/api/notifications", {
      params: { unreadOnly },
    });
    return data;
  },
  async unreadCount() {
    const { data } = await api.get<{ count: number }>("/api/notifications/unread-count");
    return data.count;
  },
  async markRead(notificationId: string) {
    const { data } = await api.patch<Notification>(`/api/notifications/${notificationId}/read`);
    return data;
  },
  async markAllRead() {
    const { data } = await api.patch<{ detail: string }>("/api/notifications/read-all");
    return data;
  },
  async remove(notificationId: string) {
    const { data } = await api.delete<{ detail: string }>(`/api/notifications/${notificationId}`);
    return data;
  },
};

export const alertApi = {
  async list() {
    const { data } = await api.get<JobAlert[]>("/api/job-alerts");
    return data;
  },
  async create(payload: {
    keywords?: string;
    location?: string;
    categoryId?: string;
    employmentType?: string;
    frequency?: string;
  }) {
    const { data } = await api.post<JobAlert>("/api/job-alerts", payload);
    return data;
  },
  async update(alertId: string, payload: Partial<JobAlert>) {
    const { data } = await api.patch<JobAlert>(`/api/job-alerts/${alertId}`, payload);
    return data;
  },
  async remove(alertId: string) {
    const { data } = await api.delete<{ detail: string }>(`/api/job-alerts/${alertId}`);
    return data;
  },
};

export const dashboardApi = {
  async admin() {
    const { data } = await api.get<AdminDashboard>("/api/dashboard/admin");
    return data;
  },
  async employer() {
    const { data } = await api.get<EmployerDashboard>("/api/dashboard/employer");
    return data;
  },
  async jobSeeker() {
    const { data } = await api.get<SeekerDashboard>("/api/dashboard/job-seeker");
    return data;
  },
};

export const reportApi = {
  async index() {
    const { data } = await api.get<{ availableReports: string[] }>("/api/reports");
    return data;
  },
  async table(scope: string) {
    const { data } = await api.get<ReportTable>(`/api/reports/${scope}`, {
      params: { fmt: "json" },
    });
    return data;
  },
  async download(scope: string, format: "xlsx" | "pdf") {
    const { data, headers } = await api.get<Blob>(`/api/reports/${scope}`, {
      params: { fmt: format },
      responseType: "blob",
    });
    const disposition = (headers["content-disposition"] as string | undefined) ?? "";
    const match = /filename="?([^"]+)"?/.exec(disposition);
    return { blob: data, fileName: match?.[1] ?? `${scope}-report.${format}` };
  },
};

export function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
