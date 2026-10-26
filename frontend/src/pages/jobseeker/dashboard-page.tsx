import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Bookmark,
  CalendarClock,
  FileText,
  Gauge,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState, PageHeader, StatCard } from "@/components/shared/page-parts";
import {
  ApplicationStatusBadge,
  MatchScoreBadge,
} from "@/components/shared/status-badges";
import {
  JobListItem,
  JobListItemSkeleton,
} from "@/components/jobs/job-list-item";
import { Skeleton } from "@/components/ui/skeleton";
import { apiErrorMessage } from "@/lib/api";
import { dashboardApi, jobApi } from "@/lib/api-client";
import { formatDateTime, titleCase } from "@/lib/utils";
import type { Job } from "@/types";

const STATUS_COLORS: Record<string, string> = {
  applied: "#0ea5e9",
  under_review: "#f59e0b",
  shortlisted: "#6366f1",
  interview: "#8b5cf6",
  hired: "#10b981",
  rejected: "#ef4444",
  withdrawn: "#94a3b8",
};

export default function JobSeekerDashboard() {
  const dashboard = useQuery({
    queryKey: ["dashboard", "job-seeker"],
    queryFn: () => dashboardApi.jobSeeker(),
  });

  const recommended = useQuery({
    queryKey: ["jobs", "recommended", 4],
    queryFn: () => jobApi.recommended(4),
  });

  if (dashboard.isLoading) {
    return (
      <AppShell>
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </AppShell>
    );
  }

  if (dashboard.isError || !dashboard.data) {
    return (
      <AppShell>
        <EmptyState
          icon={Gauge}
          title="Dashboard unavailable"
          description={apiErrorMessage(dashboard.error)}
          actionLabel="Retry"
          onAction={() => void dashboard.refetch()}
        />
      </AppShell>
    );
  }

  const data = dashboard.data;
  const chartData = Object.entries(data.applicationStatus).map(([status, count]) => ({
    status: titleCase(status),
    key: status,
    count,
  }));

  return (
    <AppShell>
      <PageHeader
        title="Job seeker dashboard"
        description="Your applications, interviews and profile strength at a glance."
        action={
          <Button asChild>
            <Link to="/jobs">
              Find jobs <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        }
      />

      {/* Stat tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Applications" value={data.totals.applications} icon={FileText} />
        <StatCard label="Saved jobs" value={data.totals.savedJobs} icon={Bookmark} />
        <StatCard label="Interviews" value={data.totals.interviews} icon={CalendarClock} />
        <StatCard
          label="Upcoming"
          value={data.totals.upcomingInterviews}
          hint="Scheduled interviews"
          icon={TrendingUp}
        />
      </div>

      {/* Pipeline chart + Profile strength */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Application pipeline */}
        <div className="rounded-lg border bg-card">
          <div className="border-b px-5 py-3.5">
            <h2 className="text-sm font-semibold text-foreground">Application pipeline</h2>
          </div>
          <div className="px-5 py-4">
            {chartData.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ left: -20, right: 8 }}>
                  <XAxis dataKey="status" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 6,
                      border: "1px solid hsl(var(--border))",
                      fontSize: 12,
                      boxShadow: "none",
                    }}
                  />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                    {chartData.map((entry) => (
                      <Cell key={entry.key} fill={STATUS_COLORS[entry.key] ?? "#6366f1"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No applications yet — start applying to see your pipeline here.
              </p>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Profile strength */}
          <div className="rounded-lg border bg-card">
            <div className="border-b px-5 py-3.5">
              <h2 className="text-sm font-semibold text-foreground">Profile strength</h2>
            </div>
            <div className="space-y-3 px-5 py-4">
              <div className="flex items-end justify-between">
                <span className="text-3xl font-semibold tabular-nums">
                  {data.profile.completeness}%
                </span>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/profile">Improve</Link>
                </Button>
              </div>
              <Progress value={data.profile.completeness} />
              <p className="text-xs text-muted-foreground">
                {data.profile.headline ?? "Add a headline to stand out to employers."}
              </p>
            </div>
          </div>

          {/* Upcoming interviews mini-list */}
          <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between border-b px-5 py-3.5">
              <h2 className="text-sm font-semibold text-foreground">Upcoming interviews</h2>
              <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                <Link to="/job-seeker/interviews">View all</Link>
              </Button>
            </div>
            <div className="divide-y">
              {data.upcomingInterviews.length ? (
                data.upcomingInterviews.map((interview) => (
                  <div key={interview.id} className="px-5 py-3">
                    <p className="line-clamp-1 text-sm font-medium text-foreground">
                      {interview.jobTitle}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                      {formatDateTime(interview.scheduledAt)} · {titleCase(interview.mode)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="px-5 py-4 text-sm text-muted-foreground">
                  No interviews scheduled yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent applications */}
      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b px-5 py-3.5">
          <h2 className="text-sm font-semibold text-foreground">Recent applications</h2>
          <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
            <Link to="/job-seeker/applications">View all</Link>
          </Button>
        </div>
        {data.recentApplications.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Job
                </th>
                <th className="hidden px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground sm:table-cell">
                  Company
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Status
                </th>
                <th className="hidden px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground md:table-cell">
                  Match
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.recentApplications.map((application) => (
                <tr key={application.id} className="hover:bg-muted/40">
                  <td className="px-5 py-3 font-medium text-foreground">
                    {application.jobTitle}
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                    {application.company}
                  </td>
                  <td className="px-4 py-3">
                    <ApplicationStatusBadge status={application.status} />
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <MatchScoreBadge score={application.matchScore} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-5 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              Nothing yet.{" "}
              <Link to="/jobs" className="text-primary hover:underline">
                Browse jobs
              </Link>
            </p>
          </div>
        )}
      </div>

      {/* AI-recommended jobs */}
      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            Recommended for you
          </h2>
          <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
            <Link to="/jobs">Browse all</Link>
          </Button>
        </div>
        <div className="p-3 space-y-2">
          {recommended.isLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <JobListItemSkeleton key={index} />
            ))
          ) : recommended.data?.length ? (
            recommended.data.map((entry) => (
              <JobListItem
                key={entry.job.id}
                job={{ ...entry.job, matchScore: entry.matchScore, matchedSkills: entry.matchedSkills } as Job}
                showMatch
              />
            ))
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Add skills to your profile to unlock recommendations.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
