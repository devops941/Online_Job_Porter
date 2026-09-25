import { Link } from "react-router-dom";
import { Bookmark, BookmarkCheck, Briefcase, MapPin, Clock, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SkillChips } from "@/components/shared/page-parts";
import { MatchScoreBadge } from "@/components/shared/status-badges";
import { formatSalary, timeAgo, titleCase } from "@/lib/utils";
import type { Job, RecommendedJob } from "@/types";

interface JobCardProps {
  job: Job;
  match?: Pick<RecommendedJob, "matchScore" | "matchedSkills" | "missingSkills">;
  saved?: boolean;
  onToggleSave?: (job: Job) => void;
  savingDisabled?: boolean;
}

export function JobCard({ job, match, saved, onToggleSave, savingDisabled }: JobCardProps) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <Link
              to={`/jobs/${job.id}`}
              className="line-clamp-1 font-semibold hover:text-primary hover:underline"
            >
              {job.title}
            </Link>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {job.company?.name ?? "Confidential"}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {job.location}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {timeAgo(job.createdAt)}
              </span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {match ? <MatchScoreBadge score={match.matchScore} /> : null}
            {onToggleSave ? (
              <Button
                variant="ghost"
                size="icon"
                disabled={savingDisabled}
                aria-label={saved ? "Remove from saved jobs" : "Save job"}
                onClick={() => onToggleSave(job)}
              >
                {saved ? (
                  <BookmarkCheck className="h-4 w-4 text-primary" />
                ) : (
                  <Bookmark className="h-4 w-4" />
                )}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{titleCase(job.employmentType)}</Badge>
          <Badge variant="secondary">{titleCase(job.workMode)}</Badge>
          {job.category ? <Badge variant="info">{job.category.name}</Badge> : null}
          <span className="text-sm font-medium">
            {formatSalary(job.salaryMin, job.salaryMax, job.currency)}
          </span>
        </div>

        <p className="line-clamp-2 text-sm text-muted-foreground">{job.description}</p>

        {job.skills?.length ? <SkillChips skills={job.skills} limit={6} /> : null}

        {match?.matchedSkills?.length ? (
          <p className="text-xs text-emerald-600 dark:text-emerald-400">
            Matches your skills: {match.matchedSkills.slice(0, 5).join(", ")}
          </p>
        ) : null}

        <div className="flex items-center justify-between pt-1">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Briefcase className="h-3.5 w-3.5" />
            {job.vacancies} {job.vacancies === 1 ? "opening" : "openings"}
          </span>
          <Button size="sm" variant="outline" asChild>
            <Link to={`/jobs/${job.id}`}>View details</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
