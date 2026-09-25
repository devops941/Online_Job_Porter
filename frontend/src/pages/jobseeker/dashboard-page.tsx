import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Bookmark,
  Briefcase,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState, PageHeader, StatCard } from "@/components/shared/page-parts";
import { ApplicationStatusBadge, MatchScoreBadge } from "@/components/shared/status-badges";
import { Skeleton } from "@/components/ui/skeleton";
import { apiErrorMessage } from "@/lib/api";
import { dashboardApi, jobApi } from "@/lib/api-client";
import { formatDateTime, titleCase } from "@/lib/utils";

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
              Find jobs <ArrowRight />
            </Link>
          </Button>
        }
      />

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

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Application pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ left: -20, right: 8 }}>
                  <XAxis dataKey="status" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid hsl(var(--border))",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
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
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile strength</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" /> Recommended for you
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommended.isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : recommended.data?.length ? (
                recommended.data.map((entry) => (
                  <Link
                    key={entry.job.id}
                    to={`/jobs/${entry.job.id}`}
                    className="block rounded-md border p-3 transition-colors hover:bg-accent"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-1 text-sm font-medium">{entry.job.title}</p>
                      <MatchScoreBadge score={entry.matchScore} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {entry.job.company?.name} · {entry.job.location}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Add skills to your profile to unlock recommendations.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Recent applications</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/job-seeker/applications">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentApplications.length ? (
              data.recentApplications.map((application) => (
                <div
                  key={application.id}
                  className="flex items-start justify-between gap-3 rounded-md border p-3"
                >
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-sm font-medium">{application.jobTitle}</p>
                    <p className="text-xs text-muted-foreground">{application.company}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <ApplicationStatusBadge status={application.status} />
                    <MatchScoreBadge score={application.matchScore} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Nothing yet.{" "}
                <Link to="/jobs" className="text-primary hover:underline">
                  Browse jobs
                </Link>
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Upcoming interviews</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/job-seeker/interviews">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.upcomingInterviews.length ? (
              data.upcomingInterviews.map((interview) => (
                <div key={interview.id} className="rounded-md border p-3">
                  <p className="line-clamp-1 text-sm font-medium">{interview.jobTitle}</p>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5" />
                    {formatDateTime(interview.scheduledAt)} · {titleCase(interview.mode)}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState
                icon={Briefcase}
                title="No interviews scheduled"
                description="Employers will schedule interviews once they shortlist you."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
