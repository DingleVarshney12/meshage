import {
  getWebPushPublicKey,
  removeWebPushSubscription,
  saveWebPushSubscription,
} from "@/lib/api/notifications/notifications.api";

function decodeApplicationServerKey(value: string): ArrayBuffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = window.atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer as ArrayBuffer;
}

export function supportsBrowserPush() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export async function getBrowserPushSubscription() {
  if (!supportsBrowserPush()) return null;
  const registration = await navigator.serviceWorker.getRegistration("/");
  return registration?.pushManager.getSubscription() ?? null;
}

export async function enableBrowserPush() {
  if (!supportsBrowserPush()) {
    throw new Error("This browser does not support web push notifications.");
  }

  const { publicKey } = await getWebPushPublicKey();
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(
      permission === "denied"
        ? "Notifications are blocked in your browser settings. Allow them there, then try again."
        : "Please allow notifications to enable browser alerts.",
    );
  }

  const registration = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
  });
  await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeApplicationServerKey(publicKey),
    }));
  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;

  if (!subscription.endpoint || !p256dh || !auth) {
    throw new Error("The browser returned an incomplete push subscription.");
  }

  await saveWebPushSubscription({
    endpoint: subscription.endpoint,
    p256dh,
    auth,
    userAgent: navigator.userAgent,
  });
}

export async function disableBrowserPush() {
  if (!supportsBrowserPush()) return;
  const subscription = await getBrowserPushSubscription();
  if (!subscription) return;
  await removeWebPushSubscription(subscription.endpoint);
  await subscription.unsubscribe();
}
