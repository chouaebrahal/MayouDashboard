import { supabase } from "./supabaseClient"

export type AppRole = "admin" | "doctor"

/**
 * Stores an FCM token for one device. A doctor can therefore receive push
 * notifications on several devices at once (web browser + phone).
 *
 * This is OPTIONAL: notifications are delivered through the FCM topic
 * "doctors", which does not need any database table. The storage below just
 * keeps a per-device trace and falls back silently when migration 003 has
 * not been applied yet.
 */
export async function saveFcmToken(
  userId: string,
  role: AppRole,
  token: string
): Promise<{ ok: boolean; error?: string }> {
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : ""
  const platform = /android/i.test(userAgent)
    ? "android"
    : /iphone|ipad|ipod/i.test(userAgent)
      ? "ios"
      : "web"

  const { error: tokenTableError } = await supabase.from("fcm_tokens").upsert(
    {
      user_id: userId,
      role,
      token,
      platform,
      user_agent: userAgent,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "token" }
  )

  if (!tokenTableError) return { ok: true }

  // Fallback for installations where migration 003 has not been run yet.
  const table = role === "admin" ? "admins" : "doctors"
  const { error } = await supabase.from(table).update({ fcm_token: token }).eq("id", userId)

  if (error) {
    return { ok: false, error: `${tokenTableError.message} / ${error.message}` }
  }

  return { ok: true }
}

/**
 * Registers the current device for push notifications.
 *
 * 1. Subscribes the token to the "doctors" FCM topic (no DB needed). Every
 *    user who activates notifications receives new-patient alerts.
 * 2. Best-effort saves the token in the database for multi-device tracking.
 */
export async function registerPushDevice(
  userId: string,
  role: AppRole,
  token: string
): Promise<{ subscribed: boolean; stored: boolean; error?: string }> {
  let subscribed = false
  let subscribeError: string | undefined

  try {
    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
    if (res.ok) {
      subscribed = true
    } else {
      const json = await res.json().catch(() => ({}))
      subscribeError = json.error || `HTTP ${res.status}`
    }
  } catch (error) {
    subscribeError = error instanceof Error ? error.message : String(error)
  }

  const storage = await saveFcmToken(userId, role, token)

  return { subscribed, stored: storage.ok, error: subscribeError }
}
