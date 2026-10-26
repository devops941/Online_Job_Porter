import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, Check, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState, PageHeader, TableSkeleton } from "@/components/shared/page-parts";
import { apiErrorMessage } from "@/lib/api";
import { notificationApi } from "@/lib/api-client";
import { cn, timeAgo, titleCase } from "@/lib/utils";
import type { Notification } from "@/types";

const TYPE_VARIANTS: Record<
  string,
  "default" | "info" | "success" | "warning" | "destructive" | "secondary"
> = {
  info: "info",
  application: "default",
  status_update: "warning",
  interview: "success",
  job: "info",
  alert: "secondary",
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"all" | "unread">("all");

  const notifications = useQuery({
    queryKey: ["notifications", tab],
    queryFn: () => notificationApi.list(tab === "unread"),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const markRead = useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: invalidate,
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const markAll = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => {
      toast.success("All notifications marked as read");
      invalidate();
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => notificationApi.remove(id),
    onSuccess: invalidate,
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const items: Notification[] = notifications.data ?? [];
  const unreadCount = items.filter((item) => !item.isRead).length;

  return (
    <AppShell>
      <PageHeader
        title="Notifications"
        description="Application updates, interview invites and job alerts."
        action={
          <Button
            variant="outline"
            size="sm"
            disabled={markAll.isPending || unreadCount === 0}
            onClick={() => markAll.mutate()}
          >
            <Check className="h-3.5 w-3.5" /> Mark all read
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(value) => setTab(value as "all" | "unread")}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">
            Unread{unreadCount > 0 ? ` (${unreadCount})` : ""}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {notifications.isLoading ? (
        <TableSkeleton rows={4} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title={tab === "unread" ? "Nothing unread" : "No notifications yet"}
          description="We will let you know when something changes on your applications."
        />
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3.5 transition-colors",
                !item.isRead && "border-primary/40 bg-primary/5",
              )}
            >
              {/* Icon */}
              <div className="mt-0.5 rounded-md bg-muted p-2 shrink-0">
                <Bell className="h-4 w-4 text-muted-foreground" />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <Badge variant={TYPE_VARIANTS[item.type] ?? "secondary"} className="text-[11px]">
                    {titleCase(item.type)}
                  </Badge>
                  {!item.isRead ? (
                    <Badge variant="default" className="text-[11px]">
                      New
                    </Badge>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground">{item.message}</p>
                <p className="text-xs text-muted-foreground">{timeAgo(item.createdAt)}</p>
              </div>

              {/* Actions */}
              <div className="flex shrink-0 items-center gap-1">
                {item.link ? (
                  <Button variant="ghost" size="icon" className="h-7 w-7" asChild aria-label="Open link">
                    <Link to={item.link}>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                ) : null}
                {!item.isRead ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    aria-label="Mark as read"
                    onClick={() => markRead.mutate(item.id)}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-label="Delete notification"
                  onClick={() => remove.mutate(item.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
