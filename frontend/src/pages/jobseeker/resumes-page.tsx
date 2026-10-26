import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Cloud,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Loader2,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState, PageHeader, SkillChips, TableSkeleton } from "@/components/shared/page-parts";
import { apiErrorMessage } from "@/lib/api";
import { resumeApi, triggerDownload } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import type { Resume } from "@/types";

const ACCEPT = ".pdf,.docx,.doc,.txt,.rtf";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const FORMAT_BADGES = [
  { ext: "PDF", desc: "Adobe Acrobat (.pdf)", color: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400" },
  { ext: "Word", desc: "Microsoft Word (.docx, .doc)", color: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { ext: "Text", desc: "Plain Text (.txt)", color: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  { ext: "RTF", desc: "Rich Text Format (.rtf)", color: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400" },
];

export default function ResumesPage() {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Upload options modal state
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [isPrimaryOption, setIsPrimaryOption] = useState(false);
  const [selectedFormatFilter, setSelectedFormatFilter] = useState<"ALL" | "PDF" | "WORD" | "TXT">("ALL");

  // In-browser Preview modal state
  const [previewResume, setPreviewResume] = useState<Resume | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

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
      toast.success("Resume deleted from Cloudinary & database");
      invalidate();
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const download = useMutation({
    mutationFn: async (resume: { id: string; fileName: string }) => {
      const blob = await resumeApi.download(resume.id, false);
      triggerDownload(blob, resume.fileName);
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Could not download the resume")),
  });

  const onFileSelected = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast.error("File exceeds 10 MB limit.");
      return;
    }
    // Set pending file and open upload options modal
    setPendingFile(file);
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    setCustomTitle(baseName);
    setIsPrimaryOption(Boolean(!resumes.data?.length));
    setUploadModalOpen(true);
  };

  const handleConfirmUpload = async () => {
    if (!pendingFile) return;
    setUploading(true);
    try {
      const resume = await resumeApi.upload(pendingFile, {
        isPrimary: isPrimaryOption,
        customTitle: customTitle.trim() || undefined,
      });
      toast.success(
        resume.parsedSkills.length
          ? `Uploaded to Cloudinary! Detected ${resume.parsedSkills.length} skills.`
          : "Uploaded to Cloudinary successfully!",
      );
      setUploadModalOpen(false);
      setPendingFile(null);
      invalidate();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not upload the resume"));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    onFileSelected(event.dataTransfer.files?.[0]);
  };

  const handleOpenPreview = async (resume: Resume) => {
    setPreviewResume(resume);
    setLoadingPreview(true);
    setPreviewBlobUrl(null);
    setPreviewText(null);
    try {
      const blob = await resumeApi.download(resume.id, true);
      const isTxt = resume.fileName.toLowerCase().endsWith(".txt") || resume.fileType.includes("text/plain");
      if (isTxt) {
        const text = await blob.text();
        setPreviewText(text);
      } else {
        const objectUrl = URL.createObjectURL(blob);
        setPreviewBlobUrl(objectUrl);
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to load document preview"));
      setPreviewResume(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleClosePreview = () => {
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
    }
    setPreviewResume(null);
    setPreviewBlobUrl(null);
    setPreviewText(null);
  };

  return (
    <AppShell>
      <PageHeader
        title="Resumes & Documents"
        description="Upload resumes in PDF, Word, or Text formats. Hosted securely on Cloudinary with automatic skill extraction."
      />

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(event) => onFileSelected(event.target.files?.[0])}
      />

      {/* Upload Zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload resume — click or drag a file here"
        className={[
          "flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-8 text-center transition-all",
          dragging
            ? "border-primary bg-primary/5 scale-[0.99]"
            : "border-border bg-card hover:border-primary/60 hover:bg-muted/30 shadow-xs",
        ].join(" ")}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Upload className="h-6 w-6" />
        </div>

        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">
            {uploading ? "Uploading to Cloudinary…" : "Click to upload or drag & drop"}
          </p>
          <p className="text-xs text-muted-foreground">
            Supports PDF, Word (.docx, .doc), Plain Text (.txt), and RTF up to 10 MB
          </p>
        </div>

        {/* Accepted Formats Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          {FORMAT_BADGES.map((fmt) => (
            <span
              key={fmt.ext}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${fmt.color}`}
            >
              <FileText className="h-3 w-3" />
              {fmt.ext}
            </span>
          ))}
          <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-[11px] font-medium text-sky-600 dark:text-sky-400">
            <Cloud className="h-3 w-3" />
            Cloudinary Storage
          </span>
        </div>

        {!uploading && (
          <Button
            size="sm"
            variant="default"
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
            disabled={uploading}
            className="mt-1"
          >
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Select Document
          </Button>
        )}
      </div>

      {/* Resume list */}
      {resumes.isLoading ? (
        <div className="rounded-lg border bg-card">
          <div className="border-b px-5 py-3">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          </div>
          <div className="p-4">
            <TableSkeleton rows={3} />
          </div>
        </div>
      ) : resumes.data?.length ? (
        <div className="rounded-xl border bg-card shadow-xs">
          <div className="border-b px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-sm font-semibold text-foreground">
                Your Resumes & Documents ({resumes.data.length})
              </h2>
              <div className="flex items-center gap-1">
                {(["ALL", "PDF", "WORD", "TXT"] as const).map((fmt) => {
                  const count =
                    fmt === "ALL"
                      ? resumes.data.length
                      : resumes.data.filter((r) => {
                          const lower = r.fileName.toLowerCase();
                          if (fmt === "PDF") return lower.endsWith(".pdf");
                          if (fmt === "WORD") return lower.endsWith(".docx") || lower.endsWith(".doc");
                          if (fmt === "TXT") return lower.endsWith(".txt") || lower.endsWith(".rtf");
                          return false;
                        }).length;
                  return (
                    <button
                      key={fmt}
                      type="button"
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                        selectedFormatFilter === fmt
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                      onClick={() => setSelectedFormatFilter(fmt)}
                    >
                      {fmt} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Cloud className="h-3.5 w-3.5 text-primary" /> Cloudinary Verified
            </span>
          </div>

          <div className="divide-y divide-border">
            {resumes.data
              .filter((resume) => {
                const lower = resume.fileName.toLowerCase();
                if (selectedFormatFilter === "PDF") return lower.endsWith(".pdf");
                if (selectedFormatFilter === "WORD") return lower.endsWith(".docx") || lower.endsWith(".doc");
                if (selectedFormatFilter === "TXT") return lower.endsWith(".txt") || lower.endsWith(".rtf");
                return true;
              })
              .map((resume) => {
              const isPdf = resume.fileName.toLowerCase().endsWith(".pdf");
              const isWord = resume.fileName.toLowerCase().endsWith(".docx") || resume.fileName.toLowerCase().endsWith(".doc");
              const isTxt = resume.fileName.toLowerCase().endsWith(".txt");

              return (
                <div
                  key={resume.id}
                  className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-start sm:justify-between hover:bg-muted/40 transition-colors"
                >
                  {/* Left: icon + info */}
                  <div className="flex min-w-0 gap-3.5">
                    <div
                      className={`shrink-0 rounded-lg border p-2.5 ${
                        isPdf
                          ? "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400"
                          : isWord
                          ? "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          : isTxt
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "border-border bg-muted text-muted-foreground"
                      }`}
                    >
                      <FileText className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold text-foreground">
                          {resume.fileName}
                        </span>
                        {resume.isPrimary ? (
                          <Badge variant="success" className="text-[11px] px-2 py-0.5 font-medium">
                            <Star className="mr-1 h-3 w-3 fill-current" /> Primary
                          </Badge>
                        ) : null}
                        <Badge variant="outline" className="text-[10px] uppercase font-mono">
                          {isPdf ? "PDF" : isWord ? "DOCX" : isTxt ? "TXT" : "DOC"}
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        {(resume.fileSize / 1024).toFixed(0)} KB &middot; uploaded{" "}
                        {formatDate(resume.createdAt)} &middot; Cloudinary Hosted
                      </p>

                      {resume.parsedSkills.length ? (
                        <div className="pt-0.5">
                          <SkillChips skills={resume.parsedSkills} limit={10} />
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          No skills detected — adding standard skill keywords helps your match score.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: actions */}
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {/* Preview Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs"
                      onClick={() => void handleOpenPreview(resume)}
                    >
                      <Eye className="mr-1.5 h-3.5 w-3.5 text-primary" />
                      Preview
                    </Button>

                    {!resume.isPrimary ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-xs"
                        disabled={setPrimary.isPending}
                        onClick={() => setPrimary.mutate(resume.id)}
                      >
                        <Star className="mr-1.5 h-3.5 w-3.5" />
                        Make Primary
                      </Button>
                    ) : null}

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs"
                      onClick={() => download.mutate({ id: resume.id, fileName: resume.fileName })}
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      Download
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      aria-label="Delete resume"
                      onClick={() => remove.mutate(resume.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title="No resumes uploaded"
          description="Upload your resume in PDF, Word or Text format so employers can review your profile."
          actionLabel="Upload Resume"
          onAction={() => inputRef.current?.click()}
        />
      )}

      {/* ── Dialog 1: Upload Options Modal ─────────────────── */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5 text-primary" />
              Upload Options
            </DialogTitle>
            <DialogDescription>
              Configure resume details before uploading to Cloudinary storage.
            </DialogDescription>
          </DialogHeader>

          {pendingFile && (
            <div className="space-y-4 py-2">
              {/* File Info Card */}
              <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                <FileText className="h-8 w-8 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{pendingFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(pendingFile.size / 1024).toFixed(0)} KB &middot;{" "}
                    {pendingFile.name.split(".").pop()?.toUpperCase()} format
                  </p>
                </div>
              </div>

              {/* Title / Label Input */}
              <div className="space-y-1.5">
                <Label htmlFor="customTitle">Display Title / Label</Label>
                <Input
                  id="customTitle"
                  placeholder="e.g. Full-Stack Developer Resume"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Give this version a recognizable title for employers.
                </p>
              </div>

              {/* Quick Specialization Tags */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Quick Specialization Tags</Label>
                <div className="flex flex-wrap gap-1.5">
                  {["Full Stack", "Frontend", "Backend", "Data & AI", "DevOps", "Fresher"].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground hover:border-primary/50 hover:bg-accent hover:text-foreground transition-colors"
                      onClick={() => {
                        const base = pendingFile.name.replace(/\.[^/.]+$/, "");
                        setCustomTitle(`${base} (${tag})`);
                      }}
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Make Primary Checkbox */}
              <div className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-muted/30 transition-colors">
                <Checkbox
                  id="makePrimary"
                  checked={isPrimaryOption}
                  onCheckedChange={(checked) => setIsPrimaryOption(Boolean(checked))}
                />
                <div className="grid gap-0.5 leading-none">
                  <Label htmlFor="makePrimary" className="cursor-pointer text-sm font-medium">
                    Set as Primary Resume
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically attached when applying to jobs.
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              disabled={uploading}
              onClick={() => {
                setUploadModalOpen(false);
                setPendingFile(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
            >
              Cancel
            </Button>
            <Button disabled={uploading} onClick={() => void handleConfirmUpload()}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading to Cloudinary…
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog 2: In-Browser Document Preview Modal ────────────── */}
      <Dialog open={Boolean(previewResume)} onOpenChange={handleClosePreview}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-4 sm:p-6">
          <DialogHeader className="border-b pb-3 flex flex-row items-center justify-between gap-4">
            <div className="min-w-0">
              <DialogTitle className="truncate flex items-center gap-2 text-base font-semibold">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                {previewResume?.fileName}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {previewResume?.parsedSkills.length
                  ? `${previewResume.parsedSkills.length} skills detected in this resume`
                  : "Document preview"}
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
              {previewResume && (
                <Button
                  variant="default"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() =>
                    download.mutate({
                      id: previewResume.id,
                      fileName: previewResume.fileName,
                    })
                  }
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
                <p className="text-sm text-muted-foreground">Loading document preview…</p>
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
                title={previewResume?.fileName || "Resume preview"}
                className="h-full w-full rounded-lg border bg-background"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
                <FileText className="h-12 w-12 text-muted-foreground" />
                <p className="text-sm font-medium">Document preview not available directly</p>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Word and proprietary documents can be downloaded and opened with Microsoft Word or Google Docs.
                </p>
                {previewResume && (
                  <Button
                    size="sm"
                    onClick={() =>
                      download.mutate({
                        id: previewResume.id,
                        fileName: previewResume.fileName,
                      })
                    }
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
