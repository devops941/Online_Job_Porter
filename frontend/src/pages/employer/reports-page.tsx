import { AppShell } from "@/components/layout/app-shell";
import { ReportsView } from "@/components/shared/reports-view";

export default function EmployerReportsPage() {
  return (
    <AppShell>
      <ReportsView
        scopes={["jobs", "applications", "interviews", "hiring"]}
        title="Reports"
        description="Export hiring data for your company as Excel or PDF."
      />
    </AppShell>
  );
}
