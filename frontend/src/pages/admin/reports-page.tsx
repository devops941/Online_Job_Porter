import { AppShell } from "@/components/layout/app-shell";
import { ReportsView } from "@/components/shared/reports-view";

export default function AdminReportsPage() {
  return (
    <AppShell>
      <ReportsView
        scopes={["jobs", "applications", "interviews", "hiring", "users"]}
        title="Platform reports"
        description="Export platform-wide data as Excel or PDF for offline analysis."
      />
    </AppShell>
  );
}
