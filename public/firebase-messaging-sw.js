/* Firebase Cloud Messaging service worker (background / closed tab). */
// Register click handling before Firebase Messaging, which may add its own handler.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const notificationData = event.notification.data || {};
  const link =
    notificationData.link ||
    notificationData.FCM_MSG?.data?.link ||
    "/dashboard";

  event.waitUntil(
    (async () => {
      const target = new URL(link, self.location.origin).href;
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of clientList) {
        if ("focus" in client && client.url.startsWith(self.location.origin)) {
          await client.focus();
          try {
            await client.navigate(target);
          } catch {
            /* ignore */
          }
          return;
        }
      }

      if (self.clients.openWindow) await self.clients.openWindow(target);
    })(),
  );
});

importScripts(
  "https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js",
);

firebase.initializeApp({
  apiKey: "AIzaSyCl2DnQLBAf_gJ_mNaJMeGUpDBDJncpPeA",
  authDomain: "mayoudashboard.firebaseapp.com",
  projectId: "mayoudashboard",
  storageBucket: "mayoudashboard.firebasestorage.app",
  messagingSenderId: "1070198975986",
  appId: "1:1070198975986:web:14f468d202511eff3bcf6b",
});

// Activate the new worker immediately instead of waiting for all tabs to close.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);

let messaging = null;
try {
  messaging = firebase.messaging();
} catch (error) {
  console.error("[firebase-messaging-sw.js] messaging init failed:", error);
}

if (messaging) {
  messaging.onBackgroundMessage(async (payload) => {
    const data = payload.data || {};
    console.info("[FCM-SW] Background delivery received", {
      hasNotification: Boolean(payload.notification),
      dataKeys: Object.keys(data),
      diagnosticId: data.diagnosticId || null,
    });

    // Make background delivery observable by the open settings page too.
    // This only reports delivery metadata; it never forwards the FCM token.
    const clients = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    });
    for (const client of clients) {
      client.postMessage({
        type: "MAYOU_FCM_BACKGROUND_RECEIVED",
        data: { diagnosticId: data.diagnosticId || null },
      });
    }

    // FCM automatically displays notification payloads in the background.
    // Only data-only messages need a notification created here.
    if (payload.notification) return;

    const title = payload.notification?.title || data.title || "MayouDashboard";
    const body = payload.notification?.body || data.body || "";
    const link = data.link || "/dashboard";

    const options = {
      body,
      icon: payload.notification?.icon || "/icon-192.png",
      badge: "/icon-192.png",
      data: { ...data, link },
      tag: data.tag || "mayoudashboard",
    };

    return self.registration.showNotification(title, options);
  });
}
