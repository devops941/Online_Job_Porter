import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Briefcase,
  Building2,
  ClipboardList,
  Gauge,
  ShieldCheck,
  TrendingUp,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
          label="Employers"
          value={data.totals.employers}
          hint={`${data.totals.pendingEmployers} pending approval`}
          icon={Building2}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Jobs by category</CardTitle>
          </CardHeader>
          <CardContent>
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
                      borderRadius: 8,
                      border: "1px solid hsl(var(--border))",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No categorised jobs yet.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Application status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {statusData.length ? (
                statusData.map((entry) => {
                  const max = Math.max(...statusData.map((item) => item.value), 1);
                  return (
                    <div key={entry.key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span>{entry.name}</span>
                        <span className="font-medium tabular-nums">{entry.value}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(entry.value / max) * 100}%`,
                            background: STATUS_COLORS[entry.key] ?? "#6366f1",
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">No applications yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-primary" /> Top locations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {locationData.length ? (
                locationData.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{entry.name}</span>
                    <span className="font-medium tabular-nums">{entry.count}</span>
                  </div>
                ))
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">No data yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Most applied jobs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.topJobs.length ? (
            data.topJobs.map((job) => (
              <div
                key={job.title}
                className="flex items-center justify-between rounded-md border p-3 text-sm"
              >
                <span className="line-clamp-1">{job.title}</span>
                <span className="shrink-0 font-medium tabular-nums">
                  {job.applications} applications
                </span>
              </div>
            ))
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No applications recorded yet.
            </p>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
