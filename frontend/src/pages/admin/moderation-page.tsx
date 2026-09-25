import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Eye, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { EmptyState, PageHeader, SkillChips } from "@/components/shared/page-parts";
import { Skeleton } from "@/components/ui/skeleton";
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
      toast.success("Job rejected — the employer has been notified");
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
        description="Approve or reject employer submissions before they go live."
      />

      {pending.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-40 w-full" />
          ))}
        </div>
      ) : pending.isError ? (
        <EmptyState
          icon={ShieldCheck}
          title="Could not load the moderation queue"
          description={apiErrorMessage(pending.error)}
          actionLabel="Retry"
          onAction={() => void pending.refetch()}
        />
      ) : pending.data?.length ? (
        <div className="space-y-3">
          {pending.data.map((job) => (
            <Card key={job.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <Link
                      to={`/jobs/${job.id}`}
                      className="font-medium hover:text-primary hover:underline"
                    >
                      {job.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {job.company?.name ?? "—"} · {job.location} ·{" "}
                      {titleCase(job.employmentType)} · {titleCase(job.workMode)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Submitted {formatDate(job.createdAt)} ·{" "}
                      {formatSalary(job.salaryMin, job.salaryMax, job.currency)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/jobs/${job.id}`}>
                        <Eye /> Preview
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      disabled={approve.isPending}
                      onClick={() => approve.mutate(job)}
                    >
                      <Check /> Approve
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setRejecting(job);
                        setReason("");
                      }}
                    >
                      <X /> Reject
                    </Button>
                  </div>
                </div>

                <p className="line-clamp-3 text-sm text-muted-foreground">{job.description}</p>
                {job.skills?.length ? <SkillChips skills={job.skills} limit={10} /> : null}
              </CardContent>
            </Card>
          ))}
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
              Give the employer a reason so they can fix and resubmit “{rejecting?.title}”.
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
