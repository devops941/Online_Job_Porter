import { Link } from "react-router-dom";
import { Bookmark, BookmarkCheck, Building2, MapPin, Clock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SkillChips } from "@/components/shared/page-parts";
import { MatchScoreBadge } from "@/components/shared/status-badges";
import { formatSalary, timeAgo, titleCase } from "@/lib/utils";
import type { Job } from "@/types";

interface JobListItemProps {
  job: Job;
  saved?: boolean;
  onToggleSave?: (job: Job) => void;
  savingDisabled?: boolean;
  showMatch?: boolean;
}

export function JobListItem({
  job,
  saved,
  onToggleSave,
  savingDisabled,
  showMatch,
}: JobListItemProps) {
  const showMatchBadge = showMatch && job.matchScore != null;
  const showMatchedSkills = showMatch && job.matchedSkills && job.matchedSkills.length > 0;

  return (
    <div className="flex items-start gap-4 rounded-lg border bg-card px-4 py-4 transition-colors hover:bg-muted/40 sm:px-5 sm:py-5">
      {/* Company logo avatar */}
      <div className="hidden shrink-0 sm:block">
        {job.company?.logoUrl ? (
          <img
            src={job.company.logoUrl}
            alt={job.company.name}
            className="h-11 w-11 rounded border object-contain bg-muted p-0.5"
          />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded border bg-muted">
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Middle: main content */}
      <div className="min-w-0 flex-1 space-y-1.5">
        {/* Job title */}
        <Link
          to={`/jobs/${job.id}`}
          className="block text-sm font-semibold leading-snug hover:text-primary"
        >
          {job.title}
        </Link>

        {/* Meta line */}
        <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Building2 className="h-3 w-3 shrink-0" />
            {job.company?.name ?? "Confidential"}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" />
            {job.location}
          </span>
          {job.employmentType ? (
            <span>{titleCase(job.employmentType)}</span>
          ) : null}
          {job.workMode ? (
            <span>{titleCase(job.workMode)}</span>
          ) : null}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3 shrink-0" />
            {timeAgo(job.createdAt)}
          </span>
        </p>

        {/* Description */}
        {job.description ? (
          <p className="line-clamp-1 text-xs text-muted-foreground">{job.description}</p>
        ) : null}

        {/* Skills */}
        {job.skills?.length ? <SkillChips skills={job.skills} limit={5} /> : null}

        {/* Matched skills hint */}
        {showMatchedSkills ? (
          <p className="text-xs text-emerald-600 dark:text-emerald-400">
            Matches your skills: {job.matchedSkills!.slice(0, 5).join(", ")}
          </p>
        ) : null}

        {/* Category badge (mobile-friendly fallback) */}
        {job.category ? (
          <Badge variant="info" className="text-[11px] sm:hidden">
            {job.category.name}
          </Badge>
        ) : null}
      </div>

      {/* Right: salary, match, actions */}
      <div className="flex shrink-0 flex-col items-end gap-2 text-right">
        <span className="text-sm font-medium text-foreground tabular-nums">
          {formatSalary(job.salaryMin, job.salaryMax, job.currency)}
        </span>

        {showMatchBadge ? <MatchScoreBadge score={job.matchScore} /> : null}

        <div className="flex items-center gap-1">
          {onToggleSave ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={savingDisabled}
              aria-label={saved ? "Remove from saved jobs" : "Save job"}
              onClick={() => onToggleSave(job)}
            >
              {saved ? (
                <BookmarkCheck className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Bookmark className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </Button>
          ) : null}
          <Button variant="outline" size="sm" className="h-7 px-3 text-xs" asChild>
            <Link to={`/jobs/${job.id}`}>
              <ExternalLink className="h-3 w-3" />
              View
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function JobListItemSkeleton() {
  return (
    <div className="flex items-start gap-4 rounded-lg border bg-card px-4 py-4 sm:px-5 sm:py-5">
      <Skeleton className="hidden h-11 w-11 shrink-0 rounded sm:block" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-full" />
        <div className="flex gap-1">
          <Skeleton className="h-5 w-14 rounded" />
          <Skeleton className="h-5 w-16 rounded" />
          <Skeleton className="h-5 w-12 rounded" />
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-7 w-16 rounded" />
      </div>
    </div>
  );
}
