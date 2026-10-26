import { useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Building2,
  CalendarClock,
  CheckCircle2,
  Eye,
  Loader2,
  MapPin,
  Send,
  Sparkles,
  Upload,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
import { PublicNavbar, PublicFooter } from "@/components/layout/public-navbar";
import { EmptyState, SkillChips } from "@/components/shared/page-parts";
import { JobStatusBadge } from "@/components/shared/status-badges";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/auth-context";
import { apiErrorMessage } from "@/lib/api";
import { applicationApi, jobApi, resumeApi, savedJobApi } from "@/lib/api-client";
import { formatDate, formatSalary, timeAgo, titleCase } from "@/lib/utils";

export default function JobDetailPage() {
  const { jobId = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isSeeker = user?.role === "job_seeker";

  const [applyOpen, setApplyOpen] = useState(false);
  const [resumeId, setResumeId] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const quickUploadRef = useRef<HTMLInputElement>(null);
  const [uploadingResume, setUploadingResume] = useState(false);

  const handleQuickResumeUpload = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File exceeds 10 MB limit");
      return;
    }
    setUploadingResume(true);
    try {
      const uploaded = await resumeApi.upload(file, { isPrimary: true });
      toast.success(
        uploaded.parsedSkills.length
          ? `Uploaded ${uploaded.fileName} to Cloudinary! (${uploaded.parsedSkills.length} skills detected)`
          : `Uploaded ${uploaded.fileName} to Cloudinary!`,
      );
      await queryClient.invalidateQueries({ queryKey: ["resumes"] });
      setResumeId(uploaded.id);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to upload resume to Cloudinary"));
    } finally {
      setUploadingResume(false);
      if (quickUploadRef.current) quickUploadRef.current.value = "";
    }
  };

  const job = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => jobApi.detail(jobId),
    enabled: Boolean(jobId),
  });

  const resumes = useQuery({
    queryKey: ["resumes"],
    queryFn: () => resumeApi.list(),
    enabled: isSeeker,
  });

  const saved = useQuery({
    queryKey: ["saved-jobs", "ids"],
    queryFn: () => savedJobApi.list(1, 100),
    enabled: isSeeker,
  });
  const isSaved = Boolean(saved.data?.items.some((item) => item.jobId === jobId));

  const myApplications = useQuery({
    queryKey: ["applications", "me", "ids"],
    queryFn: () => applicationApi.mine({ pageSize: 100 }),
    enabled: isSeeker,
  });
  const alreadyApplied = myApplications.data?.items.find((item) => item.jobId === jobId);

  const toggleSave = useMutation({
    mutationFn: async () => {
      if (isSaved) await savedJobApi.remove(jobId);
      else await savedJobApi.save(jobId);
    },
    onSuccess: () => {
      toast.success(isSaved ? "Removed from saved jobs" : "Job saved");
      void queryClient.invalidateQueries({ queryKey: ["saved-jobs"] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const apply = useMutation({
    mutationFn: () =>
      applicationApi.apply({
        jobId,
        resumeId: resumeId || undefined,
        coverLetter: coverLetter || undefined,
      }),
    onSuccess: (application) => {
      toast.success(`Application submitted — ${application.matchScore?.toFixed(0) ?? 0}% match`);
      setApplyOpen(false);
      setCoverLetter("");
      void queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Could not submit application")),
  });

  if (job.isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <PublicNavbar />
        <div className="container flex-1 space-y-4 py-8">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-64 w-full" />
        </div>
        <PublicFooter />
      </div>
    );
  }

  if (job.isError || !job.data) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <PublicNavbar />
        <div className="container flex-1 py-16">
          <EmptyState
            icon={Building2}
            title="Job not found"
            description="This posting may have been closed or removed."
            actionLabel="Back to jobs"
            onAction={() => navigate("/jobs")}
          />
        </div>
        <PublicFooter />
      </div>
    );
  }

  const detail = job.data;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicNavbar />

      <div className="container flex-1 py-8">
        <Button variant="ghost" size="sm" className="mb-5 -ml-1" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* ── Main column ─────────────────────────────────── */}
          <div className="space-y-6">
            {/* Title block */}
            <div className="rounded-lg border border-border bg-card px-6 py-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                    {detail.title}
                  </h1>
                  <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="h-4 w-4" />
                      {detail.company?.name ?? "Confidential"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      {detail.location}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CalendarClock className="h-4 w-4" />
                      Posted {timeAgo(detail.createdAt)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Eye className="h-4 w-4" />
                      {detail.views} views
                    </span>
                  </p>
                </div>
                {detail.status !== "approved" ? <JobStatusBadge status={detail.status} /> : null}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="outline">{titleCase(detail.employmentType)}</Badge>
                <Badge variant="secondary">{titleCase(detail.workMode)}</Badge>
                {detail.category ? <Badge variant="info">{detail.category.name}</Badge> : null}
                <Badge variant="outline">
                  {detail.experienceMin ?? 0}–{detail.experienceMax ?? "any"} yrs experience
                </Badge>
              </div>
            </div>

            {/* Description block */}
            <div className="rounded-lg border border-border bg-card">
              <div className="border-b px-6 py-4">
                <h2 className="text-base font-semibold text-foreground">Job description</h2>
              </div>
              <div className="space-y-5 px-6 py-5 text-sm leading-relaxed">
                <p className="whitespace-pre-line text-foreground">{detail.description}</p>

                {detail.responsibilities ? (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h3 className="font-semibold text-foreground">Responsibilities</h3>
                      <p className="whitespace-pre-line text-muted-foreground">
                        {detail.responsibilities}
                      </p>
                    </div>
                  </>
                ) : null}

                {detail.requirements ? (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h3 className="font-semibold text-foreground">Requirements</h3>
                      <p className="whitespace-pre-line text-muted-foreground">
                        {detail.requirements}
                      </p>
                    </div>
                  </>
                ) : null}

                {detail.skills?.length ? (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h3 className="font-semibold text-foreground">Skills</h3>
                      <SkillChips skills={detail.skills} />
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            {/* About the company block */}
            {detail.company ? (
              <div className="rounded-lg border border-border bg-card">
                <div className="border-b px-6 py-4">
                  <h2 className="text-base font-semibold text-foreground">
                    About {detail.company.name}
                  </h2>
                </div>
                <div className="space-y-4 px-6 py-5 text-sm">
                  {detail.company.description ? (
                    <p className="text-muted-foreground">{detail.company.description}</p>
                  ) : null}
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Industry
                      </p>
                      <p className="mt-0.5 text-foreground">{detail.company.industry ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Company size
                      </p>
                      <p className="mt-0.5 text-foreground">{detail.company.size ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Head office
                      </p>
                      <p className="mt-0.5 text-foreground">{detail.company.location ?? "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {detail.company.website ? (
                      <a
                        href={detail.company.website}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-primary hover:underline"
                      >
                        {detail.company.website}
                      </a>
                    ) : null}
                    <Link
                      to={`/jobs?companyId=${detail.company.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      View all jobs at {detail.company.name}
                    </Link>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* ── Sticky sidebar ──────────────────────────────── */}
          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            {/* Apply / save block */}
            <div className="rounded-lg border border-border bg-card px-5 py-5 space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Compensation
                </p>
                <p className="mt-0.5 text-lg font-semibold text-foreground">
                  {formatSalary(detail.salaryMin, detail.salaryMax, detail.currency)}
                </p>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Vacancies
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 font-medium text-foreground">
                    <Users className="h-3.5 w-3.5" /> {detail.vacancies}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Apply before
                  </p>
                  <p className="mt-0.5 font-medium text-foreground">{formatDate(detail.deadline)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Experience
                  </p>
                  <p className="mt-0.5 font-medium text-foreground">
                    {detail.experienceMin ?? 0}–{detail.experienceMax ?? "any"} yrs
                  </p>
                </div>
              </div>

              <Separator />

              {!user ? (
                <Button className="w-full" asChild>
                  <Link to="/login">Sign in to apply</Link>
                </Button>
              ) : isSeeker ? (
                <>
                  {alreadyApplied ? (
                    <div className="space-y-2">
                      <p className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                        Already applied — {titleCase(alreadyApplied.status)}
                      </p>
                      <Button variant="outline" className="w-full" asChild>
                        <Link to="/job-seeker/applications">Track application</Link>
                      </Button>
                    </div>
                  ) : (
                    <Button className="w-full" onClick={() => setApplyOpen(true)}>
                      <Send className="h-4 w-4" /> Apply now
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={toggleSave.isPending}
                    onClick={() => toggleSave.mutate()}
                  >
                    {isSaved ? (
                      <BookmarkCheck className="h-4 w-4" />
                    ) : (
                      <Bookmark className="h-4 w-4" />
                    )}
                    {isSaved ? "Saved" : "Save job"}
                  </Button>
                </>
              ) : (
                <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                  You are signed in as {titleCase(user.role)}. Only job seekers can apply to
                  postings.
                </p>
              )}
            </div>

            {/* Match score info */}
            <div className="rounded-lg border border-border bg-card px-5 py-4">
              <div className="flex gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-xs text-muted-foreground">
                  Match scores compare your profile skills with the posting requirements and are
                  attached to every application you submit.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Apply dialog */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply for {detail.title}</DialogTitle>
            <DialogDescription>
              Pick the resume you want to send and add an optional cover letter.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Resume</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-primary hover:text-primary"
                  disabled={uploadingResume}
                  onClick={() => quickUploadRef.current?.click()}
                >
                  {uploadingResume ? (
                    <>
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Uploading to Cloudinary…
                    </>
                  ) : (
                    <>
                      <Upload className="mr-1 h-3 w-3" /> + Upload New (PDF/Doc)
                    </>
                  )}
                </Button>
              </div>

              {/* Hidden quick upload input */}
              <input
                ref={quickUploadRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt,.rtf"
                className="hidden"
                onChange={(e) => void handleQuickResumeUpload(e.target.files?.[0])}
              />

              {resumes.isLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : resumes.data?.length ? (
                <Select value={resumeId} onValueChange={setResumeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a resume" />
                  </SelectTrigger>
                  <SelectContent>
                    {resumes.data.map((resume) => (
                      <SelectItem key={resume.id} value={resume.id}>
                        {resume.fileName}
                        {resume.isPrimary ? " (primary)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground flex items-center justify-between">
                  <span>No resumes uploaded yet. Attach a PDF to stand out.</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={uploadingResume}
                    onClick={() => quickUploadRef.current?.click()}
                  >
                    <Upload className="mr-1 h-3 w-3" /> Upload PDF
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cover-letter">Cover letter (optional)</Label>
              <Textarea
                id="cover-letter"
                rows={5}
                placeholder="Tell the employer why you are a strong fit…"
                value={coverLetter}
                onChange={(event) => setCoverLetter(event.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyOpen(false)}>
              Cancel
            </Button>
            <Button disabled={apply.isPending} onClick={() => apply.mutate()}>
              <Send className="h-4 w-4" />
              {apply.isPending ? "Submitting…" : "Submit application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PublicFooter />
    </div>
  );
}
