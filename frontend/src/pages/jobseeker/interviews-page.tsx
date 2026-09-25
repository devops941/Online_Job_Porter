import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, MapPin, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState, PageHeader } from "@/components/shared/page-parts";
import { Skeleton } from "@/components/ui/skeleton";
import { apiErrorMessage } from "@/lib/api";
import { interviewApi } from "@/lib/api-client";
import { formatDateTime, titleCase } from "@/lib/utils";

export default function SeekerInterviewsPage() {
  const interviews = useQuery({
    queryKey: ["interviews", "me"],
    queryFn: () => interviewApi.mine(),
  });

  const upcoming = (interviews.data ?? []).filter(
    (interview) => new Date(interview.scheduledAt).getTime() >= Date.now(),
  );
  const past = (interviews.data ?? []).filter(
    (interview) => new Date(interview.scheduledAt).getTime() < Date.now(),
  );

  return (
    <AppShell>
      <PageHeader
        title="Interviews"
        description="Everything employers have scheduled with you."
      />

      {interviews.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
      ) : interviews.isError ? (
        <EmptyState
          icon={CalendarClock}
          title="Could not load interviews"
          description={apiErrorMessage(interviews.error)}
          actionLabel="Retry"
          onAction={() => void interviews.refetch()}
        />
      ) : interviews.data?.length ? (
        <div className="space-y-6">
          {[
            { label: "Upcoming", items: upcoming },
            { label: "Past", items: past },
          ].map((group) =>
            group.items.length ? (
              <section key={group.label} className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </h2>
                {group.items.map((interview) => (
                  <Card key={interview.id}>
                    <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">{interview.job?.title ?? "Interview"}</p>
                        <p className="text-sm text-muted-foreground">
                          {interview.job?.company?.name ?? "—"}
                        </p>
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
                        {interview.notes ? (
                          <p className="text-xs text-muted-foreground">{interview.notes}</p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant={interview.status === "scheduled" ? "info" : "secondary"}>
                          {titleCase(interview.status)}
                        </Badge>
                        {interview.meetingLink ? (
                          <Button size="sm" asChild>
                            <a
                              href={interview.meetingLink}
                              target="_blank"
                              rel="noreferrer noopener"
                            >
                              Join
                            </a>
                          </Button>
                        ) : null}
                        <Button size="sm" variant="outline" asChild>
                          <Link to={`/jobs/${interview.jobId}`}>Job</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </section>
            ) : null,
          )}
        </div>
      ) : (
        <EmptyState
          icon={CalendarClock}
          title="No interviews scheduled"
          description="Once an employer shortlists you and books a slot, it will appear here."
        />
      )}
    </AppShell>
  );
}
