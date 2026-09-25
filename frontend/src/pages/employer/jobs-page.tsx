import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Briefcase, Eye, Pencil, Plus, Trash2, Users } from "lucide-react";
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
import { JobStatusBadge } from "@/components/shared/status-badges";
import { Skeleton } from "@/components/ui/skeleton";
import { apiErrorMessage } from "@/lib/api";
import { jobApi, taxonomyApi } from "@/lib/api-client";
import { formatDate, formatSalary, titleCase } from "@/lib/utils";
import type { Job } from "@/types";

const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "internship", "temporary"];
const WORK_MODES = ["onsite", "remote", "hybrid"];

interface JobFormState {
  title: string;
  description: string;
  requirements: string;
  responsibilities: string;
  location: string;
  categoryId: string;
  employmentType: string;
  workMode: string;
  salaryMin: string;
  salaryMax: string;
  experienceMin: string;
  experienceMax: string;
  vacancies: string;
  deadline: string;
  skills: string;
}

const EMPTY_FORM: JobFormState = {
  title: "",
  description: "",
  requirements: "",
  responsibilities: "",
  location: "",
  categoryId: "",
  employmentType: "full_time",
  workMode: "onsite",
  salaryMin: "",
  salaryMax: "",
  experienceMin: "",
  experienceMax: "",
  vacancies: "1",
  deadline: "",
  skills: "",
};

function toForm(job: Job): JobFormState {
  return {
    title: job.title,
    description: job.description,
    requirements: job.requirements ?? "",
    responsibilities: job.responsibilities ?? "",
    location: job.location,
    categoryId: job.category?.id ?? "",
    employmentType: job.employmentType,
    workMode: job.workMode,
    salaryMin: job.salaryMin?.toString() ?? "",
    salaryMax: job.salaryMax?.toString() ?? "",
    experienceMin: job.experienceMin?.toString() ?? "",
    experienceMax: job.experienceMax?.toString() ?? "",
    vacancies: job.vacancies?.toString() ?? "1",
    deadline: job.deadline ? job.deadline.slice(0, 10) : "",
    skills: (job.skills ?? []).join(", "),
  };
}

export default function EmployerJobsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Job | null>(null);
  const [form, setForm] = useState<JobFormState>(EMPTY_FORM);

  const jobs = useQuery({
    queryKey: ["jobs", "mine", page],
    queryFn: () => jobApi.mine({ page, pageSize: 10 }),
    placeholderData: (previous) => previous,
  });

  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => taxonomyApi.categories(),
  });

  useEffect(() => {
    if (dialogOpen) {
      setForm(editing ? toForm(editing) : EMPTY_FORM);
    }
  }, [dialogOpen, editing]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["jobs"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard", "employer"] });
  };

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        requirements: form.requirements.trim() || undefined,
        responsibilities: form.responsibilities.trim() || undefined,
        location: form.location.trim(),
        categoryId: form.categoryId || undefined,
        employmentType: form.employmentType,
        workMode: form.workMode,
        salaryMin: form.salaryMin ? Number(form.salaryMin) : undefined,
        salaryMax: form.salaryMax ? Number(form.salaryMax) : undefined,
        experienceMin: form.experienceMin ? Number(form.experienceMin) : undefined,
        experienceMax: form.experienceMax ? Number(form.experienceMax) : undefined,
        vacancies: form.vacancies ? Number(form.vacancies) : 1,
        deadline: form.deadline ? new Date(`${form.deadline}T00:00:00Z`).toISOString() : undefined,
        skills: form.skills
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean),
      };
      return editing ? jobApi.update(editing.id, payload) : jobApi.create(payload);
    },
    onSuccess: (job) => {
      toast.success(
        editing
          ? "Job updated and sent for re-approval"
          : "Job submitted — an administrator will review it",
      );
      if (job.status === "pending") {
        toast.info("Pending listings stay hidden from job seekers until approved.");
      }
      setDialogOpen(false);
      setEditing(null);
      invalidate();
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Could not save the job")),
  });

  const close = useMutation({
    mutationFn: (job: Job) => jobApi.close(job.id),
    onSuccess: () => {
      toast.success("Job posting closed");
      invalidate();
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  return (
    <AppShell>
      <PageHeader
        title="My job posts"
        description="Create, edit and close your openings. New posts are reviewed by an admin."
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus /> New job post
          </Button>
        }
      />

      {jobs.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
      ) : jobs.data?.items.length ? (
        <>
          <div className="space-y-3">
            {jobs.data.items.map((job) => (
              <Card key={job.id}>
                <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/jobs/${job.id}`}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {job.title}
                      </Link>
                      <JobStatusBadge status={job.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {job.location} · {titleCase(job.employmentType)} ·{" "}
                      {formatSalary(job.salaryMin, job.salaryMax, job.currency)}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {job.views} views
                      </span>
                      <span>Posted {formatDate(job.createdAt)}</span>
                      {job.deadline ? <span>Closes {formatDate(job.deadline)}</span> : null}
                      {job.skills?.length ? <span>{job.skills.length} skills</span> : null}
                    </div>
                    {job.status === "rejected" && job.rejectionReason ? (
                      <p className="rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive">
                        Rejected: {job.rejectionReason}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/employer/applicants?jobId=${job.id}`}>
                        <Eye /> Applicants
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditing(job);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Close job"
                      disabled={close.isPending}
                      onClick={() => close.mutate(job)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {jobs.data.pages > 1 ? (
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
                Page {jobs.data.page} of {jobs.data.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= jobs.data.pages}
                onClick={() => setPage((value) => value + 1)}
              >
                Next
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <EmptyState
          icon={Briefcase}
          title="No job posts yet"
          description="Publish your first opening and start collecting applications."
          actionLabel="Create job post"
          onAction={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        />
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit job post" : "Create a job post"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Edits are re-reviewed by an administrator before going live again."
                : "Provide clear details so candidates can assess fit quickly."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="title">Job title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={4}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="responsibilities">Responsibilities</Label>
              <Textarea
                id="responsibilities"
                rows={3}
                value={form.responsibilities}
                onChange={(event) => setForm({ ...form, responsibilities: event.target.value })}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="requirements">Requirements</Label>
              <Textarea
                id="requirements"
                rows={3}
                value={form.requirements}
                onChange={(event) => setForm({ ...form, requirements: event.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="Bengaluru, India or Remote"
                value={form.location}
                onChange={(event) => setForm({ ...form, location: event.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={form.categoryId || "none"}
                onValueChange={(value) =>
                  setForm({ ...form, categoryId: value === "none" ? "" : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.data?.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Employment type</Label>
              <Select
                value={form.employmentType}
                onValueChange={(value) => setForm({ ...form, employmentType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {titleCase(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Work mode</Label>
              <Select
                value={form.workMode}
                onValueChange={(value) => setForm({ ...form, workMode: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORK_MODES.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {titleCase(mode)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="salaryMin">Salary min (monthly)</Label>
              <Input
                id="salaryMin"
                type="number"
                min={0}
                value={form.salaryMin}
                onChange={(event) => setForm({ ...form, salaryMin: event.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="salaryMax">Salary max (monthly)</Label>
              <Input
                id="salaryMax"
                type="number"
                min={0}
                value={form.salaryMax}
                onChange={(event) => setForm({ ...form, salaryMax: event.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="experienceMin">Experience min (years)</Label>
              <Input
                id="experienceMin"
                type="number"
                min={0}
                value={form.experienceMin}
                onChange={(event) => setForm({ ...form, experienceMin: event.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="experienceMax">Experience max (years)</Label>
              <Input
                id="experienceMax"
                type="number"
                min={0}
                value={form.experienceMax}
                onChange={(event) => setForm({ ...form, experienceMax: event.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vacancies">Vacancies</Label>
              <Input
                id="vacancies"
                type="number"
                min={1}
                value={form.vacancies}
                onChange={(event) => setForm({ ...form, vacancies: event.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="deadline">Application deadline</Label>
              <Input
                id="deadline"
                type="date"
                value={form.deadline}
                onChange={(event) => setForm({ ...form, deadline: event.target.value })}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="skills">Skills (comma separated)</Label>
              <Input
                id="skills"
                placeholder="Python, FastAPI, MongoDB"
                value={form.skills}
                onChange={(event) => setForm({ ...form, skills: event.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Skills drive candidate match scores, so list the ones that really matter.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                save.isPending || !form.title.trim() || !form.description.trim() || !form.location.trim()
              }
              onClick={() => save.mutate()}
            >
              {save.isPending ? "Saving…" : editing ? "Save changes" : "Submit for review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
