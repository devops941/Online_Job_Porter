import { Badge } from "@/components/ui/badge";
import { titleCase } from "@/lib/utils";
import type { ApplicationStatus, JobStatus } from "@/types";

const APPLICATION_VARIANTS: Record<ApplicationStatus, "default" | "secondary" | "success" | "warning" | "destructive" | "info" | "outline"> = {
  applied: "info",
  under_review: "warning",
  shortlisted: "default",
  interview: "default",
  hired: "success",
  rejected: "destructive",
  withdrawn: "secondary",
};

const JOB_VARIANTS: Record<JobStatus, "default" | "secondary" | "success" | "warning" | "destructive" | "outline"> = {
  approved: "success",
  pending: "warning",
  rejected: "destructive",
  closed: "secondary",
  draft: "outline",
};

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return <Badge variant={APPLICATION_VARIANTS[status] ?? "secondary"}>{titleCase(status)}</Badge>;
}

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return <Badge variant={JOB_VARIANTS[status] ?? "secondary"}>{titleCase(status)}</Badge>;
}

export function MatchScoreBadge({ score }: { score?: number | null }) {
  if (score === null || score === undefined) return <Badge variant="outline">No score</Badge>;
  const variant = score >= 70 ? "success" : score >= 45 ? "warning" : "secondary";
  return <Badge variant={variant}>{score.toFixed(0)}% match</Badge>;
}
