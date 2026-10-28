"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { requestForToken, onForegroundMessage } from "@/lib/firebaseClient"
import { registerPushDevice } from "@/lib/fcmTokens"
import { useUser } from "./UserProvider"
import { Bell, BellRing, Loader2, X } from "lucide-react"

interface Toast {
  title: string
  body: string
  link?: string
}

export default function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser()
  const [notification, setNotification] = useState<Toast | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default")
  const [enabling, setEnabling] = useState(false)
  const toastTimer = useRef<number | null>(null)

  const saveToken = useCallback(
    async (fcmToken: string) => {
      if (!user?.id) return
      const result = await registerPushDevice(user.id, user.role, fcmToken)
      if (!result.subscribed) {
        console.warn(
          "Abonnement aux notifications push impossible :",
          result.error
        )
      }
    },
    [user?.id, user?.role]
  )

  const enableNotifications = useCallback(
    async (silent = false) => {
      if (!user) return
      if (!silent) setEnabling(true)
      try {
        const fcmToken = await requestForToken()
        if (fcmToken) {
          setToken(fcmToken)
          setPermission("granted")
          await saveToken(fcmToken)
        } else if (typeof Notification !== "undefined") {
          setPermission(Notification.permission)
        }
      } finally {
        if (!silent) setEnabling(false)
      }
    },
    [user, saveToken]
  )

  // Reflect the current browser permission and re-register silently when it
  // was already granted (token refresh / device change).
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPermission("unsupported")
      return
    }
    setPermission(Notification.permission)
    if (user && Notification.permission === "granted") {
      void enableNotifications(true)
    }
  }, [user, enableNotifications])

  useEffect(() => {
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type !== "MAYOU_FCM_BACKGROUND_RECEIVED") return

      console.info("[FCM] Background message received by service worker", {
        diagnosticId: event.data.data?.diagnosticId || null,
      })
      window.dispatchEvent(
        new CustomEvent("mayou:fcm-message", {
          detail: {
            data: event.data.data || {},
            delivery: "service-worker",
          },
        })
      )
    }

    navigator.serviceWorker?.addEventListener("message", handleServiceWorkerMessage)
    let unsubscribe: (() => void) | null = null
    let cancelled = false

    onForegroundMessage((payload) => {
      const title = payload.notification?.title || payload.data?.title || "MayouDashboard"
      const body = payload.notification?.body || payload.data?.tag || payload.data?.body || ""
      const link = payload.data?.link
      console.info("[FCM] Foreground message received", {
        title,
        body,
        hasNotification: Boolean(payload.notification),
        hasData: Boolean(payload.data),
        dataKeys: payload.data ? Object.keys(payload.data) : [],
      })
      window.dispatchEvent(
        new CustomEvent("mayou:fcm-message", {
          detail: { data: payload.data, delivery: "foreground" },
        })
      )
      setNotification({ title, body, link })

      // FCM does not display notification messages as system notifications
      // while the page is in the foreground. Show one through the active
      // service worker as well as the in-app toast.
      if (Notification.permission === "granted" && "serviceWorker" in navigator) {
        void navigator.serviceWorker.ready
          .then((registration) =>
            registration.showNotification(title, {
              body,
              icon: "/icon-192.png",
              badge: "/icon-192.png",
              data: { link: link || "/dashboard" },
              tag: "mayoudashboard-foreground",
            })
          )
          .catch((error) =>
            console.warn("Notification système impossible à afficher :", error)
          )
      }

      if (toastTimer.current) window.clearTimeout(toastTimer.current)
      toastTimer.current = window.setTimeout(() => setNotification(null), 8000)
    })
      .then((unsub) => {
        if (cancelled) {
          unsub?.()
        } else if (!unsub) {
          console.warn(
            "[FCM] Foreground listener unavailable: Firebase Messaging is not supported in this browser context."
          )
        } else {
          unsubscribe = unsub
          console.info("[FCM] Foreground message listener ready")
        }
      })
      .catch((error) => console.warn("Écoute des notifications impossible :", error))

    return () => {
      cancelled = true
      unsubscribe?.()
      navigator.serviceWorker?.removeEventListener("message", handleServiceWorkerMessage)
      if (toastTimer.current) window.clearTimeout(toastTimer.current)
    }
  }, [])

  const showEnableButton = permission === "default" && !token

  return (
    <>
      {children}

      {showEnableButton && (
        <button
          onClick={() => void enableNotifications()}
          disabled={enabling}
          className="fixed bottom-6 right-6 z-[9998] flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-xl shadow-cyan-600/25 transition hover:from-cyan-700 hover:to-blue-700 disabled:opacity-60"
        >
          {enabling ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <BellRing className="h-4 w-4" />
          )}
          Activer les notifications
        </button>
      )}

      {notification && (
        <div className="fixed bottom-6 right-6 z-[9999] w-[calc(100%-3rem)] max-w-sm animate-in slide-in-from-bottom-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-cyan-100 p-2">
              <Bell className="h-5 w-5 text-cyan-700" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-slate-800">{notification.title}</h4>
              {notification.body && (
                <p className="mt-1 text-sm text-slate-600">{notification.body}</p>
              )}
              {notification.link && (
                <a
                  href={notification.link}
                  className="mt-2 inline-block text-sm font-medium text-cyan-700 hover:underline"
                >
                  Voir
                </a>
              )}
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-slate-600"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
