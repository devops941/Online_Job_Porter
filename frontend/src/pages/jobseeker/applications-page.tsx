import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, ExternalLink, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState, PageHeader, TableSkeleton } from "@/components/shared/page-parts";
import { ApplicationStatusBadge, MatchScoreBadge } from "@/components/shared/status-badges";
import { apiErrorMessage } from "@/lib/api";
import { applicationApi } from "@/lib/api-client";
import { formatDate, titleCase } from "@/lib/utils";
import type { Application, ApplicationStatus } from "@/types";

const STATUS_FILTERS: (ApplicationStatus | "all")[] = [
  "all",
  "applied",
  "under_review",
  "shortlisted",
  "interview",
  "hired",
  "rejected",
  "withdrawn",
];

export default function SeekerApplicationsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ApplicationStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [pendingWithdraw, setPendingWithdraw] = useState<Application | null>(null);

  const applications = useQuery({
    queryKey: ["applications", "me", { status, page }],
    queryFn: () =>
      applicationApi.mine({
        status: status === "all" ? undefined : status,
        page,
        pageSize: 10,
      }),
    placeholderData: (previous) => previous,
  });

  const withdraw = useMutation({
    mutationFn: (id: string) => applicationApi.withdraw(id),
    onSuccess: () => {
      toast.success("Application withdrawn");
      setPendingWithdraw(null);
      void queryClient.invalidateQueries({ queryKey: ["applications"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard", "job-seeker"] });
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Could not withdraw the application")),
  });

  return (
    <AppShell>
      <PageHeader
        title="My applications"
        description="Track each application through the hiring pipeline."
        action={
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as ApplicationStatus | "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option === "all" ? "All statuses" : titleCase(option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {applications.isLoading ? (
        <div className="rounded-lg border bg-card">
          <div className="border-b px-5 py-3">
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          </div>
          <div className="p-4">
            <TableSkeleton rows={5} />
          </div>
        </div>
      ) : applications.data?.items.length ? (
        <div className="rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Job / Company
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Status
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground md:table-cell">
                    Match
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground sm:table-cell">
                    Applied
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {applications.data.items.map((application) => (
                  <tr key={application.id} className="hover:bg-muted/40">
                    <td className="px-5 py-3.5">
                      <Link
                        to={`/jobs/${application.jobId}`}
                        className="font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {application.job?.title ?? "Job removed"}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {application.job?.company?.name ?? "—"}
                        {application.job?.location ? ` · ${application.job.location}` : ""}
                      </p>
                      {application.employerNotes ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Note: {application.employerNotes}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3.5">
                      <ApplicationStatusBadge status={application.status} />
                    </td>
                    <td className="hidden px-4 py-3.5 md:table-cell">
                      <MatchScoreBadge score={application.matchScore} />
                    </td>
                    <td className="hidden px-4 py-3.5 text-xs text-muted-foreground sm:table-cell">
                      {formatDate(application.createdAt)}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        {["applied", "under_review"].includes(application.status) ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => setPendingWithdraw(application)}
                          >
                            <Undo2 className="mr-1 h-3 w-3" />
                            Withdraw
                          </Button>
                        ) : null}
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
                          <Link to={`/jobs/${application.jobId}`}>
                            <ExternalLink className="mr-1 h-3 w-3" />
                            View
                          </Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {applications.data.pages > 1 ? (
            <div className="flex items-center justify-center gap-3 border-t px-5 py-3">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {applications.data.page} of {applications.data.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= applications.data.pages}
                onClick={() => setPage((value) => value + 1)}
              >
                Next
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <EmptyState
          icon={ClipboardList}
          title="No applications found"
          description={
            status === "all"
              ? "You have not applied to any roles yet."
              : `No applications with status "${titleCase(status)}".`
          }
          actionLabel="Browse jobs"
          onAction={() => window.location.assign("/jobs")}
        />
      )}

      <Dialog open={Boolean(pendingWithdraw)} onOpenChange={() => setPendingWithdraw(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw application</DialogTitle>
            <DialogDescription>
              Withdraw your application for "{pendingWithdraw?.job?.title}"? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingWithdraw(null)}>
              Keep application
            </Button>
            <Button
              variant="destructive"
              disabled={withdraw.isPending}
              onClick={() => pendingWithdraw && withdraw.mutate(pendingWithdraw.id)}
            >
              Withdraw
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
