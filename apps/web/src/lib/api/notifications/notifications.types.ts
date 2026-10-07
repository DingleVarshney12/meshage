export type NotificationType =
  | "friend_request_received"
  | "friend_request_accepted"
  | "friend_request_rejected";

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

export interface PushSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}
