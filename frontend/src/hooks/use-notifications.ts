import { useQuery } from "@tanstack/react-query";
import { notificationApi } from "@/lib/api-client";

export function useUnreadNotifications(enabled: boolean) {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => notificationApi.unreadCount(),
    enabled,
    refetchInterval: 60_000,
  });
}
