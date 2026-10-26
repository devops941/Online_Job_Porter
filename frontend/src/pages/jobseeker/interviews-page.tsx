import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, MapPin, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState, PageHeader, TableSkeleton } from "@/components/shared/page-parts";
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
        <div className="rounded-lg border bg-card">
          <div className="border-b px-5 py-3">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          </div>
          <div className="p-4">
            <TableSkeleton rows={4} />
          </div>
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
          {(
            [
              { label: "Upcoming", items: upcoming },
              { label: "Past", items: past },
            ] as const
          ).map((group) =>
            group.items.length ? (
              <div key={group.label} className="rounded-lg border bg-card">
                {/* Section header */}
                <div className="border-b bg-muted/40 px-5 py-3">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.label}
                  </h2>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Job / Company
                        </th>
                        <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground sm:table-cell">
                          Date &amp; Time
                        </th>
                        <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground md:table-cell">
                          Mode
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Status
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {group.items.map((interview) => (
                        <tr key={interview.id} className="hover:bg-muted/40">
                          <td className="px-5 py-3.5">
                            <p className="font-medium text-foreground">
                              {interview.job?.title ?? "Interview"}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {interview.job?.company?.name ?? "—"}
                            </p>
                            {/* Date/time on mobile */}
                            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground sm:hidden">
                              <CalendarClock className="h-3 w-3 shrink-0" />
                              {formatDateTime(interview.scheduledAt)}
                            </p>
                            {interview.location ? (
                              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3 shrink-0" />
                                {interview.location}
                              </p>
                            ) : null}
                            {interview.notes ? (
                              <p className="mt-0.5 text-xs text-muted-foreground italic">
                                {interview.notes}
                              </p>
                            ) : null}
                          </td>
                          <td className="hidden px-4 py-3.5 text-xs text-muted-foreground sm:table-cell">
                            {formatDateTime(interview.scheduledAt)}
                          </td>
                          <td className="hidden px-4 py-3.5 md:table-cell">
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Video className="h-3.5 w-3.5 shrink-0" />
                              {titleCase(interview.mode)}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <Badge
                              variant={interview.status === "scheduled" ? "info" : "secondary"}
                              className="text-[11px] px-2 py-0.5 font-medium"
                            >
                              {titleCase(interview.status)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center justify-end gap-1.5">
                              {interview.meetingLink ? (
                                <Button size="sm" className="h-7 px-3 text-xs" asChild>
                                  <a
                                    href={interview.meetingLink}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                  >
                                    Join
                                  </a>
                                </Button>
                              ) : null}
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-3 text-xs"
                                asChild
                              >
                                <Link to={`/jobs/${interview.jobId}`}>Job</Link>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
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
