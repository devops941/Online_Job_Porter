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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
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
        title="Company dashboard"
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

      {/* Stat tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Job posts"
          value={data.totals.jobs}
          hint={`${data.totals.activeJobs} approved · ${data.totals.pendingJobs} pending`}
          icon={Briefcase}
        />
        <StatCard label="Applications" value={data.totals.applications} icon={Users} />
        <StatCard label="Shortlisted" value={data.totals.shortlisted} icon={Eye} />
        <StatCard label="Hires" value={data.totals.hires} icon={CalendarClock} />
        <StatCard
          label="Interviews"
          value={data.totals.interviews ?? 0}
          icon={CalendarClock}
        />
      </div>

      {/* Main content area */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Top jobs table */}
        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b px-5 py-3.5">
            <h2 className="text-sm font-semibold text-foreground">Top performing posts</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/employer/applicants">
                All applicants <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          {data.topJobs.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-2.5 text-left">Title</th>
                  <th className="px-5 py-2.5 text-left">Status</th>
                  <th className="px-5 py-2.5 text-right">Views</th>
                  <th className="px-5 py-2.5 text-right">Applicants</th>
                </tr>
              </thead>
              <tbody>
                {data.topJobs.map((job) => (
                  <tr key={job.title} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                    <td className="px-5 py-3 font-medium">{job.title}</td>
                    <td className="px-5 py-3">
                      <JobStatusBadge status={job.status as never} />
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">
                      {job.views}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums font-medium">
                      {job.applications}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No job posts yet.{" "}
              <Link to="/employer/jobs" className="text-primary hover:underline">
                Create your first posting
              </Link>
            </div>
          )}
        </div>

        {/* Applicant pipeline chart */}
        <div className="rounded-lg border bg-card">
          <div className="border-b px-5 py-3.5">
            <h2 className="text-sm font-semibold text-foreground">Applicant pipeline</h2>
          </div>
          <div className="p-5">
            {chartData.length ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={72}
                      paddingAngle={2}
                    >
                      {chartData.map((entry) => (
                        <Cell key={entry.key} fill={STATUS_COLORS[entry.key] ?? "#6366f1"} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 6,
                        border: "1px solid hsl(var(--border))",
                        fontSize: 12,
                        background: "hsl(var(--card))",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  {chartData.map((entry) => (
                    <p key={entry.key} className="flex items-center gap-2 text-xs text-foreground">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: STATUS_COLORS[entry.key] ?? "#6366f1" }}
                      />
                      <span className="truncate text-muted-foreground">{entry.name}</span>
                      <span className="ml-auto font-medium tabular-nums">{entry.value}</span>
                    </p>
                  ))}
                </div>
              </>
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No applications received yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
