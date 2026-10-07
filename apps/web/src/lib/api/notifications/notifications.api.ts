import { apiRequest } from "../api-client";
import type { AppNotification } from "./notifications.types";

export function getNotifications() {
  return apiRequest<AppNotification[]>("/notifications");
}

export function getUnreadNotificationCount() {
  return apiRequest<{ count: number }>("/notifications/unread-count");
}

export function markNotificationRead(notificationId: string) {
  return apiRequest<{ count: number }>(
    `/notifications/${encodeURIComponent(notificationId)}/read`,
    { method: "PATCH" },
  );
}

export function markAllNotificationsRead() {
  return apiRequest<{ count: number }>("/notifications/read-all", {
    method: "PATCH",
  });
}
