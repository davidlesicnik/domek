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

type CancelSubscriptionParams = Readonly<{
  apiKey: string;
  clientToken: string;
  subscriptionId: string;
}>;

type PaddleCancelSubscriptionPayload = {
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
} | null;

function parseOptionalDate(value: string | null | undefined): Date | null {
  return value ? new Date(value) : null;
}

function subscriptionPeriodEnd(payload: PaddleCancelSubscriptionPayload): Date | null {
  return parseOptionalDate(payload?.data?.current_billing_period?.ends_at);
}

function subscriptionCanceledAt(payload: PaddleCancelSubscriptionPayload): Date | null {
  return parseOptionalDate(payload?.data?.canceled_at);
}

function scheduledCancellationAt(payload: PaddleCancelSubscriptionPayload): Date | null {
  return parseOptionalDate(payload?.data?.scheduled_change?.effective_at);
}

async function sendCancelSubscriptionRequest(
  { apiKey, clientToken, subscriptionId }: CancelSubscriptionParams,
  effectiveFrom: "immediately" | "next_billing_period",
): Promise<PaddleCancelSubscriptionPayload> {
  const response = await fetch(
    `${getPaddleApiBaseUrl(clientToken)}/subscriptions/${subscriptionId}/cancel`,
    {
      body: JSON.stringify({ effective_from: effectiveFrom }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );

  const payload = (await response.json().catch(() => null)) as PaddleCancelSubscriptionPayload;

  if (!response.ok) {
    throw new PaddleSubscriptionCancelError(
      payload?.error?.detail ?? "Paddle rejected the subscription cancellation request.",
    );
  }

  return payload;
}

export async function cancelPaddleSubscriptionImmediately(
  params: CancelSubscriptionParams,
): Promise<CancelSubscriptionResult> {
  const payload = await sendCancelSubscriptionRequest(params, "immediately");

  const status = payload?.data?.status;

  if (status !== "canceled") {
    throw new PaddleSubscriptionCancelError(
      "Paddle did not confirm an immediate cancellation for this subscription.",
    );
  }

  return {
    canceledAt: subscriptionCanceledAt(payload),
    currentPeriodEndsAt: subscriptionPeriodEnd(payload),
    scheduledCancellationAt: null,
    status: BillingSubscriptionStatus.CANCELED,
  };
}

export async function cancelPaddleSubscriptionAtPeriodEnd(
  params: CancelSubscriptionParams,
): Promise<CancelSubscriptionResult> {
  const payload = await sendCancelSubscriptionRequest(params, "next_billing_period");

  const status = payload?.data?.status;

  if (status !== "active" && status !== "trialing") {
    throw new PaddleSubscriptionCancelError(
      "Paddle did not keep this subscription active until the end of the billing period.",
    );
  }

  const scheduledAt = scheduledCancellationAt(payload);

  if (!scheduledAt) {
    throw new PaddleSubscriptionCancelError(
      "Paddle did not return the scheduled cancellation date for this subscription.",
    );
  }

  return {
    canceledAt: subscriptionCanceledAt(payload),
    currentPeriodEndsAt: subscriptionPeriodEnd(payload),
    scheduledCancellationAt: scheduledAt,
    status:
      status === "trialing"
        ? BillingSubscriptionStatus.TRIALING
        : BillingSubscriptionStatus.ACTIVE,
  };
}
