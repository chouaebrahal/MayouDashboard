import { NextResponse } from "next/server"
import { differenceInCalendarDays } from "date-fns"
import { supabase } from "@/lib/supabaseClient"
import { getFirebaseAdmin, FCM_TOPIC } from "@/lib/firebaseAdmin"
import { isPendingDossierOverDays, getDossierReferenceDate } from "@/lib/pendingDossiers"
import type { Patient } from "@/types/db"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * Sends one push notification to every subscribed device when a pending
 * dossier reaches exactly 10 days, then exactly 15 days after the
 * intervention date (or the creation date when no intervention is set).
 *
 * Sending only on the exact threshold day means no "already sent" tracking
 * table is needed, and the same patient is never spammed every day.
 *
 * Call it from a daily cron:
 *   GET /api/check-pending-dossiers
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const authorization = req.headers.get("authorization")
    if (authorization !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  try {
    const { data, error } = await supabase.from("patients").select("*")
    if (error) throw new Error(error.message)

    const patients = (data || []) as Patient[]
    const today = new Date()
    const admin = getFirebaseAdmin()

    async function sendForThreshold(days: 10 | 15) {
      const due = patients.filter((patient) => {
        if (!isPendingDossierOverDays(patient, days, today)) return false
        const reference = getDossierReferenceDate(patient)
        if (!reference) return false
        // Only on the exact day to avoid a daily repeat.
        return differenceInCalendarDays(today, reference) === days
      })

      const results: Array<{ patientId: string; days: number; messageId: string }> = []

      for (const patient of due) {
        const name =
          `${patient.prenom || ""} ${patient.nom || ""}`.trim() || "Patient"
        const link = `/dashboard/patients/${patient.id}`

        const title =
          days >= 15
            ? "Relance urgente : dossier non déposé depuis 15 jours"
            : "Dossier non déposé depuis 10 jours"
        const body =
          days >= 15
            ? `${name} — 15 jours après l'intervention, le dossier n'est toujours pas déposé.`
            : `${name} — 10 jours après l'intervention, le dossier n'est pas encore déposé.`

        const messageId = await admin.messaging().send({
          topic: FCM_TOPIC,
          notification: { title, body },
          data: {
            patientId: patient.id,
            link,
            threshold: String(days),
          },
          webpush: {
            notification: { icon: "/icon-192.png", badge: "/icon-192.png" },
            fcmOptions: { link },
          },
          android: {
            priority: "high",
            notification: {
              icon: "stock_ticker_update",
              sound: "default",
              clickAction: link,
            },
          },
          apns: {
            payload: { aps: { sound: "default", badge: 1 } },
          },
        })

        results.push({ patientId: patient.id, days, messageId })
      }

      return results
    }

    const results = [
      ...(await sendForThreshold(10)),
      ...(await sendForThreshold(15)),
    ]

    return NextResponse.json({ success: true, sent: results.length, results })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue"
    console.error("Error checking pending dossiers:", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
