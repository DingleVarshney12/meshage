"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/notifications/notifications.api";
import type {
  AppNotification,
  NewNotificationEvent,
} from "@/lib/api/notifications/notifications.types";
import { createRealtimeSocket } from "@/lib/realtime/socket-client";

interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  refresh: () => Promise<void>;
  markRead: (notificationId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null,
);

export function NotificationsProvider({ children }: PropsWithChildren) {
  const { user, status } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const [items, unread] = await Promise.all([
        getNotifications(),
        getUnreadNotificationCount(),
      ]);
      setNotifications(items);
      setUnreadCount(unread.count);
    } catch {
      // Keep the app usable when the notification service is temporarily unavailable.
    }
  }, [user]);

  useEffect(() => {
    if (status !== "authenticated" || !user) {
      return;
    }

    // Initial notification state is loaded from the authenticated API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();

    const socket = createRealtimeSocket();

    function handleNewNotification(event: NewNotificationEvent) {
      void refresh();

      if (event.notification.type === "friend_request_received") {
        toast("New friend request", {
          description:
            "Someone wants to connect with you. Open Friends to respond.",
        });
      } else if (event.notification.type === "friend_request_accepted") {
        toast("Friend request accepted", {
          description: "You are now friends and can start a conversation.",
        });
      }
    }

    function handleFriendsChanged() {
      window.dispatchEvent(new Event("meshage:friends-changed"));
    }

    socket.on("notification:new", handleNewNotification);
    socket.on("friends:changed", handleFriendsChanged);
    socket.connect();

    return () => {
      socket.off("notification:new", handleNewNotification);
      socket.off("friends:changed", handleFriendsChanged);
      socket.disconnect();
    };
  }, [refresh, status, user]);

  const isAuthenticated = status === "authenticated" && user !== null;

  const markRead = useCallback(async (notificationId: string) => {
    const result = await markNotificationRead(notificationId);
    setUnreadCount(result.count);
    setNotifications((current) =>
      current.map((item) =>
        item.id === notificationId
          ? { ...item, readAt: item.readAt ?? new Date().toISOString() }
          : item,
      ),
    );
  }, []);

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead();
    const now = new Date().toISOString();
    setNotifications((current) =>
      current.map((item) => ({ ...item, readAt: item.readAt ?? now })),
    );
    setUnreadCount(0);
  }, []);

  return (
    <NotificationsContext.Provider
      value={{
        notifications: isAuthenticated ? notifications : [],
        unreadCount: isAuthenticated ? unreadCount : 0,
        refresh,
        markRead,
        markAllRead,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used inside NotificationsProvider.",
    );
  }
  return context;
}
