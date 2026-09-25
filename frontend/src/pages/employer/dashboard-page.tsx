import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Briefcase,
  CalendarClock,
  Eye,
  Gauge,
  Plus,
  Users,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState, PageHeader, StatCard } from "@/components/shared/page-parts";
import { JobStatusBadge } from "@/components/shared/status-badges";
import { Skeleton } from "@/components/ui/skeleton";
import { apiErrorMessage } from "@/lib/api";
import { dashboardApi } from "@/lib/api-client";
import { titleCase } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  applied: "#0ea5e9",
  under_review: "#f59e0b",
  shortlisted: "#6366f1",
  interview: "#8b5cf6",
  hired: "#10b981",
  rejected: "#ef4444",
  withdrawn: "#94a3b8",
};

export default function EmployerDashboard() {
  const dashboard = useQuery({
    queryKey: ["dashboard", "employer"],
    queryFn: () => dashboardApi.employer(),
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
    name: titleCase(status),
    key: status,
    value: count,
  }));

  return (
    <AppShell>
      <PageHeader
        title="Employer dashboard"
        description={data.company ? `Hiring activity for ${data.company.name}` : "Hiring activity"}
        action={
          <Button asChild>
            <Link to="/employer/jobs">
              <Plus /> Post a job
            </Link>
          </Button>
        }
      />

      {data.isApproved === false ? (
        <Alert variant="warning">
          <AlertTitle>Company pending approval</AlertTitle>
          <AlertDescription>
            An administrator still has to approve your company. You can prepare your profile but
            job postings stay disabled until then.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Job posts"
          value={data.totals.jobs}
          hint={`${data.totals.activeJobs} approved · ${data.totals.pendingJobs} pending`}
          icon={Briefcase}
        />
        <StatCard label="Applications" value={data.totals.applications} icon={Users} />
        <StatCard label="Shortlisted" value={data.totals.shortlisted} icon={Eye} />
        <StatCard label="Hires" value={data.totals.hires} icon={CalendarClock} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Top performing posts</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/employer/applicants">
                Applicants <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.topJobs.length ? (
              data.topJobs.map((job) => (
                <div
                  key={job.title}
                  className="flex items-center justify-between gap-3 rounded-md border p-3"
                >
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-sm font-medium">{job.title}</p>
                    <p className="text-xs text-muted-foreground">{job.views} views</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <JobStatusBadge status={job.status as never} />
                    <span className="text-sm font-medium tabular-nums">
                      {job.applications} applicant{job.applications === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No job posts yet.{" "}
                <Link to="/employer/jobs" className="text-primary hover:underline">
                  Create your first posting
                </Link>
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Applicant pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={2}
                    >
                      {chartData.map((entry) => (
                        <Cell key={entry.key} fill={STATUS_COLORS[entry.key] ?? "#6366f1"} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid hsl(var(--border))",
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {chartData.map((entry) => (
                    <p key={entry.key} className="flex items-center gap-2 text-xs">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: STATUS_COLORS[entry.key] ?? "#6366f1" }}
                      />
                      {entry.name}: <span className="font-medium">{entry.value}</span>
                    </p>
                  ))}
                </div>
              </>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No applications received yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
