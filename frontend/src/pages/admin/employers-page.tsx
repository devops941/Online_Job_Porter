import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Check, Globe, MapPin, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState, PageHeader, TableSkeleton } from "@/components/shared/page-parts";
import { apiErrorMessage } from "@/lib/api";
import { profileApi } from "@/lib/api-client";

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
      toast.success(payload.approved ? "Company approved" : "Company approval revoked");
      void queryClient.invalidateQueries({ queryKey: ["employers"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard", "admin"] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  return (
    <AppShell>
      <PageHeader
        title="Company approvals"
        description="Verify companies before they can publish job posts."
      />

      <Tabs value={tab} onValueChange={(value) => setTab(value as "pending" | "all")}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="all">All companies</TabsTrigger>
        </TabsList>
      </Tabs>

      {employers.isLoading ? (
        <TableSkeleton rows={4} />
      ) : employers.data?.length ? (
        <div className="rounded-lg border bg-card">
          <div className="border-b px-5 py-3.5">
            <p className="text-sm font-semibold text-foreground">
              {tab === "pending" ? "Awaiting approval" : "Company accounts"}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {employers.data.length} {employers.data.length === 1 ? "record" : "records"}
              </span>
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Company
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Contact
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Location / Website
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Status
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {employers.data.map((employer) => (
                  <tr key={employer.id} className="hover:bg-muted/40">
                    {/* Company */}
                    <td className="px-5 py-4 align-top">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-md border bg-muted p-1.5">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">
                            {employer.company?.name ?? "Unnamed company"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {employer.company?.industry ?? "Industry not set"}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-5 py-4 align-top">
                      <p className="font-medium">{employer.user?.fullName ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{employer.user?.email}</p>
                      {employer.designation ? (
                        <p className="text-xs text-muted-foreground">{employer.designation}</p>
                      ) : null}
                    </td>

                    {/* Location / website */}
                    <td className="px-5 py-4 align-top">
                      <div className="space-y-1 text-xs text-muted-foreground">
                        {employer.company?.location ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            {employer.company.location}
                          </span>
                        ) : (
                          <span>—</span>
                        )}
                        {employer.company?.website ? (
                          <a
                            href={employer.company.website}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <Globe className="h-3.5 w-3.5 shrink-0" />
                            {employer.company.website.replace(/^https?:\/\//, "")}
                          </a>
                        ) : null}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4 align-top">
                      <Badge variant={employer.isApproved ? "success" : "warning"}>
                        {employer.isApproved ? "Approved" : "Pending"}
                      </Badge>
                    </td>

                    {/* Action */}
                    <td className="px-5 py-4 align-top">
                      <div className="flex justify-end">
                        {!employer.isApproved ? (
                          <Button
                            size="sm"
                            disabled={decide.isPending}
                            onClick={() => decide.mutate({ id: employer.id, approved: true })}
                          >
                            <Check className="h-3.5 w-3.5" />
                            Approve
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={decide.isPending}
                            onClick={() => decide.mutate({ id: employer.id, approved: false })}
                          >
                            <X className="h-3.5 w-3.5" />
                            Revoke
                          </Button>
                        )}
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
          icon={Building2}
          title={tab === "pending" ? "No companies awaiting approval" : "No companies found"}
          description={
            tab === "pending"
              ? "New company registrations will appear here for review."
              : undefined
          }
        />
      )}
    </AppShell>
  );
}
