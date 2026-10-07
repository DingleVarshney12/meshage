"use client";

import { useEffect, useState } from "react";
import { BellRing, LoaderCircle, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getErrorMessage } from "@/lib/utils/errors";
import {
  enableBrowserPush,
  getBrowserPushSubscription,
  supportsBrowserPush,
} from "@/lib/notifications/browser-push";

const PROMPT_DISMISSED_KEY =
  "meshage:browser-notifications-prompt-dismissed:v1";

export function BrowserNotificationPrompt() {
  const { status } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !supportsBrowserPush()) return;
    if (window.localStorage.getItem(PROMPT_DISMISSED_KEY) === "true") return;
    if (Notification.permission === "denied") return;

    let cancelled = false;
    let showTimer: ReturnType<typeof setTimeout> | undefined;

    void getBrowserPushSubscription()
      .then((subscription) => {
        if (cancelled) return;
        if (Notification.permission === "granted" && subscription) {
          window.localStorage.setItem(PROMPT_DISMISSED_KEY, "true");
          return;
        }

        showTimer = setTimeout(() => setOpen(true), 1800);
      })
      .catch(() => {
        if (!cancelled) showTimer = setTimeout(() => setOpen(true), 1800);
      });

    return () => {
      cancelled = true;
      if (showTimer) clearTimeout(showTimer);
    };
  }, [status]);

  function dismissPrompt() {
    window.localStorage.setItem(PROMPT_DISMISSED_KEY, "true");
    setOpen(false);
  }

  async function handleEnable() {
    setBusy(true);
    setError(null);
    try {
      await enableBrowserPush();
      window.localStorage.setItem(PROMPT_DISMISSED_KEY, "true");
      setOpen(false);
    } catch (enableError) {
      setError(
        getErrorMessage(enableError, "Could not enable browser notifications."),
      );
      if ("Notification" in window && Notification.permission === "denied") {
        window.localStorage.setItem(PROMPT_DISMISSED_KEY, "true");
        setOpen(false);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !busy) dismissPrompt();
        else setOpen(nextOpen);
      }}
    >
      <DialogContent className="overflow-hidden p-0 sm:max-w-md">
        <div className="bg-gradient-to-br from-primary/15 via-primary/5 to-transparent px-6 pb-5 pt-7">
          <div className="grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <BellRing className="size-7" />
          </div>
          <DialogHeader className="mt-5 text-left">
            <DialogTitle className="text-xl">Stay in the loop</DialogTitle>
            <DialogDescription className="text-sm leading-6">
              Get browser alerts for new messages and friend request updates,
              even when Meshage is in the background.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex items-start gap-3 px-6 py-4 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>Message text is never shown in browser notifications.</p>
        </div>

        {error ? (
          <p role="alert" className="px-6 pb-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <DialogFooter className="px-6 pb-6">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={dismissPrompt}
            disabled={busy}
          >
            Not now
          </Button>
          <Button
            type="button"
            className="rounded-xl"
            onClick={() => void handleEnable()}
            disabled={busy}
          >
            {busy ? <LoaderCircle className="animate-spin" /> : <BellRing />}
            Enable notifications
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
