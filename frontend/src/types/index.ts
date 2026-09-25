export type Role = "job_seeker" | "employer" | "admin";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isVerified: boolean;
  isActive: boolean;
  avatarUrl?: string | null;
  createdAt: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  industry?: string | null;
  location?: string | null;
  size?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  description?: string | null;
  isVerified: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  isActive: boolean;
}

export interface Skill {
  id: string;
  name: string;
  category?: string | null;
}

export type JobStatus = "pending" | "approved" | "rejected" | "closed" | "draft";

export interface Job {
  id: string;
  title: string;
  description: string;
  requirements?: string | null;
  responsibilities?: string | null;
  location: string;
  employmentType: string;
  workMode: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency: string;
  experienceMin?: number | null;
  experienceMax?: number | null;
  skills: string[];
  vacancies: number;
  status: JobStatus;
  rejectionReason?: string | null;
  deadline?: string | null;
  views: number;
  createdAt: string;
  company?: Company | null;
  category?: Category | null;
}

export interface RecommendedJob {
  job: Job;
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
}

export interface JobSeeker {
  id: string;
  userId: string;
  headline?: string | null;
  summary?: string | null;
  location?: string | null;
  education?: string | null;
  experienceYears?: number | null;
  skills: string[];
  resumeUrl?: string | null;
  profileVisible: boolean;
  user?: User | null;
}

export interface Employer {
  id: string;
  userId: string;
  companyId?: string | null;
  designation?: string | null;
  isApproved: boolean;
  company?: Company | null;
  user?: User;
}

export type ApplicationStatus =
  | "applied"
  | "under_review"
  | "shortlisted"
  | "interview"
  | "hired"
  | "rejected"
  | "withdrawn";

export interface Application {
  id: string;
  jobId: string;
  jobSeekerId: string;
  resumeId?: string | null;
  status: ApplicationStatus;
  matchScore?: number | null;
  coverLetter?: string | null;
  employerNotes?: string | null;
  createdAt: string;
  job?: Job | null;
  jobSeeker?: JobSeeker | null;
}

export interface Interview {
  id: string;
  applicationId: string;
  jobId: string;
  scheduledAt: string;
  mode: string;
  meetingLink?: string | null;
  location?: string | null;
  notes?: string | null;
  status: string;
  job?: Job | null;
}

export interface Resume {
  id: string;
  jobSeekerId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  parsedSkills: string[];
  isPrimary: boolean;
  createdAt: string;
}

export interface SavedJob {
  id: string;
  jobId: string;
  createdAt: string;
  job?: Job | null;
}

export interface JobAlert {
  id: string;
  keywords?: string | null;
  location?: string | null;
  categoryId?: string | null;
  employmentType?: string | null;
  frequency: string;
  isActive: boolean;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link?: string | null;
  createdAt: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface AdminDashboard {
  totals: Record<string, number>;
  applicationStatus: Record<string, number>;
  jobsByCategory: Record<string, number>;
  jobsByLocation: Record<string, number>;
  topJobs: { title: string; applications: number }[];
  newUsersLast30Days: number;
}

export interface EmployerDashboard {
  company?: Company | null;
  isApproved?: boolean;
  totals: Record<string, number>;
  applicationStatus: Record<string, number>;
  topJobs: { title: string; applications: number; views: number; status: string }[];
}

export interface SeekerDashboard {
  profile: {
    id: string;
    headline?: string | null;
    location?: string | null;
    skills: string[];
    experienceYears?: number | null;
    completeness: number;
  };
  totals: Record<string, number>;
  applicationStatus: Record<string, number>;
  recentApplications: {
    id: string;
    status: ApplicationStatus;
    matchScore?: number | null;
    appliedAt: string;
    jobId: string;
    jobTitle?: string | null;
    company?: string | null;
  }[];
  upcomingInterviews: {
    id: string;
    scheduledAt: string;
    mode: string;
    jobTitle?: string | null;
    status: string;
  }[];
}

export interface ReportTable {
  title: string;
  columns: string[];
  rows: (string | number)[][];
  summary: Record<string, string | number>;
}
