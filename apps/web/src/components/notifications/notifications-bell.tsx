"use client";

import { Bell, CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "./notifications-provider";
import type { AppNotification } from "@/lib/api/notifications/notifications.types";

function getNotificationCopy(notification: AppNotification) {
  if (notification.type === "friend_request_received") {
    return {
      title: "New friend request",
      description:
        "Someone wants to connect with you. Open Friends to respond.",
    };
  }

  if (notification.type === "friend_request_rejected") {
    return {
      title: "Friend request declined",
      description: "Your friend request was declined.",
    };
  }

  return {
    title: "Friend request accepted",
    description: "You are now friends and can start a conversation.",
  };
}

function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function NotificationsBell() {
  const router = useRouter();
  const { notifications, unreadCount, refresh, markRead, markAllRead } =
    useNotifications();

  async function openNotification(notification: AppNotification) {
    if (!notification.readAt) {
      await markRead(notification.id).catch(() => undefined);
    }
    router.push("/friends");
  }

  return (
    <DropdownMenu onOpenChange={(open) => open && void refresh()}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={
            unreadCount > 0
              ? `Notifications, ${unreadCount} unread`
              : "Notifications"
          }
          title="Notifications"
          className="relative shrink-0 text-foreground"
        >
          <Bell />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full border-2 border-background bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[min(23rem,calc(100vw-1.5rem))] p-0"
      >
        <div className="flex items-center justify-between px-3 py-2">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unreadCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => void markAllRead()}
              className="h-7 gap-1 px-2 text-xs text-muted-foreground"
            >
              <CheckCheck /> Mark all read
            </Button>
          ) : null}
        </div>
        <DropdownMenuSeparator className="m-0" />

        <div className="max-h-[min(65dvh,28rem)] overflow-y-auto p-1">
          {notifications.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <Bell className="mx-auto size-5 text-muted-foreground/60" />
              <p className="mt-2 text-sm font-medium">You’re all caught up</p>
              <p className="mt-1 text-xs text-muted-foreground">
                New activity will show up here.
              </p>
            </div>
          ) : (
            notifications.map((notification) => {
              const copy = getNotificationCopy(notification);
              return (
                <DropdownMenuItem
                  key={notification.id}
                  onSelect={() => void openNotification(notification)}
                  className="items-start gap-3 rounded-lg px-3 py-3"
                >
                  <span
                    className={[
                      "mt-1.5 size-2 shrink-0 rounded-full",
                      notification.readAt ? "bg-transparent" : "bg-primary",
                    ].join(" ")}
                  />
                  <span className="min-w-0 flex-1 whitespace-normal">
                    <span className="block text-sm font-semibold">
                      {copy.title}
                    </span>
                    <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                      {copy.description}
                    </span>
                    <time className="mt-1 block text-[10px] text-muted-foreground/80">
                      {formatNotificationTime(notification.createdAt)}
                    </time>
                  </span>
                </DropdownMenuItem>
              );
            })
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <p className="px-3 py-2 text-center text-[10px] text-muted-foreground">
          Notifications are automatically removed after 7 days.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
