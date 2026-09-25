import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Download, Mail, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState, PageHeader } from "@/components/shared/page-parts";
import { ApplicationStatusBadge, MatchScoreBadge } from "@/components/shared/status-badges";
import { Skeleton } from "@/components/ui/skeleton";
import { apiErrorMessage } from "@/lib/api";
import { applicationApi, interviewApi, jobApi, resumeApi, triggerDownload } from "@/lib/api-client";
import { formatDate, titleCase } from "@/lib/utils";
import type { Application, ApplicationStatus } from "@/types";

const STATUSES: ApplicationStatus[] = [
  "applied",
  "under_review",
  "shortlisted",
  "interview",
  "hired",
  "rejected",
];

export default function EmployerApplicantsPage() {
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const jobId = params.get("jobId") ?? "";
  const [status, setStatus] = useState<ApplicationStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [noteDialog, setNoteDialog] = useState<Application | null>(null);
  const [noteStatus, setNoteStatus] = useState<ApplicationStatus>("shortlisted");
  const [noteText, setNoteText] = useState("");
  const [interviewDialog, setInterviewDialog] = useState<Application | null>(null);
  const [scheduledAt, setScheduledAt] = useState("");
  const [mode, setMode] = useState("online");
  const [meetingLink, setMeetingLink] = useState("");
  const [interviewNotes, setInterviewNotes] = useState("");

  const applicants = useQuery({
    queryKey: ["applications", "received", { jobId, status, page }],
    queryFn: () =>
      applicationApi.received({
        jobId: jobId || undefined,
        status: status === "all" ? undefined : status,
        page,
        pageSize: 10,
      }),
    placeholderData: (previous) => previous,
  });

  const myJobs = useQuery({
    queryKey: ["jobs", "mine", "filter-options"],
    queryFn: () => jobApi.mine({ pageSize: 50 }),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["applications"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard", "employer"] });
    void queryClient.invalidateQueries({ queryKey: ["interviews"] });
  };

  const updateStatus = useMutation({
    mutationFn: (payload: { id: string; status: ApplicationStatus; notes?: string }) =>
      applicationApi.setStatus(payload.id, payload.status, payload.notes),
    onSuccess: (application) => {
      toast.success(`Applicant moved to ${titleCase(application.status)}`);
      setNoteDialog(null);
      setNoteText("");
      invalidate();
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Could not update the application")),
  });

  const scheduleInterview = useMutation({
    mutationFn: () =>
      interviewApi.schedule({
        applicationId: interviewDialog!.id,
        scheduledAt: new Date(scheduledAt).toISOString(),
        mode,
        meetingLink: mode === "online" ? meetingLink || undefined : undefined,
        notes: interviewNotes || undefined,
      }),
    onSuccess: () => {
      toast.success("Interview scheduled — the candidate has been notified");
      setInterviewDialog(null);
      setScheduledAt("");
      setMeetingLink("");
      setInterviewNotes("");
      invalidate();
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Could not schedule the interview")),
  });

  const downloadResume = useMutation({
    mutationFn: async (resumeId: string) => {
      const blob = await resumeApi.download(resumeId);
      triggerDownload(blob, "candidate-resume");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Could not download the resume")),
  });

  return (
    <AppShell>
      <PageHeader
        title="Applicants"
        description="Review candidates, move them through the pipeline and book interviews."
        action={
          <div className="flex flex-wrap gap-2">
            <Select
              value={jobId || "all"}
              onValueChange={(value) => {
                const next = new URLSearchParams(params);
                if (value === "all") next.delete("jobId");
                else next.set("jobId", value);
                setParams(next, { replace: true });
                setPage(1);
              }}
            >
              <SelectTrigger className="w-52">
                <SelectValue placeholder="All job posts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All job posts</SelectItem>
                {myJobs.data?.items.map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value as ApplicationStatus | "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {titleCase(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {applicants.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 w-full" />
          ))}
        </div>
      ) : applicants.data?.items.length ? (
        <>
          <div className="space-y-3">
            {applicants.data.items.map((application) => (
              <Card key={application.id}>
                <CardContent className="space-y-3 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium">
                        {application.jobSeeker?.user?.fullName ?? "Candidate"}
                      </p>
                      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" />
                          {application.jobSeeker?.user?.email ?? "—"}
                        </span>
                        <span>Applied {formatDate(application.createdAt)}</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        For{" "}
                        <Link
                          to={`/jobs/${application.jobId}`}
                          className="text-primary hover:underline"
                        >
                          {application.job?.title ?? "a job"}
                        </Link>
                      </p>
                      {application.jobSeeker?.skills?.length ? (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {application.jobSeeker.skills.slice(0, 8).map((skill) => (
                            <span
                              key={skill}
                              className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <ApplicationStatusBadge status={application.status} />
                      <MatchScoreBadge score={application.matchScore} />
                      {application.resumeId ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadResume.mutate(application.resumeId as string)}
                        >
                          <Download /> Resume
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {application.coverLetter ? (
                    <p className="rounded-md bg-muted/60 p-3 text-sm text-muted-foreground">
                      {application.coverLetter}
                    </p>
                  ) : null}

                  {application.employerNotes ? (
                    <p className="text-xs text-muted-foreground">
                      Your note: {application.employerNotes}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={application.status}
                      onValueChange={(value) => {
                        const next = value as ApplicationStatus;
                        if (next === "rejected") {
                          setNoteDialog(application);
                          setNoteStatus("rejected");
                          setNoteText(application.employerNotes ?? "");
                        } else {
                          updateStatus.mutate({ id: application.id, status: next });
                        }
                      }}
                    >
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((option) => (
                          <SelectItem key={option} value={option}>
                            {titleCase(option)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setInterviewDialog(application);
                        setScheduledAt("");
                      }}
                    >
                      <CalendarPlus /> Schedule interview
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setNoteDialog(application);
                        setNoteStatus(application.status);
                        setNoteText(application.employerNotes ?? "");
                      }}
                    >
                      Add note
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {applicants.data.pages > 1 ? (
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {applicants.data.page} of {applicants.data.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= applicants.data.pages}
                onClick={() => setPage((value) => value + 1)}
              >
                Next
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <EmptyState
          icon={Users}
          title="No applicants yet"
          description={
            status === "all"
              ? "Applications will appear here once candidates apply to your postings."
              : `No applicants with status “${titleCase(status)}”.`
          }
        />
      )}

      <Dialog open={Boolean(noteDialog)} onOpenChange={() => setNoteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review applicant</DialogTitle>
            <DialogDescription>
              Update the status and record a private note for your team.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={noteStatus}
                onValueChange={(value) => setNoteStatus(value as ApplicationStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {titleCase(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="note">Internal note</Label>
              <Textarea
                id="note"
                rows={4}
                placeholder="Strong backend background; available immediately."
                value={noteText}
                onChange={(event) => setNoteText(event.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialog(null)}>
              Cancel
            </Button>
            <Button
              disabled={updateStatus.isPending}
              onClick={() =>
                noteDialog &&
                updateStatus.mutate({
                  id: noteDialog.id,
                  status: noteStatus,
                  notes: noteText || undefined,
                })
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(interviewDialog)} onOpenChange={() => setInterviewDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule interview</DialogTitle>
            <DialogDescription>
              The candidate is notified immediately and their status moves to Interview.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="scheduledAt">Date and time</Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={scheduledAt}
                onChange={(event) => setScheduledAt(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Mode</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["online", "onsite", "phone"].map((option) => (
                    <SelectItem key={option} value={option}>
                      {titleCase(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {mode === "online" ? (
              <div className="space-y-1.5">
                <Label htmlFor="meetingLink">Meeting link</Label>
                <Input
                  id="meetingLink"
                  placeholder="https://meet.example.com/abc-defg"
                  value={meetingLink}
                  onChange={(event) => setMeetingLink(event.target.value)}
                />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="interviewNotes">Notes for the candidate</Label>
              <Textarea
                id="interviewNotes"
                rows={3}
                placeholder="Technical round with the hiring manager."
                value={interviewNotes}
                onChange={(event) => setInterviewNotes(event.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setInterviewDialog(null)}>
              Cancel
            </Button>
            <Button
              disabled={scheduleInterview.isPending || !scheduledAt}
              onClick={() => scheduleInterview.mutate()}
            >
              <CalendarPlus /> {scheduleInterview.isPending ? "Scheduling…" : "Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {applicants.data && applicants.data.total > 0 ? (
        <p className="text-xs text-muted-foreground">
          Showing {applicants.data.items.length} of {applicants.data.total} applicants
          {jobId ? " for the selected job" : ""}.
        </p>
      ) : null}
    </AppShell>
  );
}
