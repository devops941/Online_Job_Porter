import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Eye, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState, PageHeader, SkillChips, TableSkeleton } from "@/components/shared/page-parts";
import { apiErrorMessage } from "@/lib/api";
import { jobApi } from "@/lib/api-client";
import { formatDate, formatSalary, titleCase } from "@/lib/utils";
import type { Job } from "@/types";

export default function AdminModerationPage() {
  const queryClient = useQueryClient();
  const [rejecting, setRejecting] = useState<Job | null>(null);
  const [reason, setReason] = useState("");

  const pending = useQuery({
    queryKey: ["jobs", "pending"],
    queryFn: () => jobApi.pending(),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["jobs"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard", "admin"] });
  };

  const approve = useMutation({
    mutationFn: (job: Job) => jobApi.moderate(job.id, "approved"),
    onSuccess: () => {
      toast.success("Job approved and published");
      invalidate();
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const reject = useMutation({
    mutationFn: () => jobApi.moderate(rejecting!.id, "rejected", reason || undefined),
    onSuccess: () => {
      toast.success("Job rejected — the company has been notified");
      setRejecting(null);
      setReason("");
      invalidate();
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  return (
    <AppShell>
      <PageHeader
        title="Job moderation"
        description="Approve or reject company submissions before they go live."
      />

      {pending.isLoading ? (
        <TableSkeleton rows={4} />
      ) : pending.isError ? (
        <EmptyState
          icon={ShieldCheck}
          title="Could not load the moderation queue"
          description={apiErrorMessage(pending.error)}
          actionLabel="Retry"
          onAction={() => void pending.refetch()}
        />
      ) : pending.data?.length ? (
        <div className="rounded-lg border bg-card">
          <div className="border-b px-5 py-3.5">
            <p className="text-sm font-semibold text-foreground">
              Pending review
              <span className="ml-2 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
                {pending.data.length}
              </span>
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Job title
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Company
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Details
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Submitted
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pending.data.map((job) => (
                  <tr key={job.id} className="hover:bg-muted/40">
                    <td className="px-5 py-4 align-top">
                      <div className="space-y-1">
                        <Link
                          to={`/jobs/${job.id}`}
                          className="font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {job.title}
                        </Link>
                        {job.skills?.length ? (
                          <SkillChips skills={job.skills} limit={5} />
                        ) : null}
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <span className="font-medium">{job.company?.name ?? "—"}</span>
                    </td>
                    <td className="px-5 py-4 align-top text-muted-foreground">
                      <div className="space-y-0.5 text-xs">
                        <p>{job.location}</p>
                        <p>
                          {titleCase(job.employmentType)} · {titleCase(job.workMode)}
                        </p>
                        <p>{formatSalary(job.salaryMin, job.salaryMax, job.currency)}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top text-xs text-muted-foreground">
                      {formatDate(job.createdAt)}
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="flex justify-end gap-1.5">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/jobs/${job.id}`}>
                            <Eye className="h-3.5 w-3.5" />
                            Preview
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          disabled={approve.isPending}
                          onClick={() => approve.mutate(job)}
                        >
                          <Check className="h-3.5 w-3.5" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setRejecting(job);
                            setReason("");
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={ShieldCheck}
          title="Moderation queue is clear"
          description="Every submitted job post has been reviewed. Nice work."
        />
      )}

      <Dialog open={Boolean(rejecting)} onOpenChange={() => setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject job post</DialogTitle>
            <DialogDescription>
              Give the company a reason so they can fix and resubmit "{rejecting?.title}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="reason">Rejection reason</Label>
            <Textarea
              id="reason"
              rows={4}
              placeholder="Salary range missing, description too vague…"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={reject.isPending}
              onClick={() => reject.mutate()}
            >
              Reject job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
