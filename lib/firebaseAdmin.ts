import admin from "firebase-admin"

/**
 * Every device that activates notifications (doctor or admin) subscribes to
 * this topic, so all users see when someone adds a patient.
 */
export const FCM_TOPIC = "doctors"

/**
 * Initializes the Firebase Admin SDK once per server process.
 * Throws a clear error when the service-account env vars are missing.
 */
export function getFirebaseAdmin() {
  if (admin.apps.length) return admin

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Configuration Firebase Admin manquante. Vérifiez FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL et FIREBASE_PRIVATE_KEY."
    )
  }

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    projectId,
  })

  return admin
}

export function isValidTopic(topic: string) {
  return /^[a-zA-Z0-9-_.~%]+$/.test(topic)
}
