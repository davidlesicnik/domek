import webpush from "web-push";

export type PushSubscriptionRecord = {
  endpoint: string;
  p256dh: string;
  auth: string;
  id: string;
};

export type NotificationPayload = {
  title: string;
  body: string;
  url: string;
};

export async function sendPushToSubscription(
  subscription: PushSubscriptionRecord,
  payload: NotificationPayload,
): Promise<"ok" | "dead" | "error"> {
  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
      JSON.stringify(payload),
    );
    return "ok";
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) {
      return "dead";
    }
    return "error";
  }
}
