import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Star, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState, PageHeader } from "@/components/shared/page-parts";
import { Skeleton } from "@/components/ui/skeleton";
import { apiErrorMessage } from "@/lib/api";
import { resumeApi, triggerDownload } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

const ACCEPT = ".pdf,.doc,.docx";
const MAX_BYTES = 5 * 1024 * 1024;

export default function ResumesPage() {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const resumes = useQuery({
    queryKey: ["resumes"],
    queryFn: () => resumeApi.list(),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["resumes"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard", "job-seeker"] });
  };

  const setPrimary = useMutation({
    mutationFn: (id: string) => resumeApi.setPrimary(id),
    onSuccess: () => {
      toast.success("Primary resume updated");
      invalidate();
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => resumeApi.remove(id),
    onSuccess: () => {
      toast.success("Resume deleted");
      invalidate();
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const download = useMutation({
    mutationFn: async (resume: { id: string; fileName: string }) => {
      const blob = await resumeApi.download(resume.id);
      triggerDownload(blob, resume.fileName);
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Could not download the resume")),
  });

  const onFileSelected = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast.error("Resumes must be 5 MB or smaller.");
      return;
    }
    setUploading(true);
    try {
      const resume = await resumeApi.upload(file);
      toast.success(
        resume.parsedSkills.length
          ? `Uploaded — detected ${resume.parsedSkills.length} skills`
          : "Resume uploaded",
      );
      invalidate();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not upload the resume"));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Resumes"
        description="Upload a PDF or Word resume (max 5 MB). Skills are parsed automatically."
        action={
          <>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(event) => void onFileSelected(event.target.files?.[0])}
            />
            <Button disabled={uploading} onClick={() => inputRef.current?.click()}>
              <Upload /> {uploading ? "Uploading…" : "Upload resume"}
            </Button>
          </>
        }
      />

      {resumes.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
      ) : resumes.data?.length ? (
        <div className="space-y-3">
          {resumes.data.map((resume) => (
            <Card key={resume.id}>
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <div className="rounded-md bg-muted p-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{resume.fileName}</p>
                      {resume.isPrimary ? <Badge variant="success">Primary</Badge> : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {resume.fileType.toUpperCase()} · {(resume.fileSize / 1024).toFixed(0)} KB ·
                      uploaded {formatDate(resume.createdAt)}
                    </p>
                    {resume.parsedSkills.length ? (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {resume.parsedSkills.slice(0, 10).map((skill) => (
                          <span
                            key={skill}
                            className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                        {resume.parsedSkills.length > 10 ? (
                          <span className="text-xs text-muted-foreground">
                            +{resume.parsedSkills.length - 10} more
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No skills detected — consider adding a skills section to your resume.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {!resume.isPrimary ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={setPrimary.isPending}
                      onClick={() => setPrimary.mutate(resume.id)}
                    >
                      <Star /> Make primary
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => download.mutate({ id: resume.id, fileName: resume.fileName })}
                  >
                    <Download /> Download
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete resume"
                    onClick={() => remove.mutate(resume.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title="No resumes uploaded"
          description="Upload a resume so employers can review your experience when you apply."
          actionLabel="Upload resume"
          onAction={() => inputRef.current?.click()}
        />
      )}
    </AppShell>
  );
}
