/* Firebase Cloud Messaging service worker (background / closed tab). */
importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js")
importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js")

firebase.initializeApp({
  apiKey: "AIzaSyCl2DnQLBAf_gJ_mNaJMeGUpDBDJncpPeA",
  authDomain: "mayoudashboard.firebaseapp.com",
  projectId: "mayoudashboard",
  storageBucket: "mayoudashboard.firebasestorage.app",
  messagingSenderId: "1070198975986",
  appId: "1:1070198975986:web:14f468d202511eff3bcf6b",
})

// Activate the new worker immediately instead of waiting for all tabs to close.
self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()))

let messaging = null
try {
  messaging = firebase.messaging()
} catch (error) {
  console.error("[firebase-messaging-sw.js] messaging init failed:", error)
}

if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    console.log("[firebase-messaging-sw.js] Background message:", payload)

    // When the payload already contains a `notification` block, FCM displays
    // it automatically. Showing it again here would duplicate the notification.
    if (payload.notification) return

    const title = payload.data?.title || "MayouDashboard"
    const options = {
      body: payload.data?.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: payload.data || {},
      tag: payload.data?.tag || "mayoudashboard",
    }
    self.registration.showNotification(title, options)
  })
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  const link = event.notification.data?.link || "/dashboard"

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      })

      for (const client of clientList) {
        if ("focus" in client) {
          await client.focus()
          if ("navigate" in client) {
            try {
              await client.navigate(link)
            } catch {
              /* navigation may be blocked, focusing is enough */
            }
          }
          return
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(link)
      }
    })()
  )
})
