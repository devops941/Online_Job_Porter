import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellPlus, BellRing, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { EmptyState, PageHeader } from "@/components/shared/page-parts";
import { Skeleton } from "@/components/ui/skeleton";
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

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardContent className="space-y-4 p-5">
            <p className="flex items-center gap-2 font-medium">
              <BellPlus className="h-4 w-4" /> Create an alert
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="keywords">Keywords</Label>
              <Input
                id="keywords"
                placeholder="python backend"
                value={keywords}
                onChange={(event) => setKeywords(event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="alertLocation">Location</Label>
              <Input
                id="alertLocation"
                placeholder="Remote or Bengaluru"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Category</Label>
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
              <Label>Frequency</Label>
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
              <BellPlus /> {create.isPending ? "Creating…" : "Create alert"}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {alerts.isLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full" />
            ))
          ) : alerts.data?.length ? (
            alerts.data.map((alert) => (
              <Card key={alert.id}>
                <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{alert.keywords || "All jobs"}</p>
                      <Badge variant={alert.isActive ? "success" : "secondary"}>
                        {alert.isActive ? "Active" : "Paused"}
                      </Badge>
                      <Badge variant="outline">{titleCase(alert.frequency)}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {alert.location ? `Location: ${alert.location}` : "Any location"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggle.mutate({ id: alert.id, isActive: !alert.isActive })}
                    >
                      <BellRing /> {alert.isActive ? "Pause" : "Resume"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete alert"
                      onClick={() => remove.mutate(alert.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
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
