import { BillingSubscriptionStatus } from "@prisma/client";

import { getPaddleEnvironment } from "@/lib/paddle";

export class PaddleSubscriptionCancelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaddleSubscriptionCancelError";
  }
}

export function getPaddleApiBaseUrl(clientToken: string): string {
  return getPaddleEnvironment(clientToken) === "sandbox"
    ? "https://sandbox-api.paddle.com"
    : "https://api.paddle.com";
}

type CancelSubscriptionResult = Readonly<{
  canceledAt: Date | null;
  currentPeriodEndsAt: Date | null;
  scheduledCancellationAt: Date | null;
  status: BillingSubscriptionStatus;
}>;

export async function cancelPaddleSubscriptionImmediately({
  apiKey,
  clientToken,
  subscriptionId,
}: {
  apiKey: string;
  clientToken: string;
  subscriptionId: string;
}): Promise<CancelSubscriptionResult> {
  const response = await fetch(
    `${getPaddleApiBaseUrl(clientToken)}/subscriptions/${subscriptionId}/cancel`,
    {
      body: JSON.stringify({ effective_from: "immediately" }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | {
        data?: {
          canceled_at?: string | null;
          current_billing_period?: {
            ends_at?: string | null;
          } | null;
          status?: string;
        };
        error?: {
          detail?: string;
        };
      }
    | null;

  if (!response.ok) {
    throw new PaddleSubscriptionCancelError(
      payload?.error?.detail ?? "Paddle rejected the subscription cancellation request.",
    );
  }

  const status = payload?.data?.status;

  if (status !== "canceled") {
    throw new PaddleSubscriptionCancelError(
      "Paddle did not confirm an immediate cancellation for this subscription.",
    );
  }

  return {
    canceledAt: payload?.data?.canceled_at ? new Date(payload.data.canceled_at) : null,
    currentPeriodEndsAt: payload?.data?.current_billing_period?.ends_at
      ? new Date(payload.data.current_billing_period.ends_at)
      : null,
    scheduledCancellationAt: null,
    status: BillingSubscriptionStatus.CANCELED,
  };
}

export async function cancelPaddleSubscriptionAtPeriodEnd({
  apiKey,
  clientToken,
  subscriptionId,
}: {
  apiKey: string;
  clientToken: string;
  subscriptionId: string;
}): Promise<CancelSubscriptionResult> {
  const response = await fetch(
    `${getPaddleApiBaseUrl(clientToken)}/subscriptions/${subscriptionId}/cancel`,
    {
      body: JSON.stringify({ effective_from: "next_billing_period" }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | {
        data?: {
          canceled_at?: string | null;
          current_billing_period?: {
            ends_at?: string | null;
          } | null;
          scheduled_change?: {
            effective_at?: string | null;
          } | null;
          status?: string;
        };
        error?: {
          detail?: string;
        };
      }
    | null;

  if (!response.ok) {
    throw new PaddleSubscriptionCancelError(
      payload?.error?.detail ?? "Paddle rejected the subscription cancellation request.",
    );
  }

  const status = payload?.data?.status;

  if (status !== "active" && status !== "trialing") {
    throw new PaddleSubscriptionCancelError(
      "Paddle did not keep this subscription active until the end of the billing period.",
    );
  }

  const scheduledCancellationAt = payload?.data?.scheduled_change?.effective_at
    ? new Date(payload.data.scheduled_change.effective_at)
    : null;

  if (!scheduledCancellationAt) {
    throw new PaddleSubscriptionCancelError(
      "Paddle did not return the scheduled cancellation date for this subscription.",
    );
  }

  return {
    canceledAt: payload?.data?.canceled_at ? new Date(payload.data.canceled_at) : null,
    currentPeriodEndsAt: payload?.data?.current_billing_period?.ends_at
      ? new Date(payload.data.current_billing_period.ends_at)
      : null,
    scheduledCancellationAt,
    status:
      status === "trialing"
        ? BillingSubscriptionStatus.TRIALING
        : BillingSubscriptionStatus.ACTIVE,
  };
}
