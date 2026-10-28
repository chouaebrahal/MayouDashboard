import { NextResponse } from "next/server";
import { getFirebaseAdmin, FCM_TOPIC, isValidTopic } from "@/lib/firebaseAdmin";

interface NotifyBody {
  token?: string;
  tokens?: string[];
  topic?: string;
  title?: string;
  body?: string;
  data?: Record<string, string | number | boolean>;
}

function toData(data: NotifyBody["data"]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(data || {})) {
    if (value !== undefined && value !== null) result[key] = String(value);
  }
  return result;
}

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as NotifyBody;
    const { token, tokens, topic, title, body, data } = payload;

    const targets = (tokens?.length ? tokens : token ? [token] : []).filter(
      Boolean,
    );
    const targetTopic = topic === "" ? FCM_TOPIC : topic;

    if (targets.length === 0 && !targetTopic) {
      return NextResponse.json(
        { error: "Provide a token, tokens, or topic" },
        { status: 400 },
      );
    }

    if (targetTopic && !isValidTopic(targetTopic)) {
      return NextResponse.json(
        { error: "Invalid topic name" },
        { status: 400 },
      );
    }

    const admin = getFirebaseAdmin();

    const link = toData(data).link || "/dashboard";
    const requestUrl = new URL(req.url);
    const webLinkUrl = new URL(link, requestUrl);
    const webLink =
      requestUrl.protocol === "https:" &&
      webLinkUrl.origin === requestUrl.origin
        ? webLinkUrl.href
        : undefined;
    const notification = {
      title: title || "MayouDashboard",
      body: body || "",
    };

    // The same payload works for Web, Android and iOS FCM tokens.
    const base = {
      notification,
      data: toData(data),
      webpush: {
        notification: {
          icon: "/icon-192.png",
          badge: "/icon-192.png",
        },
        ...(webLink ? { fcmOptions: { link: webLink } } : {}),
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
    };

    // Topic delivery needs no database and reaches every subscribed device.
    if (targets.length === 0 && targetTopic) {
      const response = await admin
        .messaging()
        .send({ ...base, topic: targetTopic });
      return NextResponse.json(
        { success: true, topic: targetTopic, response },
        { status: 200 },
      );
    }

    if (targets.length === 1) {
      // Keep the device test intentionally minimal to match Firebase Console:
      // a common notification plus custom data. Set high Web Push urgency so
      // browsers promptly wake the service worker for this diagnostic send.
      const diagnosticId = toData(data).diagnosticId;
      const webpush = {
        notification: {
          title: notification.title,
          body: notification.body,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          ...(diagnosticId ? { tag: diagnosticId } : {}),
        },
        headers: { Urgency: "high" as const },
        ...(webLink ? { fcmOptions: { link: webLink } } : {}),
      };
      const response = await admin.messaging().send({
        token: targets[0],
        notification,
        data: toData(data),
        webpush,
      });
      console.info("[FCM] Direct device send accepted", {
        diagnosticId: diagnosticId || null,
        projectId: process.env.FIREBASE_PROJECT_ID,
        tokenPrefix: targets[0].slice(0, 12),
        messageId: response,
      });
      return NextResponse.json(
        {
          success: true,
          response,
          target: "device",
          projectId: process.env.FIREBASE_PROJECT_ID,
          payloadType: "notification+data",
        },
        { status: 200 },
      );
    }

    const response = await admin.messaging().sendEachForMulticast({
      ...base,
      tokens: targets,
    });
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
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : undefined;
    console.error("Error sending notification:", error);
    const status =
      code === "messaging/registration-token-not-registered" ||
      code === "messaging/invalid-registration-token"
        ? 410
        : 500;
    return NextResponse.json({ error: message, code }, { status });
  }
}
