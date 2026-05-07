export type NotificationToggleState =
  | "unsupported"
  | "denied"
  | "subscribed"
  | "unsubscribed"
  | "loading";

export async function resolveSubscriptionInitState(
  getSubscription: () => Promise<PushSubscription | null>,
  enableFailedMessage: string,
): Promise<{ state: NotificationToggleState; error: string | null }> {
  try {
    const sub = await getSubscription();
    return { state: sub ? "subscribed" : "unsubscribed", error: null };
  } catch {
    return { state: "unsubscribed", error: enableFailedMessage };
  }
}
