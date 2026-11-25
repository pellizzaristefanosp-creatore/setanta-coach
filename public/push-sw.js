/* Notifiche dei promemoria serali (le manda api/cron/promemoria). Caricato dal service worker dell'app. */
self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { body: event.data && event.data.text() }; }
  event.waitUntil(self.registration.showNotification(d.title || "Setanta Coach", { body: d.body || "Bastano 2 minuti oggi.", icon: "/icon-192.png", badge: "/icon-192.png", tag: "promemoria", renotify: true, data: { url: d.url || "/" } }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) if ("focus" in c) return c.focus();
    return self.clients.openWindow(url);
  }));
});
