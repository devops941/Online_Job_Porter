import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, CheckCircle2, Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState, PageHeader } from "@/components/shared/page-parts";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { apiErrorMessage } from "@/lib/api";
import { userApi } from "@/lib/api-client";
import { formatDate, initials, titleCase } from "@/lib/utils";
import type { Role, User } from "@/types";

const ROLES: (Role | "all")[] = ["all", "job_seeker", "employer", "admin"];

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [term, setTerm] = useState("");
  const [role, setRole] = useState<Role | "all">("all");
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<User | null>(null);
  const debounced = useDebouncedValue(term, 400);

  const users = useQuery({
    queryKey: ["users", { debounced, role, page }],
    queryFn: () =>
      userApi.list({
        q: debounced || undefined,
        role: role === "all" ? undefined : role,
        page,
        pageSize: 15,
      }),
    placeholderData: (previous) => previous,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["users"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard", "admin"] });
  };

  const setBlocked = useMutation({
    mutationFn: (payload: { id: string; blocked: boolean }) =>
      userApi.setBlocked(payload.id, payload.blocked),
    onSuccess: (_data, payload) => {
      toast.success(payload.blocked ? "User suspended" : "User reinstated");
      invalidate();
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => userApi.remove(id),
    onSuccess: () => {
      toast.success("User deleted");
      setPendingDelete(null);
      invalidate();
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Could not delete the user")),
  });

  return (
    <AppShell>
      <PageHeader
        title="Users"
        description="Search accounts, suspend abusive users and manage roles."
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name or email"
            value={term}
            onChange={(event) => {
              setTerm(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={role}
          onValueChange={(value) => {
            setRole(value as Role | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((option) => (
              <SelectItem key={option} value={option}>
                {option === "all" ? "All roles" : titleCase(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {users.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : users.data?.items.length ? (
        <>
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Joined</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.data.items.map((user) => (
                    <tr key={user.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                            {initials(user.fullName)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{user.fullName}</p>
                            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{titleCase(user.role)}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant={user.isActive ? "success" : "destructive"}>
                            {user.isActive ? "Active" : "Suspended"}
                          </Badge>
                          {user.isVerified ? (
                            <Badge variant="outline">Verified</Badge>
                          ) : (
                            <Badge variant="warning">Unverified</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          {user.role !== "admin" ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={setBlocked.isPending}
                                onClick={() =>
                                  setBlocked.mutate({ id: user.id, blocked: user.isActive })
                                }
                              >
                                {user.isActive ? (
                                  <>
                                    <Ban /> Suspend
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 /> Reinstate
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Delete user"
                                onClick={() => setPendingDelete(user)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">Protected</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {users.data.pages > 1 ? (
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
                Page {users.data.page} of {users.data.pages} · {users.data.total} users
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= users.data.pages}
                onClick={() => setPage((value) => value + 1)}
              >
                Next
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <EmptyState
          icon={Users}
          title="No users match those filters"
          description="Try a different search term or role."
        />
      )}

      <Dialog open={Boolean(pendingDelete)} onOpenChange={() => setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete user</DialogTitle>
            <DialogDescription>
              Permanently delete {pendingDelete?.fullName} ({pendingDelete?.email})? Their
              applications and profile data are removed too. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => pendingDelete && remove.mutate(pendingDelete.id)}
            >
              Delete user
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
