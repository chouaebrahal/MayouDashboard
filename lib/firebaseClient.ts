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

let messagingPromise: Promise<Messaging | null> | null = null;

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

  // Always call register(): it is idempotent and also triggers an update
  // check, so a previously cached/broken worker gets replaced.
  const registration = await navigator.serviceWorker.register(SW_PATH, {
    scope: "/",
  });

  // Wait for the worker to reach the "activated" state (max 15s).
  const worker =
    registration.installing || registration.waiting || registration.active;
  if (worker && worker.state !== "activated") {
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        reject(
          new Error("Le service worker ne s'est pas activé dans les délais."),
        );
      }, 15_000);

      const onStateChange = () => {
        if (worker.state === "activated") {
          window.clearTimeout(timeout);
          worker.removeEventListener("statechange", onStateChange);
          resolve();
        } else if (worker.state === "redundant") {
          window.clearTimeout(timeout);
          worker.removeEventListener("statechange", onStateChange);
          reject(
            new Error("Le service worker a été rejeté par le navigateur."),
          );
        }
      };

      worker.addEventListener("statechange", onStateChange);
      onStateChange();
    });
  }

  return registration;
}

/**
 * Requests notification permission (if needed), registers the service worker
 * and returns the FCM token for this device.
 */
export async function requestForToken(): Promise<string | null> {
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

    const currentToken = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      ...(serviceWorkerRegistration ? { serviceWorkerRegistration } : {}),
    });

    return currentToken || null;
  } catch (error) {
    console.error("Erreur lors de la récupération du token FCM :", error);
    return null;
  }
}

/**
 * Replaces a registration token rejected by FCM as stale/unregistered.
 */
export async function refreshForToken(): Promise<string | null> {
  const messaging = await getMessagingInstance();
  if (!messaging) return null;

  try {
    await deleteToken(messaging);
  } catch (error) {
    console.warn("Impossible de supprimer l'ancien token FCM :", error);
  }

  return requestForToken();
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
