import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/layout/app-shell";
import { JobListItem, JobListItemSkeleton } from "@/components/jobs/job-list-item";
import { EmptyState, PageHeader } from "@/components/shared/page-parts";
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
      toast.success(`Removed "${job.title}" from saved jobs`);
      void queryClient.invalidateQueries({ queryKey: ["saved-jobs"] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const visibleItems = saved.data?.items.filter((item) => item.job) ?? [];
  const hiddenCount = (saved.data?.items.length ?? 0) - visibleItems.length;

  return (
    <AppShell>
      <PageHeader
        title="Saved jobs"
        description="Roles you bookmarked to review later."
        action={
          visibleItems.length ? (
            <Button variant="outline" onClick={() => window.location.assign("/jobs")}>
              Find more jobs
            </Button>
          ) : undefined
        }
      />

      {saved.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <JobListItemSkeleton key={index} />
          ))}
        </div>
      ) : visibleItems.length ? (
        <div className="space-y-3">
          {visibleItems.map((item) => (
            <JobListItem
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
          description="Tap the bookmark icon on any job listing to keep it here."
          actionLabel="Browse jobs"
          onAction={() => window.location.assign("/jobs")}
        />
      )}

      {hiddenCount > 0 ? (
        <p className="text-xs text-muted-foreground">
          {hiddenCount} saved {hiddenCount === 1 ? "role is" : "roles are"} no longer published and{" "}
          {hiddenCount === 1 ? "was" : "were"} hidden.
        </p>
      ) : null}
    </AppShell>
  );
}
