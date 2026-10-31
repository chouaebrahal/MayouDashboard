"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { requestForToken, onForegroundMessage, registerMessagingServiceWorker } from "@/lib/firebaseClient"
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
      } catch (error) {
        console.error("Activation des notifications impossible :", error)
        if (!silent) {
          setNotification({
            title: "Activation impossible",
            body: error instanceof Error ? error.message : "Vérifiez les autorisations du navigateur et réessayez.",
          })
          if (toastTimer.current) window.clearTimeout(toastTimer.current)
          toastTimer.current = window.setTimeout(() => setNotification(null), 8000)
        }
      } finally {
        if (!silent) setEnabling(false)
      }
    },
    [user, saveToken]
  )

  // Reflect permission only. Token creation stays deferred until the user
  // explicitly enables this device; only the service worker is warmed up
  // below (registration does not require a notification permission prompt).
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPermission("unsupported")
      return
    }
    setPermission(Notification.permission)
  }, [])

  // Warm up the messaging worker as soon as the dashboard mounts. Registering
  // during a click races with the browser's own update check (and with other
  // tabs), which is what produces "Operation has been aborted". Doing it here
  // means the test buttons reuse an already activated registration.
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return
    void registerMessagingServiceWorker().catch((error) => {
      console.warn(
        "[FCM] Service worker not ready yet, will retry on activation:",
        error
      )
    })
  }, [])

  useEffect(() => {
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type !== "MAYOU_FCM_BACKGROUND_RECEIVED") return

      const data = event.data.data || {}
      const title = event.data.notification?.title || data.title || "MayouDashboard"
      const body = event.data.notification?.body || data.body || ""
      const link = event.data.link || data.link || undefined

      window.dispatchEvent(
        new CustomEvent("mayou:fcm-message", {
          detail: {
            data,
            delivery: "service-worker",
          },
        })
      )

      // FCM only chooses the service-worker path when it did not see a visible
      // client, but the page can still be on screen (covered window, race,
      // or a background tab). Surface the same in-app toast either way.
      setNotification({ title, body, link })
      if (toastTimer.current) window.clearTimeout(toastTimer.current)
      toastTimer.current = window.setTimeout(() => setNotification(null), 8000)
    }

    navigator.serviceWorker?.addEventListener("message", handleServiceWorkerMessage)
    let unsubscribe: (() => void) | null = null
    let cancelled = false

    onForegroundMessage((payload) => {
      const title = payload.notification?.title || payload.data?.title || "MayouDashboard"
      const body = payload.notification?.body || payload.data?.tag || payload.data?.body || ""
      const link = payload.data?.link
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
        const notificationTag = payload.data?.patientId
          ? `pending-dossier-${payload.data.patientId}-${payload.data.threshold || "reminder"}`
          : "mayoudashboard-foreground"
        void navigator.serviceWorker.ready
          .then((registration) =>
            registration.showNotification(title, {
              body,
              icon: "/icon-192.png",
              badge: "/icon-192.png",
              data: { link: link || "/dashboard" },
              tag: notificationTag,
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

  const showEnableButton =
    (permission === "default" || permission === "granted") && !token

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
