export type NotificationType =
  "friend_request_received" | "friend_request_accepted";

export interface AppNotification {
  id: string;
  recipientId: string;
  actorId: string | null;
  type: NotificationType;
  data: Record<string, string> | null;
  createdAt: string;
  readAt: string | null;
}

export interface NewNotificationEvent {
  notification: AppNotification;
}
