import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Check, Globe, MapPin, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState, PageHeader } from "@/components/shared/page-parts";
import { Skeleton } from "@/components/ui/skeleton";
import { apiErrorMessage } from "@/lib/api";
import { profileApi } from "@/lib/api-client";
import { titleCase } from "@/lib/utils";

export default function AdminEmployersPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"pending" | "all">("pending");

  const employers = useQuery({
    queryKey: ["employers", tab],
    queryFn: () => (tab === "pending" ? profileApi.pendingEmployers() : profileApi.employers()),
  });

  const decide = useMutation({
    mutationFn: (payload: { id: string; approved: boolean }) =>
      profileApi.approveEmployer(payload.id, payload.approved),
    onSuccess: (_data, payload) => {
      toast.success(payload.approved ? "Employer approved" : "Employer rejected");
      void queryClient.invalidateQueries({ queryKey: ["employers"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard", "admin"] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  return (
    <AppShell>
      <PageHeader
        title="Employer approvals"
        description="Verify companies before they can publish job posts."
      />

      <Tabs value={tab} onValueChange={(value) => setTab(value as "pending" | "all")}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="all">All employers</TabsTrigger>
        </TabsList>
      </Tabs>

      {employers.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-32 w-full" />
          ))}
        </div>
      ) : employers.data?.length ? (
        <div className="space-y-3">
          {employers.data.map((employer) => (
            <Card key={employer.id}>
              <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <div className="rounded-md bg-muted p-2">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{employer.company?.name ?? "Unnamed company"}</p>
                      <Badge variant={employer.isApproved ? "success" : "warning"}>
                        {employer.isApproved ? "Approved" : "Pending"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {employer.user?.fullName} · {employer.user?.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {employer.designation ? `${employer.designation} · ` : ""}
                      {employer.company?.industry ?? "Industry not set"}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {employer.company?.location ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {employer.company.location}
                        </span>
                      ) : null}
                      {employer.company?.website ? (
                        <a
                          href={employer.company.website}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <Globe className="h-3.5 w-3.5" />
                          {employer.company.website.replace(/^https?:\/\//, "")}
                        </a>
                      ) : null}
                      <span>Role: {titleCase(employer.user?.role)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {!employer.isApproved ? (
                    <Button
                      size="sm"
                      disabled={decide.isPending}
                      onClick={() => decide.mutate({ id: employer.id, approved: true })}
                    >
                      <Check /> Approve
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={decide.isPending}
                      onClick={() => decide.mutate({ id: employer.id, approved: false })}
                    >
                      <X /> Revoke
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Building2}
          title={tab === "pending" ? "No employers awaiting approval" : "No employers found"}
          description={
            tab === "pending"
              ? "New employer registrations will appear here for review."
              : undefined
          }
        />
      )}
    </AppShell>
  );
}
