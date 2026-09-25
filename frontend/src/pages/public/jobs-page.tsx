import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Filter, Loader2, RotateCcw, Search, SearchX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { PublicNavbar, PublicFooter } from "@/components/layout/public-navbar";
import { JobCard } from "@/components/jobs/job-card";
import { EmptyState } from "@/components/shared/page-parts";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/auth-context";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { apiErrorMessage } from "@/lib/api";
import { jobApi, savedJobApi, taxonomyApi } from "@/lib/api-client";
import { titleCase } from "@/lib/utils";
import type { Job } from "@/types";

const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "internship", "temporary"];
const WORK_MODES = ["onsite", "remote", "hybrid"];
const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "salary", label: "Highest salary" },
  { value: "popular", label: "Most viewed" },
];

const PAGE_SIZE = 9;

export default function JobsPage() {
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isSeeker = user?.role === "job_seeker";

  const [searchInput, setSearchInput] = useState(params.get("q") ?? "");
  const debouncedSearch = useDebouncedValue(searchInput, 400);

  const page = Number(params.get("page") ?? "1");
  const categoryId = params.get("categoryId") ?? "";
  const employmentType = params.get("employmentType") ?? "";
  const workMode = params.get("workMode") ?? "";
  const sort = params.get("sort") ?? "newest";
  const location = params.get("location") ?? "";
  const minSalary = params.get("salaryMin") ?? "";
  const skills = params.getAll("skills");

  const [selectedSkills, setSelectedSkills] = useState<string[]>(skills);
  const [locationInput, setLocationInput] = useState(location);
  const [salaryInput, setSalaryInput] = useState(minSalary);
  const debouncedLocation = useDebouncedValue(locationInput, 400);

  const updateParams = (patch: Record<string, string | string[] | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([key, value]) => {
      next.delete(key);
      if (Array.isArray(value)) value.forEach((entry) => next.append(key, entry));
      else if (value) next.set(key, value);
    });
    if (!("page" in patch)) next.set("page", "1");
    setParams(next, { replace: true });
  };

  // Mirror the debounced search box into the URL so the query key drives fetching.
  useEffect(() => {
    if (debouncedSearch !== (params.get("q") ?? "")) {
      updateParams({ q: debouncedSearch || null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  useEffect(() => {
    if (debouncedLocation !== (params.get("location") ?? "")) {
      updateParams({ location: debouncedLocation || null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedLocation]);

  const query = useMemo(
    () => ({
      q: params.get("q") ?? undefined,
      location: params.get("location") ?? undefined,
      categoryId: categoryId || undefined,
      employmentType: employmentType || undefined,
      workMode: workMode || undefined,
      salaryMin: minSalary ? Number(minSalary) : undefined,
      skills: selectedSkills.length ? selectedSkills : undefined,
      sort,
      page,
      pageSize: PAGE_SIZE,
    }),
    [params, categoryId, employmentType, workMode, minSalary, selectedSkills, sort, page],
  );

  const jobs = useQuery({
    queryKey: ["jobs", "search", query],
    queryFn: () => jobApi.search(query),
    placeholderData: (previous) => previous,
  });

  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => taxonomyApi.categories(),
  });

  const skillOptions = useQuery({
    queryKey: ["skills", "popular"],
    queryFn: () => taxonomyApi.skills(),
  });

  const savedJobs = useQuery({
    queryKey: ["saved-jobs", "ids"],
    queryFn: () => savedJobApi.list(1, 100),
    enabled: isSeeker,
  });

  const savedIds = useMemo(
    () => new Set(savedJobs.data?.items.map((item) => item.jobId) ?? []),
    [savedJobs.data],
  );

  const toggleSave = useMutation({
    mutationFn: async (job: Job) => {
      if (savedIds.has(job.id)) {
        await savedJobApi.remove(job.id);
        return { job, saved: false };
      }
      await savedJobApi.save(job.id);
      return { job, saved: true };
    },
    onSuccess: ({ job, saved }) => {
      toast.success(saved ? `Saved “${job.title}”` : `Removed “${job.title}”`);
      void queryClient.invalidateQueries({ queryKey: ["saved-jobs"] });
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Could not update saved jobs")),
  });

  const activeFilterCount =
    (categoryId ? 1 : 0) +
    (employmentType ? 1 : 0) +
    (workMode ? 1 : 0) +
    (minSalary ? 1 : 0) +
    (location ? 1 : 0) +
    selectedSkills.length;

  const clearFilters = () => {
    setSearchInput("");
    setLocationInput("");
    setSalaryInput("");
    setSelectedSkills([]);
    setParams(new URLSearchParams({ sort }), { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />

      <div className="container flex-1 py-8">
        <div className="mb-6 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Browse jobs</h1>
          <p className="text-sm text-muted-foreground">
            {jobs.data ? `${jobs.data.total} role${jobs.data.total === 1 ? "" : "s"} match your filters` : "Search approved openings"}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-4">
            <Card>
              <CardContent className="space-y-4 p-4">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <Filter className="h-4 w-4" /> Filters
                    {activeFilterCount > 0 ? (
                      <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                        {activeFilterCount}
                      </span>
                    ) : null}
                  </p>
                  {activeFilterCount > 0 ? (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <RotateCcw /> Reset
                    </Button>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <Label>Location</Label>
                  <Input
                    placeholder="City or Remote"
                    value={locationInput}
                    onChange={(event) => setLocationInput(event.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select
                    value={categoryId || "all"}
                    onValueChange={(value) =>
                      updateParams({ categoryId: value === "all" ? null : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
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
                    value={employmentType || "all"}
                    onValueChange={(value) =>
                      updateParams({ employmentType: value === "all" ? null : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any type</SelectItem>
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
                    value={workMode || "all"}
                    onValueChange={(value) => updateParams({ workMode: value === "all" ? null : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any mode</SelectItem>
                      {WORK_MODES.map((mode) => (
                        <SelectItem key={mode} value={mode}>
                          {titleCase(mode)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Minimum salary (USD / month)</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="e.g. 15000"
                    value={salaryInput}
                    onChange={(event) => setSalaryInput(event.target.value)}
                    onBlur={() => updateParams({ salaryMin: salaryInput || null })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Skills</Label>
                  <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                    {skillOptions.isLoading
                      ? Array.from({ length: 6 }).map((_, index) => (
                          <Skeleton key={index} className="h-5 w-full" />
                        ))
                      : skillOptions.data?.slice(0, 30).map((skill) => (
                          <label key={skill.id} className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={selectedSkills.includes(skill.name)}
                              onCheckedChange={(checked) => {
                                const next = checked
                                  ? [...selectedSkills, skill.name]
                                  : selectedSkills.filter((entry) => entry !== skill.name);
                                setSelectedSkills(next);
                                updateParams({ skills: next });
                              }}
                            />
                            {skill.name}
                          </label>
                        ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>

          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search job title, skill or keyword"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                />
              </div>
              <Select value={sort} onValueChange={(value) => updateParams({ sort: value })}>
                <SelectTrigger className="sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORTS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {jobs.isLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-56 w-full" />
                ))}
              </div>
            ) : jobs.isError ? (
              <EmptyState
                icon={SearchX}
                title="Could not load jobs"
                description={apiErrorMessage(jobs.error)}
                actionLabel="Try again"
                onAction={() => void jobs.refetch()}
              />
            ) : jobs.data && jobs.data.items.length > 0 ? (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  {jobs.data.items.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      saved={savedIds.has(job.id)}
                      onToggleSave={isSeeker ? (entry) => toggleSave.mutate(entry) : undefined}
                      savingDisabled={toggleSave.isPending}
                    />
                  ))}
                </div>

                {jobs.data.pages > 1 ? (
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => updateParams({ page: String(page - 1) })}
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
                      onClick={() => updateParams({ page: String(page + 1) })}
                    >
                      Next
                    </Button>
                  </div>
                ) : null}
              </>
            ) : (
              <EmptyState
                icon={SearchX}
                title="No jobs match those filters"
                description="Try widening the salary range, removing a skill or searching a different keyword."
                actionLabel={activeFilterCount > 0 ? "Clear filters" : undefined}
                onAction={activeFilterCount > 0 ? clearFilters : undefined}
              />
            )}

            {jobs.isFetching && !jobs.isLoading ? (
              <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Refreshing results
              </p>
            ) : null}
          </section>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
