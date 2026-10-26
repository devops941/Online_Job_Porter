import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CheckCircle2, MapPin, Video, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState, PageHeader, TableSkeleton } from "@/components/shared/page-parts";
import { apiErrorMessage } from "@/lib/api";
import { interviewApi } from "@/lib/api-client";
import { formatDateTime, titleCase } from "@/lib/utils";

export default function EmployerInterviewsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "scheduled" | "completed" | "cancelled">("all");

  const interviews = useQuery({
    queryKey: ["interviews", "received"],
    queryFn: () => interviewApi.received(),
  });

  const update = useMutation({
    mutationFn: (payload: { id: string; status: string }) =>
      interviewApi.update(payload.id, { status: payload.status }),
    onSuccess: () => {
      toast.success("Interview updated");
      void queryClient.invalidateQueries({ queryKey: ["interviews"] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const items = (interviews.data ?? []).filter((interview) =>
    filter === "all" ? true : interview.status === filter,
  );

  return (
    <AppShell>
      <PageHeader
        title="Interviews"
        description="Every interview booked across your job posts."
        action={
          <Select value={filter} onValueChange={(value) => setFilter(value as never)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All interviews</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {interviews.isLoading ? (
        <div className="rounded-lg border bg-card">
          <div className="border-b px-5 py-3.5">
            <div className="h-4 w-32 rounded bg-muted" />
          </div>
          <div className="p-4">
            <TableSkeleton rows={4} />
          </div>
        </div>
      ) : items.length ? (
        <div className="rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 text-left">Job / Candidate</th>
                <th className="hidden px-5 py-3 text-left md:table-cell">Scheduled</th>
                <th className="hidden px-5 py-3 text-left lg:table-cell">Mode</th>
                <th className="hidden px-5 py-3 text-left xl:table-cell">Link / Location</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((interview) => (
                <tr
                  key={interview.id}
                  className="border-b last:border-0 hover:bg-muted/40 transition-colors align-middle"
                >
                  {/* Job / Candidate */}
                  <td className="px-5 py-3.5">
                    <div className="space-y-0.5">
                      <p className="font-medium leading-none">
                        {interview.job?.title ?? "Interview"}
                      </p>
                    </div>
                  </td>

                  {/* Scheduled date-time */}
                  <td className="hidden px-5 py-3.5 md:table-cell">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                      {formatDateTime(interview.scheduledAt)}
                    </span>
                  </td>

                  {/* Mode */}
                  <td className="hidden px-5 py-3.5 lg:table-cell">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Video className="h-3.5 w-3.5 shrink-0" />
                      {titleCase(interview.mode)}
                    </span>
                    {interview.location ? (
                      <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {interview.location}
                      </span>
                    ) : null}
                  </td>

                  {/* Meeting link / location */}
                  <td className="hidden px-5 py-3.5 xl:table-cell">
                    {interview.meetingLink ? (
                      <a
                        href={interview.meetingLink}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="max-w-[200px] truncate text-xs text-primary hover:underline block"
                      >
                        {interview.meetingLink}
                      </a>
                    ) : (
                      <span className="text-border text-xs">—</span>
                    )}
                  </td>

                  {/* Status badge */}
                  <td className="px-5 py-3.5">
                    <Badge
                      variant={
                        interview.status === "completed"
                          ? "success"
                          : interview.status === "cancelled"
                            ? "destructive"
                            : "info"
                      }
                    >
                      {titleCase(interview.status)}
                    </Badge>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/employer/applicants?jobId=${interview.jobId}`}>
                          Applicants
                        </Link>
                      </Button>
                      {interview.status === "scheduled" ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={update.isPending}
                            onClick={() =>
                              update.mutate({ id: interview.id, status: "completed" })
                            }
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Complete</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={update.isPending}
                            onClick={() =>
                              update.mutate({ id: interview.id, status: "cancelled" })
                            }
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Cancel</span>
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon={CalendarClock}
          title="No interviews"
          description="Schedule interviews from the applicants page once you shortlist candidates."
        />
      )}
    </AppShell>
  );
}
