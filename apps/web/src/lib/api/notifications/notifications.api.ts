import { apiRequest } from "../api-client";
import type {
  AppNotification,
  PushSubscriptionInput,
} from "./notifications.types";

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

export function getWebPushPublicKey() {
  return apiRequest<{ publicKey: string }>(
    "/notifications/push/vapid-public-key",
  );
}

export function saveWebPushSubscription(input: PushSubscriptionInput) {
  return apiRequest<{ message: string }>("/notifications/push-subscriptions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function removeWebPushSubscription(endpoint: string) {
  return apiRequest<{ message: string }>("/notifications/push-subscriptions", {
    method: "DELETE",
    body: JSON.stringify({ endpoint }),
  });
}
