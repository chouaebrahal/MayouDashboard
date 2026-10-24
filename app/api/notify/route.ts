import { NextResponse } from "next/server"
import { getFirebaseAdmin, FCM_TOPIC, isValidTopic } from "@/lib/firebaseAdmin"

interface NotifyBody {
  token?: string
  tokens?: string[]
  topic?: string
  title?: string
  body?: string
  data?: Record<string, string | number | boolean>
}

function toData(data: NotifyBody["data"]): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(data || {})) {
    if (value !== undefined && value !== null) result[key] = String(value)
  }
  return result
}

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as NotifyBody
    const { token, tokens, topic, title, body, data } = payload

    const targets = (tokens?.length ? tokens : token ? [token] : []).filter(Boolean)
    const targetTopic = topic === "" ? FCM_TOPIC : topic

    if (targets.length === 0 && !targetTopic) {
      return NextResponse.json(
        { error: "Provide a token, tokens, or topic" },
        { status: 400 }
      )
    }

    if (targetTopic && !isValidTopic(targetTopic)) {
      return NextResponse.json({ error: "Invalid topic name" }, { status: 400 })
    }

    const admin = getFirebaseAdmin()

    const link = toData(data).link || "/dashboard"
    const notification = {
      title: title || "MayouDashboard",
      body: body || "",
    }

    // The same payload works for Web, Android and iOS FCM tokens.
    const base = {
      notification,
      data: toData(data),
      webpush: {
        notification: {
          icon: "/icon-192.png",
          badge: "/icon-192.png",
        },
        fcmOptions: { link },
      },
      android: {
        priority: "high" as const,
        notification: {
          icon: "stock_ticker_update",
          sound: "default",
          clickAction: link,
        },
      },
      apns: {
        payload: { aps: { sound: "default", badge: 1 } },
      },
    }

    // Topic delivery needs no database and reaches every subscribed device.
    if (targets.length === 0 && targetTopic) {
      const response = await admin.messaging().send({ ...base, topic: targetTopic })
      return NextResponse.json(
        { success: true, topic: targetTopic, response },
        { status: 200 }
      )
    }

    if (targets.length === 1) {
      // For a direct token test, send DATA-ONLY so that onMessage fires
      // while the tab is in foreground. FCM won't auto-display it, but our
      // NotificationProvider will show a system notification + in-app toast.
      const { notification: _notification, ...dataOnlyBase } = base as any
      const response = await admin.messaging().send({
        ...dataOnlyBase,
        token: targets[0],
        data: {
          ...(toData(data) || {}),
          title: title || "MayouDashboard",
          body: body || "Les notifications push fonctionnent sur cet appareil ✅",
          link: link || "/dashboard",
        },
      })
      return NextResponse.json({ success: true, response }, { status: 200 })
    }

    const response = await admin.messaging().sendEachForMulticast({
      ...base,
      tokens: targets,
    })
    return NextResponse.json(
      {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
        responses: response.responses.map((r) => ({
          success: r.success,
          messageId: r.messageId,
          error: r.error?.message,
          code: r.error?.code,
        })),
      },
      { status: 200 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue"
    console.error("Error sending notification:", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
