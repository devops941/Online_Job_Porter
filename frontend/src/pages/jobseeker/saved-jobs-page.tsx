import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/layout/app-shell";
import { JobCard } from "@/components/jobs/job-card";
import { EmptyState, PageHeader } from "@/components/shared/page-parts";
import { Skeleton } from "@/components/ui/skeleton";
import { apiErrorMessage } from "@/lib/api";
import { savedJobApi } from "@/lib/api-client";
import type { Job } from "@/types";

export default function SavedJobsPage() {
  const queryClient = useQueryClient();

  const saved = useQuery({
    queryKey: ["saved-jobs", "list"],
    queryFn: () => savedJobApi.list(1, 50),
  });

  const unsave = useMutation({
    mutationFn: (job: Job) => savedJobApi.remove(job.id),
    onSuccess: (_data, job) => {
      toast.success(`Removed “${job.title}” from saved jobs`);
      void queryClient.invalidateQueries({ queryKey: ["saved-jobs"] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  return (
    <AppShell>
      <PageHeader
        title="Saved jobs"
        description="Roles you bookmarked to review later."
      />

      {saved.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-56 w-full" />
          ))}
        </div>
      ) : saved.data?.items.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {saved.data.items
            .filter((item) => item.job)
            .map((item) => (
              <JobCard
                key={item.id}
                job={item.job as Job}
                saved
                onToggleSave={(job) => unsave.mutate(job)}
                savingDisabled={unsave.isPending}
              />
            ))}
        </div>
      ) : (
        <EmptyState
          icon={Bookmark}
          title="No saved jobs yet"
          description="Tap the bookmark icon on any job card to keep it here."
          actionLabel="Browse jobs"
          onAction={() => window.location.assign("/jobs")}
        />
      )}

      {saved.data && saved.data.items.some((item) => !item.job) ? (
        <p className="text-xs text-muted-foreground">
          Some saved roles are no longer published and were hidden.
        </p>
      ) : null}

      {saved.data?.items.length ? (
        <Button
          variant="outline"
          onClick={() => window.location.assign("/jobs")}
          className="w-fit"
        >
          Find more jobs
        </Button>
      ) : null}
    </AppShell>
  );
}
