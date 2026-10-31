import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  deleteToken,
  onMessage,
  isSupported,
  type Messaging,
  type MessagePayload,
  type Unsubscribe,
} from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export const firebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const SW_PATH = "/firebase-messaging-sw.js";
const SW_SCOPE = "/";
const SW_ACTIVATION_TIMEOUT_MS = 15_000;
const SW_REGISTER_ATTEMPTS = 3;

let messagingPromise: Promise<Messaging | null> | null = null;
let serviceWorkerRegistrationPromise: Promise<ServiceWorkerRegistration> | null =
  null;
let tokenRequestPromise: Promise<string | null> | null = null;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/**
 * Chrome/Firefox reject an in-flight `register()` with an AbortError when the
 * page unloads, when an update check runs at the same time, or when another
 * tab registers the same scope. The message is often only "Operation has been
 * aborted", so treat the error name as well as the message.
 */
function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException) return error.name === "AbortError";
  return (
    error instanceof Error &&
    (error.name === "AbortError" || /abort/i.test(error.message))
  );
}

function isOurWorker(worker: ServiceWorker | null | undefined): boolean {
  if (!worker) return false;
  try {
    return new URL(worker.scriptURL).pathname === SW_PATH;
  } catch {
    return false;
  }
}

/**
 * A registration can exist at our scope but point at another script (for
 * example a leftover PWA worker). Such a registration must never be handed to
 * Firebase Messaging: it subscribes Push on the wrong worker.
 */
function isOurRegistration(registration: ServiceWorkerRegistration): boolean {
  return (
    isOurWorker(registration.active) ||
    isOurWorker(registration.installing) ||
    isOurWorker(registration.waiting)
  );
}

/**
 * Returns the Messaging instance, or null when the browser does not support
 * the APIs required by FCM (e.g. iOS Safari without a home-screen install).
 */
async function getMessagingInstance(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null;
  if (!messagingPromise) {
    messagingPromise = isSupported().then((supported) =>
      supported ? getMessaging(firebaseApp) : null,
    );
  }
  return messagingPromise;
}

function waitForServiceWorkerActivation(
  registration: ServiceWorkerRegistration,
): Promise<ServiceWorkerRegistration> {
  if (isOurWorker(registration.active) && registration.active?.state === "activated")
    return Promise.resolve(registration);

  const worker =
    registration.installing || registration.waiting || registration.active;
  if (!worker) {
    return Promise.reject(
      new Error(
        "Le navigateur n'a pas créé le service worker de notifications.",
      ),
    );
  }
  if (worker.state === "activated") return Promise.resolve(registration);

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      window.clearTimeout(timeout);
      worker.removeEventListener("statechange", onStateChange);
    };
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(
        new Error("Le service worker ne s'est pas activé dans les délais."),
      );
    }, SW_ACTIVATION_TIMEOUT_MS);
    const onStateChange = () => {
      if (
        worker.state === "activated" ||
        (isOurWorker(registration.active) &&
          registration.active?.state === "activated")
      ) {
        cleanup();
        resolve(registration);
      } else if (worker.state === "redundant") {
        cleanup();
        reject(new Error("Le service worker a été rejeté par le navigateur."));
      }
    };

    worker.addEventListener("statechange", onStateChange);
    onStateChange();
  });
}

/**
 * Registers (or reuses) the Firebase messaging service worker and resolves
 * only once it is actually activated. Reusing an existing registration and
 * passing it explicitly to getToken avoids the
 * "Service worker not registered after 10000 ms" error.
 */
export async function registerMessagingServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  // Several mounted areas (the notification provider and Settings page) can
  // request an FCM token at the same time. Share one registration operation;
  // parallel register/update calls can abort an in-flight ServiceWorker job.
  if (!serviceWorkerRegistrationPromise) {
    const registerOrReuse = async (): Promise<ServiceWorkerRegistration> => {
      const existing = await navigator.serviceWorker.getRegistration(SW_SCOPE);

      // Reuse a worker that is already ours and active instead of starting a
      // new register job. Update it in the background so changes to
      // public/firebase-messaging-sw.js are still picked up without making the
      // token request depend on that update finishing.
      if (existing && isOurRegistration(existing)) {
        if (isOurWorker(existing.active) && existing.active?.state === "activated") {
          void existing.update().catch(() => {
            /* an aborted background update is harmless */
          });
          return existing;
        }
        return waitForServiceWorkerActivation(existing);
      }

      // No usable registration (or a leftover worker for another script at the
      // same scope): register ours. Retry on AbortError because Chrome/Firefox
      // abort a register job when a page reload, an automatic update check or
      // another tab competes for the same scope.
      let lastError: unknown = null;
      for (let attempt = 0; attempt < SW_REGISTER_ATTEMPTS; attempt += 1) {
        try {
          const registration = await navigator.serviceWorker.register(SW_PATH, {
            scope: SW_SCOPE,
            updateViaCache: "none",
          });
          return await waitForServiceWorkerActivation(registration);
        } catch (error) {
          lastError = error;

          // The abort may only mean another job replaced ours. Use whatever
          // registration exists now, if any.
          const settled =
            await navigator.serviceWorker.getRegistration(SW_SCOPE);
          if (settled && isOurRegistration(settled)) {
            if (isOurWorker(settled.active) && settled.active?.state === "activated")
              return settled;
            try {
              return await waitForServiceWorkerActivation(settled);
            } catch {
              /* not usable yet: retry below */
            }
          }

          if (!isAbortError(error)) throw error;
          if (attempt < SW_REGISTER_ATTEMPTS - 1) {
            await delay(300 * (attempt + 1));
          }
        }
      }

      throw lastError instanceof Error
        ? lastError
        : new Error(
            "Impossible d'enregistrer le service worker de notifications.",
          );
    };

    serviceWorkerRegistrationPromise = (async () => {
      // Module-level promise covers callers in this tab. The Web Lock also
      // serializes first-time registration across multiple open app tabs.
      if (navigator.locks) {
        return navigator.locks.request(
          "mayoudashboard-fcm-service-worker",
          registerOrReuse,
        );
      }
      return registerOrReuse();
    })().catch((error: unknown) => {
      serviceWorkerRegistrationPromise = null;
      throw error;
    });
  }

  return serviceWorkerRegistrationPromise;
}

/**
 * Requests notification permission (if needed), registers the service worker
 * and returns the FCM token for this device.
 */
async function requestFcmToken(): Promise<string | null> {
  try {
    const messaging = await getMessagingInstance();
    if (!messaging) {
      console.warn(
        "FCM n'est pas supporté par ce navigateur. Sur iOS, installez l'application sur l'écran d'accueil (iOS 16.4+).",
      );
      return null;
    }

    if (typeof Notification === "undefined") return null;

    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }
    if (permission !== "granted") {
      console.warn("Permission de notification refusée.");
      return null;
    }

    const serviceWorkerRegistration = await registerMessagingServiceWorker();
    if (!serviceWorkerRegistration) {
      throw new Error(
        "Les service workers ne sont pas disponibles dans ce navigateur.",
      );
    }

    const currentToken = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      ...(serviceWorkerRegistration ? { serviceWorkerRegistration } : {}),
    });

    return currentToken || null;
  } catch (error) {
    console.error("Erreur lors de la récupération du token FCM :", error);
    throw error;
  }
}

/**
 * Shares token creation between the provider, settings diagnostics, and React
 * Strict Mode effect replays. Concurrent PushManager.subscribe calls can be
 * aborted by the browser even when the service worker itself is active.
 */
export function requestForToken(): Promise<string | null> {
  if (!tokenRequestPromise) {
    tokenRequestPromise = requestFcmToken().finally(() => {
      tokenRequestPromise = null;
    });
  }
  return tokenRequestPromise;
}

/**
 * Makes the Firebase SDK use our registration before deleteToken().
 *
 * deleteToken() has no registration parameter: it reads messaging.swRegistration
 * and falls back to registerServiceWorker() (a second worker at the
 * /firebase-cloud-messaging-push-scope scope) when it was never set. Priming
 * getToken() with our registration keeps everything on the same worker.
 */
async function primeMessagingRegistration(
  messaging: Messaging,
  registration: ServiceWorkerRegistration | null,
): Promise<void> {
  if (!registration) return;
  if (typeof Notification === "undefined" || Notification.permission !== "granted") {
    return;
  }
  try {
    await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
  } catch (error) {
    console.warn("Impossible de relire le token FCM :", error);
  }
}

/**
 * Removes the browser Push subscription by hand.
 *
 * Firebase's deleteToken() unsubscribes Push only after its server-side
 * DELETE succeeded. When FCM already considers the token dead it answers 404
 * "Device unregistered.", deleteToken() rejects first, and the old Push
 * subscription (plus the cached token) is left behind. Calling this
 * explicitly makes the next getToken() create a brand-new subscription, which
 * is the only way to force a brand-new FCM token.
 */
async function dropPushSubscription(
  registration: ServiceWorkerRegistration | null,
): Promise<void> {
  if (!registration) return;
  try {
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) await subscription.unsubscribe();
  } catch (error) {
    console.warn("Impossible de supprimer l'abonnement Push :", error);
  }
}

/**
 * Replaces a registration token rejected by FCM as stale/unregistered and
 * guarantees that the returned token is a different one.
 */
export async function refreshForToken(): Promise<string | null> {
  const messaging = await getMessagingInstance();
  if (!messaging) return null;

  // Firebase's deleteToken() falls back to registerServiceWorker() when it
  // does not know which worker is in use. That extra register() call races
  // ours for the same scope and surfaces as "Operation has been aborted".
  // Priming getToken() with our registration makes the SDK reuse it.
  const registration = await registerMessagingServiceWorker();
  await primeMessagingRegistration(messaging, registration);

  let previousToken: string | null = null;
  try {
    previousToken = await requestForToken();
  } catch (error) {
    console.warn("Impossible de relire le token FCM avant renouvellement :", error);
  }

  try {
    await deleteToken(messaging);
  } catch (error) {
    // A dead token makes the server-side DELETE fail, which aborts the SDK
    // cleanup. We recover below instead of returning the dead token again.
    console.warn("Impossible de supprimer l'ancien token FCM :", error);
  }

  let refreshedToken: string | null = null;
  try {
    refreshedToken = await requestForToken();
  } catch (error) {
    console.warn("Impossible de renouveler le token FCM :", error);
  }

  // If the token did not change, deleteToken() never reached the local cache
  // nor the Push subscription. Sending again with that token is exactly what
  // produced HTTP 410 "Device unregistered". Force a new subscription.
  if (!refreshedToken || refreshedToken === previousToken) {
    await dropPushSubscription(registration);
    refreshedToken = await requestForToken();
  }

  return refreshedToken;
}

/**
 * Full recovery for a corrupted Push state: drops the FCM token and the
 * browser Push subscription, then creates both again. Use it when FCM keeps
 * answering "Device unregistered" even after a normal token refresh.
 */
export async function resetPushRegistration(): Promise<string | null> {
  const messaging = await getMessagingInstance();
  if (!messaging) return null;

  const registration = await registerMessagingServiceWorker();
  await primeMessagingRegistration(messaging, registration);

  let previousToken: string | null = null;
  try {
    previousToken = await requestForToken();
  } catch {
    /* no current token: nothing to compare */
  }

  try {
    await deleteToken(messaging);
  } catch (error) {
    console.warn("Réinitialisation : suppression du token FCM impossible :", error);
  }

  await dropPushSubscription(registration);

  const resetToken = await requestForToken();
  if (previousToken && resetToken === previousToken) {
    throw new Error(
      "Le navigateur n'a pas recréé l'abonnement Push (token inchangé). Ouvrez DevTools → Application → Clear site data, rechargez la page, puis réactivez les notifications.",
    );
  }

  return resetToken;
}

/**
 * Subscribes to foreground messages. Returns an unsubscribe function.
 */
export async function onForegroundMessage(
  callback: (payload: MessagePayload) => void,
): Promise<Unsubscribe | null> {
  const messaging = await getMessagingInstance();
  if (!messaging) return null;
  return onMessage(messaging, callback);
}

/** Kept for backwards compatibility with existing imports. */
export const onMessageListener = () =>
  new Promise<MessagePayload>((resolve, reject) => {
    onForegroundMessage(resolve).catch(reject);
  });
