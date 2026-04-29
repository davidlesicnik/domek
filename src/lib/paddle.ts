import { BillingSubscriptionStatus } from "@prisma/client";
import { createHmac, timingSafeEqual } from "node:crypto";

export const PADDLE_WEBHOOK_SIGNATURE_TOLERANCE_MS = 5 * 60 * 1000;

export type PaddleSubscriptionEvent = Readonly<{
  occurred_at: string;
  event_id: string;
  event_type: string;
  data: {
    id: string;
    customer_id: string;
    status: string;
    started_at: string | null;
    next_billed_at: string | null;
    canceled_at: string | null;
    current_billing_period: {
      starts_at: string;
      ends_at: string;
    } | null;
    items?: Array<{
      price?: {
        id?: string;
      };
    }>;
    custom_data?: Record<string, unknown> | null;
  };
}>;

type PaddleSignatureParts = Readonly<{
  signature: string;
  timestamp: string;
}>;

function parseSignatureHeader(headerValue: string): PaddleSignatureParts | null {
  const parts = headerValue.split(";").map((part) => part.trim()).filter(Boolean);
  let timestamp: string | null = null;
  let signature: string | null = null;

  for (const part of parts) {
    const [key, ...rest] = part.split("=");

    if (!key || rest.length === 0) {
      continue;
    }

    const value = rest.join("=").trim();

    if (key === "ts") {
      timestamp = value;
    }

    if (key === "h1" || key === "v1") {
      signature = value;
    }
  }

  if (!timestamp || !signature) {
    return null;
  }

  return { signature, timestamp };
}

export function verifyPaddleWebhookSignature(
  body: string,
  headerValue: string | null,
  endpointSecretKey: string,
  options: {
    nowMs?: number;
    toleranceMs?: number;
  } = {},
): boolean {
  if (!headerValue) {
    return false;
  }

  const parsed = parseSignatureHeader(headerValue);

  if (!parsed) {
    return false;
  }

  const timestampMs = Number(parsed.timestamp) * 1000;

  if (!Number.isFinite(timestampMs)) {
    return false;
  }

  const toleranceMs = options.toleranceMs ?? PADDLE_WEBHOOK_SIGNATURE_TOLERANCE_MS;
  const nowMs = options.nowMs ?? Date.now();

  if (Math.abs(nowMs - timestampMs) > toleranceMs) {
    return false;
  }

  const expected = createHmac("sha256", endpointSecretKey)
    .update(`${parsed.timestamp}:${body}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  const providedBuffer = Buffer.from(parsed.signature, "hex");

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

export function parsePaddleSubscriptionStatus(
  status: string,
): BillingSubscriptionStatus | null {
  switch (status) {
    case "trialing":
      return BillingSubscriptionStatus.TRIALING;
    case "active":
      return BillingSubscriptionStatus.ACTIVE;
    case "past_due":
      return BillingSubscriptionStatus.PAST_DUE;
    case "paused":
      return BillingSubscriptionStatus.PAUSED;
    case "canceled":
      return BillingSubscriptionStatus.CANCELED;
    default:
      return null;
  }
}

export function getPaddleEnvironment(clientToken: string): "sandbox" | "live" {
  return clientToken.startsWith("test_") ? "sandbox" : "live";
}

export function readPaddleCustomDataUserId(
  customData: Record<string, unknown> | null | undefined,
): string | null {
  const value = customData?.appUserId;
  return typeof value === "string" && value.trim() ? value : null;
}
