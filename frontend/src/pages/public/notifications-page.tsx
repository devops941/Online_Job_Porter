import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, Check, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState, PageHeader } from "@/components/shared/page-parts";
import { TableSkeleton } from "@/components/shared/page-parts";
import { apiErrorMessage } from "@/lib/api";
import { notificationApi } from "@/lib/api-client";
import { cn, timeAgo, titleCase } from "@/lib/utils";
import type { Notification } from "@/types";

const TYPE_VARIANTS: Record<string, "default" | "info" | "success" | "warning" | "destructive" | "secondary"> = {
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
            <Check /> Mark all read
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
            <Card key={item.id} className={cn(!item.isRead && "border-primary/40 bg-primary/5")}>
              <CardContent className="flex items-start gap-3 p-4">
                <div className="rounded-md bg-muted p-2">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{item.title}</p>
                    <Badge variant={TYPE_VARIANTS[item.type] ?? "secondary"}>
                      {titleCase(item.type)}
                    </Badge>
                    {!item.isRead ? <Badge variant="default">New</Badge> : null}
                  </div>
                  <p className="text-sm text-muted-foreground">{item.message}</p>
                  <p className="text-xs text-muted-foreground">{timeAgo(item.createdAt)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {item.link ? (
                    <Button variant="ghost" size="icon" asChild aria-label="Open link">
                      <Link to={item.link}>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  ) : null}
                  {!item.isRead ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Mark as read"
                      onClick={() => markRead.mutate(item.id)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete notification"
                    onClick={() => remove.mutate(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
