import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellOff, BellPlus, BellRing, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState, PageHeader, TableSkeleton } from "@/components/shared/page-parts";
import { apiErrorMessage } from "@/lib/api";
import { alertApi, taxonomyApi } from "@/lib/api-client";
import { titleCase } from "@/lib/utils";

const FREQUENCIES = ["instant", "daily", "weekly"];

export default function JobAlertsPage() {
  const queryClient = useQueryClient();
  const [keywords, setKeywords] = useState("");
  const [location, setLocation] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [frequency, setFrequency] = useState("daily");

  const alerts = useQuery({
    queryKey: ["job-alerts"],
    queryFn: () => alertApi.list(),
  });

  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => taxonomyApi.categories(),
  });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["job-alerts"] });

  const create = useMutation({
    mutationFn: () =>
      alertApi.create({
        keywords: keywords || undefined,
        location: location || undefined,
        categoryId: categoryId || undefined,
        frequency,
      }),
    onSuccess: () => {
      toast.success("Job alert created");
      setKeywords("");
      setLocation("");
      setCategoryId("");
      invalidate();
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const toggle = useMutation({
    mutationFn: (payload: { id: string; isActive: boolean }) =>
      alertApi.update(payload.id, { isActive: payload.isActive }),
    onSuccess: () => {
      toast.success("Alert updated");
      invalidate();
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => alertApi.remove(id),
    onSuccess: () => {
      toast.success("Alert deleted");
      invalidate();
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  return (
    <AppShell>
      <PageHeader
        title="Job alerts"
        description="Get notified when new roles match your criteria."
      />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Create alert form */}
        <div className="rounded-lg border bg-card">
          <div className="border-b px-5 py-3.5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <BellPlus className="h-4 w-4 text-muted-foreground" />
              Create an alert
            </h2>
          </div>
          <div className="space-y-4 px-5 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="keywords" className="text-xs font-medium">
                Keywords
              </Label>
              <Input
                id="keywords"
                placeholder="python backend"
                value={keywords}
                onChange={(event) => setKeywords(event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="alertLocation" className="text-xs font-medium">
                Location
              </Label>
              <Input
                id="alertLocation"
                placeholder="Remote or Bengaluru"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Category</Label>
              <Select
                value={categoryId || "any"}
                onValueChange={(value) => setCategoryId(value === "any" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any category</SelectItem>
                  {categories.data?.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {titleCase(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full"
              disabled={create.isPending || (!keywords && !location && !categoryId)}
              onClick={() => create.mutate()}
            >
              <BellPlus className="mr-1.5 h-4 w-4" />
              {create.isPending ? "Creating…" : "Create alert"}
            </Button>
          </div>
        </div>

        {/* Alerts list */}
        <div>
          {alerts.isLoading ? (
            <div className="rounded-lg border bg-card">
              <div className="border-b px-5 py-3">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              </div>
              <div className="p-4">
                <TableSkeleton rows={3} />
              </div>
            </div>
          ) : alerts.data?.length ? (
            <div className="rounded-lg border bg-card">
              <div className="border-b px-5 py-3.5">
                <h2 className="text-sm font-semibold text-foreground">
                  Your alerts ({alerts.data.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Keywords
                      </th>
                      <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground sm:table-cell">
                        Location
                      </th>
                      <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground md:table-cell">
                        Frequency
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {alerts.data.map((alert) => (
                      <tr key={alert.id} className="hover:bg-muted/40">
                        <td className="px-5 py-3.5">
                          <span className="font-medium text-foreground">
                            {alert.keywords || (
                              <span className="text-muted-foreground">All jobs</span>
                            )}
                          </span>
                          {/* Location on mobile */}
                          <p className="mt-0.5 text-xs text-muted-foreground sm:hidden">
                            {alert.location ?? "Any location"}
                          </p>
                        </td>
                        <td className="hidden px-4 py-3.5 text-xs text-muted-foreground sm:table-cell">
                          {alert.location ?? "Any location"}
                        </td>
                        <td className="hidden px-4 py-3.5 md:table-cell">
                          <Badge variant="outline" className="text-[11px] px-2 py-0.5 font-medium">
                            {titleCase(alert.frequency)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge
                            variant={alert.isActive ? "success" : "secondary"}
                            className="text-[11px] px-2 py-0.5 font-medium"
                          >
                            {alert.isActive ? "Active" : "Paused"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2.5 text-xs"
                              disabled={toggle.isPending}
                              onClick={() =>
                                toggle.mutate({ id: alert.id, isActive: !alert.isActive })
                              }
                            >
                              {alert.isActive ? (
                                <>
                                  <BellOff className="mr-1 h-3 w-3" />
                                  Pause
                                </>
                              ) : (
                                <>
                                  <BellRing className="mr-1 h-3 w-3" />
                                  Resume
                                </>
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              aria-label="Delete alert"
                              disabled={remove.isPending}
                              onClick={() => remove.mutate(alert.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={BellRing}
              title="No job alerts yet"
              description="Create an alert and we will surface matching roles as they are approved."
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
