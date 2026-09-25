import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CheckCircle2, MapPin, Video, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState, PageHeader } from "@/components/shared/page-parts";
import { Skeleton } from "@/components/ui/skeleton";
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
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
      ) : items.length ? (
        <div className="space-y-3">
          {items.map((interview) => (
            <Card key={interview.id}>
              <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="font-medium">{interview.job?.title ?? "Interview"}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarClock className="h-3.5 w-3.5" />
                      {formatDateTime(interview.scheduledAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Video className="h-3.5 w-3.5" />
                      {titleCase(interview.mode)}
                    </span>
                    {interview.location ? (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {interview.location}
                      </span>
                    ) : null}
                  </div>
                  {interview.meetingLink ? (
                    <a
                      href={interview.meetingLink}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-xs text-primary hover:underline"
                    >
                      {interview.meetingLink}
                    </a>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
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
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/employer/applicants?jobId=${interview.jobId}`}>Applicants</Link>
                  </Button>
                  {interview.status === "scheduled" ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => update.mutate({ id: interview.id, status: "completed" })}
                      >
                        <CheckCircle2 /> Complete
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => update.mutate({ id: interview.id, status: "cancelled" })}
                      >
                        <XCircle /> Cancel
                      </Button>
                    </>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
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
