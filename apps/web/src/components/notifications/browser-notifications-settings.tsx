"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/utils/errors";
import {
  disableBrowserPush,
  enableBrowserPush,
  getBrowserPushSubscription,
  supportsBrowserPush,
} from "@/lib/notifications/browser-push";

type NotificationState = "checking" | "enabled" | "disabled" | "unsupported";

export function BrowserNotificationsSettings() {
  const [state, setState] = useState<NotificationState>("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const checkState = async () => {
      if (!supportsBrowserPush()) {
        if (!cancelled) setState("unsupported");
        return;
      }

      try {
        const subscription = await getBrowserPushSubscription();
        if (!cancelled) {
          setState(
            Notification.permission === "granted" && subscription
              ? "enabled"
              : "disabled",
          );
        }
      } catch {
        if (!cancelled) setState("disabled");
      }
    };
    void checkState();
    return () => {
      cancelled = true;
    };
  }, []);

  async function enableNotifications() {
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      if (!supportsBrowserPush()) {
        setState("unsupported");
        return;
      }
      await enableBrowserPush();
      setState("enabled");
      setNotice("Browser notifications are enabled on this device.");
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, "Could not enable notifications."),
      );
      setState("disabled");
    } finally {
      setBusy(false);
    }
  }

  async function disableNotifications() {
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      await disableBrowserPush();
      setState("disabled");
      setNotice("Browser notifications are disabled on this device.");
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, "Could not disable notifications."),
      );
    } finally {
      setBusy(false);
    }
  }

  const isEnabled = state === "enabled";

  return (
    <section className="rounded-2xl border bg-card p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          {isEnabled ? (
            <Bell className="size-5" />
          ) : (
            <BellOff className="size-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">Browser notifications</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Get alerts for new messages and friend request updates when Meshage
            is in the background. Message text is never shown.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            On iPhone or iPad, add Meshage to your Home Screen first to enable
            browser notifications.
          </p>
          {state === "unsupported" ? (
            <p className="mt-3 text-sm text-muted-foreground">
              This browser does not support web push notifications.
            </p>
          ) : (
            <Button
              className="mt-4 rounded-xl"
              variant={isEnabled ? "outline" : "default"}
              onClick={() =>
                void (isEnabled
                  ? disableNotifications()
                  : enableNotifications())
              }
              disabled={busy || state === "checking"}
            >
              {busy || state === "checking" ? (
                <LoaderCircle className="animate-spin" />
              ) : null}
              {isEnabled
                ? "Disable on this device"
                : "Enable browser notifications"}
            </Button>
          )}
          {error ? (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p role="status" className="mt-3 text-sm text-muted-foreground">
              {notice}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
