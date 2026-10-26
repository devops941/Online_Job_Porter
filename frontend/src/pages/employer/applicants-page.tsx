import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Download, ExternalLink, Eye, FileText, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { EmptyState, PageHeader, SkillChips, TableSkeleton } from "@/components/shared/page-parts";
import { MatchScoreBadge } from "@/components/shared/status-badges";
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

  // In-browser preview modal state
  const [previewResumeId, setPreviewResumeId] = useState<string | null>(null);
  const [previewApplicantName, setPreviewApplicantName] = useState<string>("");
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const handleOpenPreview = async (resumeId: string, applicantName: string) => {
    setPreviewResumeId(resumeId);
    setPreviewApplicantName(applicantName);
    setLoadingPreview(true);
    setPreviewBlobUrl(null);
    setPreviewText(null);
    try {
      const blob = await resumeApi.download(resumeId, true);
      if (blob.type.includes("text/plain")) {
        const text = await blob.text();
        setPreviewText(text);
      } else {
        const url = URL.createObjectURL(blob);
        setPreviewBlobUrl(url);
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to load resume preview"));
      setPreviewResumeId(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleClosePreview = () => {
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
    }
    setPreviewResumeId(null);
    setPreviewBlobUrl(null);
    setPreviewText(null);
  };

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
        <div className="rounded-lg border bg-card">
          <div className="border-b px-5 py-3.5">
            <div className="h-4 w-32 rounded bg-muted" />
          </div>
          <div className="p-4">
            <TableSkeleton rows={5} />
          </div>
        </div>
      ) : applicants.data?.items.length ? (
        <>
          <div className="rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 text-left">Candidate</th>
                  <th className="hidden px-5 py-3 text-left md:table-cell">Job</th>
                  <th className="hidden px-5 py-3 text-left lg:table-cell">Match</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="hidden px-5 py-3 text-left xl:table-cell">Applied</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {applicants.data.items.map((application) => (
                  <tr
                    key={application.id}
                    className="border-b last:border-0 hover:bg-muted/40 transition-colors align-top"
                  >
                    {/* Candidate */}
                    <td className="px-5 py-3.5">
                      <div className="space-y-1">
                        <p className="font-medium leading-none">
                          {application.jobSeeker?.user?.fullName ?? "Candidate"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {application.jobSeeker?.user?.email ?? "—"}
                        </p>
                        {application.jobSeeker?.skills?.length ? (
                          <div className="pt-1">
                            <SkillChips skills={application.jobSeeker.skills} limit={4} />
                          </div>
                        ) : null}
                        {application.coverLetter ? (
                          <p className="line-clamp-2 max-w-xs text-xs text-muted-foreground italic">
                            {application.coverLetter}
                          </p>
                        ) : null}
                        {application.employerNotes ? (
                          <p className="text-xs text-muted-foreground">
                            Note: {application.employerNotes}
                          </p>
                        ) : null}
                      </div>
                    </td>

                    {/* Job */}
                    <td className="hidden px-5 py-3.5 md:table-cell">
                      <Link
                        to={`/jobs/${application.jobId}`}
                        className="text-primary hover:underline"
                      >
                        {application.job?.title ?? "—"}
                      </Link>
                    </td>

                    {/* Match score */}
                    <td className="hidden px-5 py-3.5 lg:table-cell">
                      <MatchScoreBadge score={application.matchScore} />
                    </td>

                    {/* Status inline select */}
                    <td className="px-5 py-3.5">
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
                        <SelectTrigger className="h-8 w-36 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((option) => (
                            <SelectItem key={option} value={option} className="text-xs">
                              {titleCase(option)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>

                    {/* Applied date */}
                    <td className="hidden px-5 py-3.5 text-xs text-muted-foreground xl:table-cell">
                      {formatDate(application.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setInterviewDialog(application);
                            setScheduledAt("");
                          }}
                        >
                          <CalendarPlus className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Interview</span>
                        </Button>
                        {application.resumeId ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              onClick={() =>
                                handleOpenPreview(
                                  application.resumeId as string,
                                  application.jobSeeker?.user?.fullName || "Candidate",
                                )
                              }
                            >
                              <Eye className="mr-1 h-3.5 w-3.5 text-primary" />
                              <span className="hidden sm:inline">Preview</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              title="Download resume"
                              onClick={() =>
                                downloadResume.mutate(application.resumeId as string)
                              }
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setNoteDialog(application);
                            setNoteStatus(application.status);
                            setNoteText(application.employerNotes ?? "");
                          }}
                        >
                          Note
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {applicants.data.total > 0 ? (
            <p className="text-xs text-muted-foreground">
              Showing {applicants.data.items.length} of {applicants.data.total} applicants
              {jobId ? " for the selected job" : ""}.
            </p>
          ) : null}

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
              : `No applicants with status "${titleCase(status)}".`
          }
        />
      )}

      {/* Review / note dialog */}
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

      {/* Schedule interview dialog */}
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
              <CalendarPlus className="h-3.5 w-3.5" />
              {scheduleInterview.isPending ? "Scheduling…" : "Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Candidate Resume Preview Modal ────────────── */}
      <Dialog open={Boolean(previewResumeId)} onOpenChange={handleClosePreview}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-4 sm:p-6">
          <DialogHeader className="border-b pb-3 flex flex-row items-center justify-between gap-4">
            <div className="min-w-0">
              <DialogTitle className="truncate flex items-center gap-2 text-base font-semibold">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                Resume: {previewApplicantName}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Candidate resume preview stored securely on Cloudinary.
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {previewBlobUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => window.open(previewBlobUrl, "_blank")}
                >
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Open in Tab
                </Button>
              )}
              {previewResumeId && (
                <Button
                  variant="default"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => downloadResume.mutate(previewResumeId)}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Download
                </Button>
              )}
            </div>
          </DialogHeader>

          {/* Preview Container */}
          <div className="flex-1 overflow-hidden py-3">
            {loadingPreview ? (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading candidate resume…</p>
              </div>
            ) : previewText !== null ? (
              <div className="h-full w-full overflow-auto rounded-lg border bg-muted/40 p-4">
                <pre className="font-mono text-xs whitespace-pre-wrap text-foreground">
                  {previewText}
                </pre>
              </div>
            ) : previewBlobUrl ? (
              <iframe
                src={previewBlobUrl}
                title={`${previewApplicantName} resume preview`}
                className="h-full w-full rounded-lg border bg-background"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
                <FileText className="h-12 w-12 text-muted-foreground" />
                <p className="text-sm font-medium">Document preview not available directly</p>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Word and proprietary documents can be downloaded and opened with Microsoft Word or Google Docs.
                </p>
                {previewResumeId && (
                  <Button
                    size="sm"
                    onClick={() => downloadResume.mutate(previewResumeId)}
                  >
                    <Download className="mr-2 h-4 w-4" /> Download to View
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
