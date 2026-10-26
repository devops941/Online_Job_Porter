import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Briefcase,
  Building2,
  ClipboardList,
  Gauge,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState, PageHeader, StatCard } from "@/components/shared/page-parts";
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

export default function AdminDashboard() {
  const dashboard = useQuery({
    queryKey: ["dashboard", "admin"],
    queryFn: () => dashboardApi.admin(),
  });

  if (dashboard.isLoading) {
    return (
      <AppShell>
        <div className="space-y-6">
          <Skeleton className="h-8 w-56" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full" />
            ))}
          </div>
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
  const statusData = Object.entries(data.applicationStatus).map(([status, count]) => ({
    name: titleCase(status),
    key: status,
    value: count,
  }));
  const categoryData = Object.entries(data.jobsByCategory)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const locationData = Object.entries(data.jobsByLocation)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return (
    <AppShell>
      <PageHeader
        title="Admin dashboard"
        description="Platform health, moderation queues and hiring activity."
        action={
          <Button asChild>
            <Link to="/admin/moderation">
              <ShieldCheck /> Review pending jobs
            </Link>
          </Button>
        }
      />

      {/* KPI tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Users"
          value={data.totals.users}
          hint={`+${data.newUsersLast30Days} in last 30 days`}
          icon={Users}
        />
        <StatCard
          label="Jobs"
          value={data.totals.jobs}
          hint={`${data.totals.pendingJobs} awaiting review`}
          icon={Briefcase}
        />
        <StatCard
          label="Applications"
          value={data.totals.applications}
          icon={ClipboardList}
        />
        <StatCard
          label="Companies"
          value={data.totals.employers}
          hint={`${data.totals.pendingEmployers} pending approval`}
          icon={Building2}
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Jobs by category bar chart */}
        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b px-5 py-3.5">
            <p className="text-sm font-semibold text-foreground">Jobs by category</p>
          </div>
          <div className="p-5">
            {categoryData.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={categoryData} layout="vertical" margin={{ left: 40, right: 16 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" opacity={0.4} />
                  <XAxis type="number" allowDecimals={false} fontSize={12} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 6,
                      border: "1px solid hsl(var(--border))",
                      fontSize: 12,
                      boxShadow: "none",
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No categorised jobs yet.
              </p>
            )}
          </div>
        </div>

        {/* Right column: status breakdown + locations */}
        <div className="space-y-6">
          <div className="rounded-lg border bg-card">
            <div className="border-b px-5 py-3.5">
              <p className="text-sm font-semibold text-foreground">Application status</p>
            </div>
            <div className="space-y-3 p-5">
              {statusData.length ? (
                statusData.map((entry) => {
                  const max = Math.max(...statusData.map((item) => item.value), 1);
                  return (
                    <div key={entry.key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{entry.name}</span>
                        <span className="font-semibold tabular-nums text-foreground">
                          {entry.value}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(entry.value / max) * 100}%`,
                            background: STATUS_COLORS[entry.key] ?? "hsl(var(--primary))",
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No applications yet.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-lg border bg-card">
            <div className="border-b px-5 py-3.5">
              <p className="text-sm font-semibold text-foreground">Top locations</p>
            </div>
            <div className="divide-y">
              {locationData.length ? (
                locationData.map((entry) => (
                  <div
                    key={entry.name}
                    className="flex items-center justify-between px-5 py-2.5 text-sm"
                  >
                    <span className="text-muted-foreground">{entry.name}</span>
                    <span className="font-semibold tabular-nums text-foreground">
                      {entry.count}
                    </span>
                  </div>
                ))
              ) : (
                <p className="px-5 py-4 text-center text-sm text-muted-foreground">
                  No data yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Most applied jobs table */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-5 py-3.5">
          <p className="text-sm font-semibold text-foreground">Most applied jobs</p>
        </div>
        {data.topJobs.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Job title
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Applications
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.topJobs.map((job) => (
                  <tr key={job.title} className="hover:bg-muted/40">
                    <td className="px-5 py-3 font-medium">{job.title}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">
                      {job.applications}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            No applications recorded yet.
          </p>
        )}
      </div>
    </AppShell>
  );
}
