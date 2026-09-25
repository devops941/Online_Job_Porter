import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, ExternalLink, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { EmptyState, PageHeader } from "@/components/shared/page-parts";
import { ApplicationStatusBadge, MatchScoreBadge } from "@/components/shared/status-badges";
import { Skeleton } from "@/components/ui/skeleton";
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
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
      ) : applications.data?.items.length ? (
        <div className="space-y-3">
          {applications.data.items.map((application) => (
            <Card key={application.id}>
              <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <Link
                    to={`/jobs/${application.jobId}`}
                    className="font-medium hover:text-primary hover:underline"
                  >
                    {application.job?.title ?? "Job removed"}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {application.job?.company?.name ?? "—"} · {application.job?.location ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Applied {formatDate(application.createdAt)}
                    {application.employerNotes
                      ? ` · Note: ${application.employerNotes}`
                      : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <ApplicationStatusBadge status={application.status} />
                  <MatchScoreBadge score={application.matchScore} />
                  {["applied", "under_review"].includes(application.status) ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPendingWithdraw(application)}
                    >
                      <Undo2 /> Withdraw
                    </Button>
                  ) : null}
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/jobs/${application.jobId}`}>
                      <ExternalLink /> View
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {applications.data.pages > 1 ? (
            <div className="flex items-center justify-center gap-3 pt-2">
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
              : `No applications with status “${titleCase(status)}”.`
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
              Withdraw your application for “{pendingWithdraw?.job?.title}”? This cannot be undone.
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
