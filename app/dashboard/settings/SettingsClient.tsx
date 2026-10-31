// app/dashboard/settings/SettingsClient.tsx
"use client"

import { useState, useEffect } from "react"
import { useUser } from "@/app/components/UserProvider"
import { supabase } from "@/lib/supabaseClient"
import { refreshForToken, requestForToken, registerMessagingServiceWorker, resetPushRegistration } from "@/lib/firebaseClient"
import { registerPushDevice } from "@/lib/fcmTokens"
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Save,
  Bell,
  BellRing,
  Send,
  Printer,
  Download,
  AlertCircle,
  CheckCircle,
  Loader2,
  UserCircle2,
  Calendar,
  Smartphone,
  ChevronRight,
  LogOut,
  X,
  RefreshCw
} from "lucide-react"

const FCM_RECEIPT_TIMEOUT_MS = 30_000

function pushErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (/registration failed - permission denied/i.test(message)) {
    return "Le navigateur a refusé l'abonnement Push. Chrome bloque Push en navigation privée : ouvrez MayouDashboard dans une fenêtre normale, autorisez les notifications du site, puis réessayez."
  }
  if (/operation has been aborted|abort/i.test(message)) {
    return "Le navigateur a interrompu l'enregistrement du service worker (page rechargée pendant l'opération, ou autre onglet en train de s'enregistrer). Réessayez : l'application réutilise maintenant l'enregistrement existant. Si l'erreur persiste, ouvrez DevTools → Application → Service Workers, désenregistrez le worker puis rechargez la page."
  }
  if (
    /unregistered|not registered|registration-token-not-registered|invalid-registration-token|device unregistered/i.test(
      message
    )
  ) {
    return "FCM refuse ce token : l'appareil n'est plus enregistré (ancien abonnement Push ou token révoqué). Cliquez sur « Réinitialiser les notifications » puis refaites le test. Si un token tout neuf est encore refusé immédiatement, vérifiez que NEXT_PUBLIC_FIREBASE_VAPID_KEY correspond au certificat Web Push du projet mayoudashboard (Firebase Console → Cloud Messaging → Certificats Web Push)."
  }
  if (/mismatched-credential|sender id mismatch|third-party-auth|app id mismatch/i.test(message)) {
    return "Ce token appartient à un autre projet Firebase que celui utilisé par le serveur. Vérifiez que NEXT_PUBLIC_FIREBASE_PROJECT_ID / NEXT_PUBLIC_FIREBASE_APP_ID / NEXT_PUBLIC_FIREBASE_VAPID_KEY et FIREBASE_PROJECT_ID viennent tous du projet mayoudashboard, puis réinitialisez les notifications."
  }
  return message || "Erreur lors de l'envoi du test"
}

export default function SettingsClient() {
  const { user, logout } = useUser()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    username: ""
  })
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    smsNotifications: false,
    appointmentReminders: true
  })

  const [pushToken, setPushToken] = useState<string | null>(null)
  const [pushDeviceActive, setPushDeviceActive] = useState(false)
  const [pushPermission, setPushPermission] = useState<NotificationPermission | "unsupported">("default")
  const [pushLoading, setPushLoading] = useState(false)
  const [pushMessage, setPushMessage] = useState<string | null>(null)
  const [pushError, setPushError] = useState<string | null>(null)
  const [swStatus, setSwStatus] = useState<string>("vérification…")
  const [lastTestResult, setLastTestResult] = useState<string | null>(null)

  const refreshServiceWorkerStatus = async () => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      setSwStatus("non supporté")
      return
    }
    try {
      const registration = await navigator.serviceWorker.getRegistration("/")
      if (!registration) {
        setSwStatus("non enregistré")
        return
      }
      const state =
        registration.active?.state ||
        registration.waiting?.state ||
        registration.installing?.state ||
        "inconnu"
      setSwStatus(`enregistré (${state})`)
    } catch {
      setSwStatus("erreur de vérification")
    }
  }

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
      setPushPermission("unsupported")
      setSwStatus("non supporté")
      return
    }
    setPushPermission(Notification.permission)
    void refreshServiceWorkerStatus()
  }, [])

  const handleEnablePush = async () => {
    if (!user) return
    setPushLoading(true)
    setPushError(null)
    setPushMessage(null)
    try {
      const token = await requestForToken()
      if (!token) {
        setPushPermission(typeof Notification !== "undefined" ? Notification.permission : "unsupported")
        setPushDeviceActive(false)
        setPushError(
          Notification.permission === "denied"
            ? "Les notifications sont bloquées pour ce site. Autorisez-les dans les paramètres du navigateur, puis rechargez la page."
            : "Aucun token Push obtenu. Vérifiez les autorisations du navigateur (sur iOS, ajoutez d'abord l'application à l'écran d'accueil)."
        )
        return
      }
      const saved = await registerPushDevice(user.id, user.role, token)
      setPushToken(token)
      setPushPermission("granted")
      setPushDeviceActive(saved.subscribed)
      void refreshServiceWorkerStatus()
      setPushMessage(
        saved.subscribed
          ? "Notifications activées sur cet appareil."
          : "Token obtenu, mais l'abonnement au canal de notifications a échoué. Vérifiez la configuration Firebase."
      )
      if (!saved.subscribed) {
        setPushError(saved.error || "L'abonnement de cet appareil au canal de notifications a échoué.")
      }
    } catch (error) {
      setPushError(
        pushErrorMessage(error)
      )
    } finally {
      setPushLoading(false)
    }
  }

  const handleResetPush = async () => {
    setPushLoading(true)
    setPushError(null)
    setPushMessage(null)
    setLastTestResult(null)
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "denied") {
        setPushError(
          "Les notifications sont bloquées pour ce site. Autorisez-les dans les paramètres du navigateur, puis rechargez la page."
        )
        return
      }
      const token = await resetPushRegistration()
      if (!token) {
        setPushError(
          "Impossible de recréer un abonnement Push. Vérifiez que les notifications sont autorisées pour ce site."
        )
        return
      }
      setPushToken(token)
      setPushPermission("granted")
      if (user) {
        const saved = await registerPushDevice(user.id, user.role, token)
        setPushDeviceActive(saved.subscribed)
      }
      void refreshServiceWorkerStatus()
      setPushMessage(
        "Notifications réinitialisées : nouvel abonnement Push et nouveau token FCM créés. Relancez le test."
      )
    } catch (error) {
      setPushError(pushErrorMessage(error))
    } finally {
      setPushLoading(false)
    }
  }

  const handleTestPush = async () => {
    setPushLoading(true)
    setPushError(null)
    setPushMessage(null)
    setLastTestResult(null)
    const diagnosticId = globalThis.crypto.randomUUID()
    let deliveryTimer: number | undefined
    let removeDeliveryListener = () => {}
    const browserReceived = new Promise<"foreground" | "service-worker">((resolve) => {
      const handleFcmMessage = (event: Event) => {
        const detail = (event as CustomEvent<{
          data?: Record<string, string | null>
          delivery?: "foreground" | "service-worker"
        }>).detail
        if (detail?.data?.diagnosticId !== diagnosticId) return
        removeDeliveryListener()
        resolve(detail.delivery || "foreground")
      }

      window.addEventListener("mayou:fcm-message", handleFcmMessage)
      removeDeliveryListener = () =>
        window.removeEventListener("mayou:fcm-message", handleFcmMessage)
    })
    try {
      // Ask FCM for the current token on every test. A displayed token can be
      // revoked or rotated after it was first loaded.
      let token = await requestForToken()
      if (!token) {
        setPushError("Aucun token disponible. Activez d'abord les notifications sur cet appareil.")
        return
      }
      setPushToken(token)
      setPushPermission("granted")
      // A test should also make sure the device is subscribed to the topic
      // used by the cron reminders, not just able to receive a direct send.
      if (user) {
        const saved = await registerPushDevice(user.id, user.role, token)
        setPushDeviceActive(saved.subscribed)
      }
      const sendTest = (targetToken: string) => fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: targetToken,
          title: "Test MayouDashboard",
          body: "Les notifications push fonctionnent sur cet appareil ✅",
          data: { link: "/dashboard", diagnosticId },
        }),
      })
      let res = await sendTest(token)
      let responseText = await res.text()
      let json: {
        response?: string
        error?: string
        code?: string
        success?: boolean
        target?: string
        projectId?: string
        payloadType?: string
      }
      try {
        json = JSON.parse(responseText) as typeof json
      } catch {
        json = { error: responseText || "Réponse serveur illisible" }
      }

      // 410 is only returned for a revoked/unregistered token: rotate it once
      // and retry before failing the test.
      if (res.status === 410) {
        const refreshedToken = await refreshForToken()
        if (!refreshedToken) {
          setPushDeviceActive(false)
          throw new Error("Le token FCM était expiré et n'a pas pu être renouvelé. Réactivez les notifications sur cet appareil.")
        }
        token = refreshedToken
        setPushToken(token)
        if (user) await registerPushDevice(user.id, user.role, token)
        res = await sendTest(token)
        responseText = await res.text()
        try {
          json = JSON.parse(responseText) as typeof json
        } catch {
          json = { error: responseText || "Réponse serveur illisible" }
        }
      }

      const result = [
        json.target && `cible=${json.target}`,
        json.projectId && `projet=${json.projectId}`,
        json.payloadType && `payload=${json.payloadType}`,
        json.response || json.error || (!json.success ? responseText : undefined),
      ]
        .filter(Boolean)
        .join(" · ") || "Réponse vide"
      setLastTestResult(
        `HTTP ${res.status} · token ${token.slice(0, 12)}… · ${result}`
      )
      if (!res.ok || !json.success) {
        throw new Error(json.error || `L'envoi a échoué (HTTP ${res.status})`)
      }
      let received = await Promise.race([
        browserReceived,
        new Promise<null>((resolve) => {
          deliveryTimer = window.setTimeout(
            () => resolve(null),
            FCM_RECEIPT_TIMEOUT_MS,
          )
        }),
      ])
      let refreshedAndRetried = false
      let retrySendFailed = false

      // FCM can accept a recently rotated token but fail to deliver to its
      // browser subscription. If there's no receipt, rotate once and retry.
      if (received === null) {
        let refreshedToken: string | null = null
        try {
          refreshedToken = await refreshForToken()
        } catch (error) {
          console.warn("[FCM] Token refresh failed", error)
          retrySendFailed = true
          setPushError(pushErrorMessage(error))
        }

        if (refreshedToken && refreshedToken !== token) {
          refreshedAndRetried = true
          token = refreshedToken
          setPushToken(token)
          if (user) await registerPushDevice(user.id, user.role, token)

          const retryResponse = await sendTest(token)
          const retryText = await retryResponse.text()
          try {
            json = JSON.parse(retryText) as typeof json
          } catch {
            json = { error: retryText || "Réponse serveur illisible" }
          }

          if (retryResponse.ok && json.success) {
            received = await Promise.race([
              browserReceived,
              new Promise<null>((resolve) => {
                deliveryTimer = window.setTimeout(
                  () => resolve(null),
                  FCM_RECEIPT_TIMEOUT_MS,
                )
              }),
            ])
          } else {
            retrySendFailed = true
            setPushDeviceActive(false)
            setPushError(
              pushErrorMessage(
                new Error(
                  json.error ||
                    `Le nouvel envoi a échoué (HTTP ${retryResponse.status})`,
                ),
              ),
            )
          }
        } else if (!retrySendFailed) {
          // refreshForToken() guarantees a different token; if that still did
          // not happen the local Push state is corrupted.
          retrySendFailed = true
          setPushError(
            "Impossible de créer un nouveau token FCM : l'abonnement Push de ce navigateur est bloqué. Cliquez sur « Réinitialiser les notifications », puis réessayez.",
          )
        }
      }

      setLastTestResult((current) =>
        `${current} · ${received === "foreground" ? "reçu par le listener de la page" : received === "service-worker" ? "reçu via le service worker (notification système + toast)" : `aucun accusé navigateur sous ${FCM_RECEIPT_TIMEOUT_MS / 1000} s`}${refreshedAndRetried ? " · token renouvelé et nouvel essai effectué" : ""}`
      )
      if (received === null) {
        const registration = await navigator.serviceWorker.getRegistration("/")
        const subscription = await registration?.pushManager.getSubscription()
        const subscriptionEndpoint = subscription?.endpoint || null
        const endpointProjectMatch = subscriptionEndpoint?.includes(
          "fcm.googleapis.com"
        ) || false
        setLastTestResult((current) =>
          `${current} · permission=${Notification.permission} · sw=${registration?.active?.state || "absent"} · pushSubscription=${subscription ? "present" : "absent"} · endpointIsFcm=${endpointProjectMatch}`
        )
        console.warn("[FCM] No browser receipt for button test", {
          diagnosticId,
          serviceWorkerState: registration?.active?.state || "absent",
          pushSubscriptionPresent: Boolean(subscription),
          endpointIsFcm: endpointProjectMatch,
          notificationPermission: Notification.permission,
        })
      }
      if (!retrySendFailed) {
        setPushMessage(
          received === "foreground"
            ? "Test réussi : message reçu par la page (toast) et notification système affichée."
            : received === "service-worker"
              ? "Test réussi : le navigateur a traité la page comme étant en arrière-plan, le service worker a reçu le message, affiché la notification système et transmis le toast à la page."
              : `Firebase a accepté l'envoi, mais ni la page ni le service worker n'ont confirmé sa réception sous ${FCM_RECEIPT_TIMEOUT_MS / 1000} s. Cliquez sur « Réinitialiser les notifications » puis réessayez ; si le problème persiste, vérifiez les erreurs de console et l'état de l'abonnement/push dans le navigateur.`
        )
      }
    } catch (e) {
      setPushError(pushErrorMessage(e))
    } finally {
      removeDeliveryListener()
      if (deliveryTimer !== undefined) window.clearTimeout(deliveryTimer)
      setPushLoading(false)
    }
  }

  const handleLocalNotification = async () => {
    setPushError(null)
    setPushMessage(null)
    try {
      if (typeof Notification === "undefined" || !("serviceWorker" in navigator)) {
        setPushError("Ce navigateur ne supporte pas les notifications.")
        return
      }
      let permission = Notification.permission
      if (permission === "default") {
        permission = await Notification.requestPermission()
      }
      if (permission !== "granted") {
        setPushError(
          permission === "denied"
            ? "Les notifications sont bloquées pour ce site. Autorisez-les dans les paramètres du navigateur, puis rechargez la page."
            : "Autorisez d'abord les notifications dans le navigateur."
        )
        return
      }
      // Never let this button hang silently: if the service worker registration
      // is slow or stuck, fall through to a page-level notification.
      const registration = await Promise.race([
        registerMessagingServiceWorker().catch((regError) => {
          console.warn("[FCM] service worker registration failed", regError)
          return null
        }),
        new Promise<null>((resolve) => {
          setTimeout(() => resolve(null), 8000)
        }),
      ])

      const title = "Test local — MayouDashboard"
      const body =
        "Si vous voyez cette notification, le navigateur et le système les affichent bien."
      const tag = `mayou-local-${Date.now()}`
      let acceptedByWorker = false

      try {
        if (registration) {
          await registration.showNotification(title, {
            body,
            icon: "/icon-192.png",
            badge: "/icon-192.png",
            tag,
            data: { link: "/dashboard" },
          })
          acceptedByWorker = true
        }
      } catch (swError) {
        console.warn("[FCM] service worker showNotification failed", swError)
      }

      // showNotification() resolves even when Windows/macOS silently suppress
      // the popup. getNotifications() at least proves the browser registered
      // it in the notification centre.
      let registeredInCentre = false
      if (acceptedByWorker && registration) {
        try {
          registeredInCentre = (await registration.getNotifications({ tag })).length > 0
        } catch {
          /* not supported everywhere */
        }
        setPushMessage(
          registeredInCentre
            ? "Notification locale enregistrée par le navigateur (visible dans le centre de notifications). Si aucun popup ne s'affiche, Windows/macOS/Android le masque : activez les notifications pour Google Chrome dans les réglages système et désactivez « Ne pas déranger »."
            : "Le navigateur a accepté la notification locale. Si aucun popup ne s'affiche, c'est le système qui la masque : vérifiez les réglages de notifications de Windows/macOS/Android (Chrome autorisé, mode Ne pas déranger désactivé)."
        )
      } else {
        // Some desktops refuse service-worker notifications but still allow a
        // page notification. This tells us which path is blocked.
        let pageNotificationShown = false
        try {
          new Notification(title, { body, icon: "/icon-192.png", tag })
          pageNotificationShown = true
        } catch (pageError) {
          console.warn("[FCM] page Notification() failed", pageError)
        }
        if (pageNotificationShown) {
          setPushMessage(
            registration
              ? "Notification de page affichée (le service worker a été refusé). Si elle n'apparaît pas, le système bloque les notifications de Chrome."
              : "Le service worker de notifications n'a pas répondu ; une notification de page a été affichée. Si elle n'apparaît pas, le système bloque les notifications de Chrome."
          )
        } else {
          setPushError(
            "Le navigateur a refusé d'afficher la notification locale. Vérifiez que les notifications sont autorisées pour ce site et que Windows/macOS autorise les notifications de Google Chrome."
          )
        }
      }
      void refreshServiceWorkerStatus()
    } catch (e) {
      setPushError(
        e instanceof Error ? e.message : "Impossible d'afficher la notification locale"
      )
    }
  }

  useEffect(() => {
    if (user) {
      setFormData({
        nom: user.nom || "",
        prenom: user.prenom || "",
        email: user.email || "",
        telephone: user.telephone || "",
        username: user.username || ""
      })
    }
  }, [user])

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const table = user?.role === "admin" ? "admins" : "doctors"
    
    const { error: updateError } = await supabase
      .from(table)
      .update({
        nom: formData.nom,
        prenom: formData.prenom,
        email: formData.email,
        telephone: formData.telephone,
        username: formData.username
      })
      .eq("id", user?.id)

    if (updateError) {
      setError("Erreur lors de la mise à jour du profil")
    } else {
      setSuccess("Profil mis à jour avec succès")
      const updatedUser = { ...user, ...formData }
      sessionStorage.setItem("user", JSON.stringify(updatedUser))
      setTimeout(() => setSuccess(null), 3000)
    }
    setLoading(false)
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("Les nouveaux mots de passe ne correspondent pas")
      setLoading(false)
      return
    }

    if (passwordData.newPassword.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères")
      setLoading(false)
      return
    }

    const table = user?.role === "admin" ? "admins" : "doctors"
    
    const { data: userData, error: fetchError } = await supabase
      .from(table)
      .select("password")
      .eq("id", user?.id)
      .single()

    if (fetchError || userData?.password !== passwordData.currentPassword) {
      setError("Mot de passe actuel incorrect")
      setLoading(false)
      return
    }

    const { error: updateError } = await supabase
      .from(table)
      .update({ password: passwordData.newPassword })
      .eq("id", user?.id)

    if (updateError) {
      setError("Erreur lors de la mise à jour du mot de passe")
    } else {
      setSuccess("Mot de passe mis à jour avec succès")
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      })
      setTimeout(() => setSuccess(null), 3000)
    }
    setLoading(false)
  }

  const InputField = ({ label, name, type = "text", value, onChange, placeholder, icon, required = false }: any) => (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
            {icon}
          </div>
        )}
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={`w-full ${icon ? 'pl-10' : 'pl-4'} pr-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-slate-800 font-medium transition`}
        />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen app-background">
      <div className="mx-auto max-w-5xl px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-1">Paramètres</h1>
          <p className="text-slate-600">Gérez vos informations personnelles et les préférences de votre compte</p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-emerald-100 border border-emerald-300 rounded-xl flex items-center gap-2 text-emerald-800 font-medium">
            <CheckCircle size={18} />
            <span>{success}</span>
            <button onClick={() => setSuccess(null)} className="ml-auto">
              <X size={16} />
            </button>
          </div>
        )}
        
        {error && (
          <div className="mb-6 p-4 bg-rose-100 border border-rose-300 rounded-xl flex items-center gap-2 text-rose-800 font-medium">
            <AlertCircle size={18} />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto">
              <X size={16} />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm sticky top-8">
              <div className="text-center">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center mx-auto shadow-lg">
                  <UserCircle2 size={48} className="text-white" />
                </div>
                <h3 className="mt-4 text-xl font-bold text-slate-800">
                  {user?.prenom} {user?.nom}
                </h3>
                <p className="text-sm text-slate-600 font-medium mt-1">
                  {user?.role === "admin" ? "Administrateur" : "Médecin"}
                </p>
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between text-sm py-2">
                    <span className="text-slate-600 font-medium">Nom d'utilisateur</span>
                    <span className="font-bold text-slate-800">@{user?.username}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm py-2">
                    <span className="text-slate-600 font-medium">Email</span>
                    <span className="font-medium text-slate-700 truncate max-w-[150px]">{user?.email || "—"}</span>
                  </div>
                  {user?.role === "doctor" && (
                    <div className="flex items-center justify-between text-sm py-2">
                      <span className="text-slate-600 font-medium">Téléphone</span>
                      <span className="font-medium text-slate-700">{user?.telephone || "—"}</span>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={logout}
                className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-100 text-rose-700 rounded-xl font-semibold hover:bg-rose-200 transition"
              >
                <LogOut size={16} />
                Déconnexion
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Profile Information */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2">
                  <User size={18} className="text-cyan-700" />
                  <h2 className="font-bold text-slate-800">Informations personnelles</h2>
                </div>
              </div>
              <div className="p-6">
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <InputField
                      label="Nom"
                      name="nom"
                      value={formData.nom}
                      onChange={(e: any) => setFormData({ ...formData, nom: e.target.value })}
                      placeholder="Votre nom"
                      icon={<User size={16} />}
                      required
                    />
                    <InputField
                      label="Prénom"
                      name="prenom"
                      value={formData.prenom}
                      onChange={(e: any) => setFormData({ ...formData, prenom: e.target.value })}
                      placeholder="Votre prénom"
                      icon={<User size={16} />}
                      required
                    />
                  </div>
                  <InputField
                    label="Nom d'utilisateur"
                    name="username"
                    value={formData.username}
                    onChange={(e: any) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Nom d'utilisateur"
                    icon={<User size={16} />}
                    required
                  />
                  <InputField
                    label="Email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={(e: any) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="votre@email.com"
                    icon={<Mail size={16} />}
                  />
                  {user?.role === "doctor" && (
                    <InputField
                      label="Téléphone"
                      name="telephone"
                      value={formData.telephone}
                      onChange={(e: any) => setFormData({ ...formData, telephone: e.target.value })}
                      placeholder="06 12 34 56 78"
                      icon={<Phone size={16} />}
                    />
                  )}
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center gap-2 px-5 py-2.5 bg-cyan-700 text-white rounded-xl font-semibold hover:bg-cyan-800 transition disabled:opacity-50 shadow-md"
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      Enregistrer
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Change Password */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2">
                  <Lock size={18} className="text-amber-700" />
                  <h2 className="font-bold text-slate-800">Changer le mot de passe</h2>
                </div>
              </div>
              <div className="p-6">
                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                  <div className="relative">
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mot de passe actuel</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        placeholder="Votre mot de passe actuel"
                        className="w-full pl-10 pr-12 py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-800 font-medium"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                      >
                        {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nouveau mot de passe</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        placeholder="Nouveau mot de passe (min. 6 caractères)"
                        className="w-full pl-10 pr-12 py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-800 font-medium"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirmer le nouveau mot de passe</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        placeholder="Confirmez votre nouveau mot de passe"
                        className="w-full pl-10 pr-12 py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-800 font-medium"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 transition disabled:opacity-50 shadow-md"
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                      Changer le mot de passe
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Notifications */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2">
                  <Bell size={18} className="text-purple-700" />
                  <h2 className="font-bold text-slate-800">Notifications</h2>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="rounded-xl border border-cyan-100 bg-cyan-50/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="flex items-center gap-2 font-semibold text-slate-800">
                        <BellRing size={16} className="text-cyan-700" />
                        Notifications push (téléphone / navigateur)
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Statut :{" "}
                        {pushDeviceActive
                          ? "activées sur cet appareil"
                          : pushPermission === "granted"
                            ? "autorisation accordée, activation à terminer"
                          : pushPermission === "denied"
                            ? "refusées dans le navigateur"
                            : pushPermission === "unsupported"
                              ? "non supportées par ce navigateur"
                              : "non activées"}
                      </p>
                    </div>
                    <span
                      className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                        pushDeviceActive ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleEnablePush}
                      disabled={pushLoading || pushPermission === "unsupported"}
                      className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-cyan-700 disabled:opacity-50"
                    >
                      {pushLoading ? <Loader2 size={15} className="animate-spin" /> : <BellRing size={15} />}
                      Activer cet appareil
                    </button>
                    <button
                      type="button"
                      onClick={handleTestPush}
                      disabled={pushLoading || pushPermission === "unsupported"}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      <Send size={15} />
                      Envoyer un test
                    </button>
                    <button
                      type="button"
                      onClick={handleLocalNotification}
                      disabled={pushPermission === "unsupported"}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      <Bell size={15} />
                      Notification locale
                    </button>
                    <button
                      onClick={handleResetPush}
                      disabled={pushLoading || pushPermission === "unsupported"}
                      title="Recrée l'abonnement Push du navigateur et le token FCM quand un appareil est resté « unregistered »"
                      className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
                    >
                      <RefreshCw size={15} />
                      Réinitialiser les notifications
                    </button>
                  </div>

                  {pushMessage && <p className="mt-2 text-xs text-emerald-700">{pushMessage}</p>}
                  {pushError && <p className="mt-2 text-xs text-rose-600">{pushError}</p>}

                  <div className="mt-3 space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600">
                    <p>
                      <span className="font-semibold text-slate-700">Permission :</span>{" "}
                      {pushPermission}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-700">Service worker :</span>{" "}
                      {swStatus}
                    </p>
                    <p className="break-all">
                      <span className="font-semibold text-slate-700">Token :</span>{" "}
                      {pushToken ? `${pushToken.slice(0, 24)}…` : "non obtenu"}
                    </p>
                    {lastTestResult && (
                      <p className="break-all">
                        <span className="font-semibold text-slate-700">Dernier test :</span>{" "}
                        {lastTestResult}
                      </p>
                    )}
                  </div>
                </div>

                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Mail size={16} className="text-slate-500" />
                    <span className="text-slate-700 font-medium">Notifications par email</span>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={notifications.emailNotifications}
                      onChange={(e) => setNotifications({ ...notifications, emailNotifications: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:bg-cyan-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  </div>
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Smartphone size={16} className="text-slate-500" />
                    <span className="text-slate-700 font-medium">Notifications par SMS</span>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={notifications.smsNotifications}
                      onChange={(e) => setNotifications({ ...notifications, smsNotifications: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:bg-cyan-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  </div>
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Calendar size={16} className="text-slate-500" />
                    <span className="text-slate-700 font-medium">Rappels d'intervention</span>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={notifications.appointmentReminders}
                      onChange={(e) => setNotifications({ ...notifications, appointmentReminders: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:bg-cyan-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  </div>
                </label>
              </div>
            </div>

            {/* Export Data */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2">
                  <Download size={18} className="text-green-700" />
                  <h2 className="font-bold text-slate-800">Données</h2>
                </div>
              </div>
              <div className="p-6 space-y-3">
                <button className="w-full flex items-center justify-between p-3 bg-slate-100 rounded-xl hover:bg-slate-200 transition">
                  <div className="flex items-center gap-3">
                    <Download size={16} className="text-slate-600" />
                    <span className="text-slate-700 font-medium">Exporter mes données</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-500" />
                </button>
                <button className="w-full flex items-center justify-between p-3 bg-slate-100 rounded-xl hover:bg-slate-200 transition">
                  <div className="flex items-center gap-3">
                    <Printer size={16} className="text-slate-600" />
                    <span className="text-slate-700 font-medium">Imprimer le rapport d'activité</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-500" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}