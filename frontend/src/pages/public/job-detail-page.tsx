import { useState } from "react";
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
  MapPin,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { EmptyState } from "@/components/shared/page-parts";
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
      <div className="flex min-h-screen flex-col">
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
      <div className="flex min-h-screen flex-col">
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
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />

      <div className="container flex-1 py-8">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate(-1)}>
          <ArrowLeft /> Back
        </Button>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <Card>
              <CardContent className="space-y-4 p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <h1 className="text-2xl font-semibold tracking-tight">{detail.title}</h1>
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

                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{titleCase(detail.employmentType)}</Badge>
                  <Badge variant="secondary">{titleCase(detail.workMode)}</Badge>
                  {detail.category ? <Badge variant="info">{detail.category.name}</Badge> : null}
                  <Badge variant="outline">
                    {detail.experienceMin ?? 0}–{detail.experienceMax ?? "any"} yrs experience
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Job description</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 text-sm leading-relaxed">
                <p className="whitespace-pre-line">{detail.description}</p>

                {detail.responsibilities ? (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h3 className="font-semibold">Responsibilities</h3>
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
                      <h3 className="font-semibold">Requirements</h3>
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
                      <h3 className="font-semibold">Skills</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {detail.skills.map((skill) => (
                          <span
                            key={skill}
                            className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>

            {detail.company ? (
              <Card>
                <CardHeader>
                  <CardTitle>About {detail.company.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="text-muted-foreground">{detail.company.description}</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Industry</p>
                      <p>{detail.company.industry ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Company size</p>
                      <p>{detail.company.size ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Head office</p>
                      <p>{detail.company.location ?? "—"}</p>
                    </div>
                  </div>
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
                </CardContent>
              </Card>
            ) : null}
          </div>

          <aside className="space-y-4">
            <Card>
              <CardContent className="space-y-4 p-5">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Compensation</p>
                  <p className="text-lg font-semibold">
                    {formatSalary(detail.salaryMin, detail.salaryMax, detail.currency)}
                  </p>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Vacancies</p>
                    <p className="flex items-center gap-1 font-medium">
                      <Users className="h-3.5 w-3.5" /> {detail.vacancies}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Apply before</p>
                    <p className="font-medium">{formatDate(detail.deadline)}</p>
                  </div>
                </div>

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
                        <Send /> Apply now
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={toggleSave.isPending}
                      onClick={() => toggleSave.mutate()}
                    >
                      {isSaved ? <BookmarkCheck /> : <Bookmark />}
                      {isSaved ? "Saved" : "Save job"}
                    </Button>
                  </>
                ) : (
                  <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                    You are signed in as {titleCase(user.role)}. Only job seekers can apply to
                    postings.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="flex gap-3 p-5 text-sm">
                <Sparkles className="h-5 w-5 shrink-0 text-primary" />
                <p className="text-muted-foreground">
                  Match scores compare your profile skills with the posting requirements and are
                  attached to every application you submit.
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>

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
              <Label>Resume</Label>
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
                <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                  No resumes uploaded yet. You can still apply, but employers see more detail when
                  you attach one.{" "}
                  <Link to="/job-seeker/resumes" className="text-primary hover:underline">
                    Upload a resume
                  </Link>
                </p>
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
              <Send /> {apply.isPending ? "Submitting…" : "Submit application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PublicFooter />
    </div>
  );
}
