import { NextResponse } from "next/server"
import { getFirebaseAdmin, FCM_TOPIC, isValidTopic } from "@/lib/firebaseAdmin"

/**
 * Subscribes a device token to the notification topic.
 * This is stored by Firebase itself, so no database table is required.
 */
export async function POST(req: Request) {
  try {
    const { token, topic } = (await req.json()) as { token?: string; topic?: string }

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 })
    }

    const targetTopic = topic || FCM_TOPIC
    if (!isValidTopic(targetTopic)) {
      return NextResponse.json({ error: "Invalid topic name" }, { status: 400 })
    }

    const admin = getFirebaseAdmin()
    const response = await admin.messaging().subscribeToTopic(token, targetTopic)

    if (response.failureCount > 0) {
      return NextResponse.json(
        { success: false, topic: targetTopic, ...response },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: true, topic: targetTopic, ...response },
      { status: 200 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue"
    console.error("Error subscribing to topic:", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { token, topic } = (await req.json()) as { token?: string; topic?: string }

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 })
    }

    const targetTopic = topic || FCM_TOPIC
    if (!isValidTopic(targetTopic)) {
      return NextResponse.json({ error: "Invalid topic name" }, { status: 400 })
    }

    const admin = getFirebaseAdmin()
    const response = await admin.messaging().unsubscribeFromTopic(token, targetTopic)

    if (response.failureCount > 0) {
      return NextResponse.json(
        { success: false, topic: targetTopic, ...response },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: true, topic: targetTopic, ...response },
      { status: 200 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue"
    console.error("Error unsubscribing from topic:", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
