const fallbackTitle = "Meshage";

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      if (windows.some((client) => client.visibilityState === "visible")) return;

      let payload = {};
      try {
        payload = event.data ? event.data.json() : {};
      } catch {
        payload = {};
      }

      const title = typeof payload.title === "string" ? payload.title : fallbackTitle;
      const url = typeof payload.url === "string" ? payload.url : "/chat";
      await self.registration.showNotification(title, {
        body: "Open Meshage to view it.",
        icon: "/meshage-logo.png",
        badge: "/meshage-logo.png",
        tag: `meshage-${title.toLowerCase().replaceAll(" ", "-")}`,
        data: { url },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url ?? "/chat", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (windows) => {
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin) {
          await client.focus();
          if ("navigate" in client) await client.navigate(targetUrl);
          return;
        }
      }
      await self.clients.openWindow(targetUrl);
    }),
  );
});
