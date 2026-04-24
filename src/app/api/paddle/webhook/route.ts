import { BillingSubscriptionStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getPaddleRuntimeConfig } from "@/lib/env";
import {
  parsePaddleSubscriptionStatus,
  readPaddleCustomDataUserId,
  verifyPaddleWebhookSignature,
} from "@/lib/paddle";

export const dynamic = "force-dynamic";

const handledSubscriptionEventTypes = [
  "subscription.activated",
  "subscription.canceled",
  "subscription.created",
  "subscription.past_due",
  "subscription.paused",
  "subscription.resumed",
  "subscription.trialing",
  "subscription.updated",
] as const;

const subscriptionEventSchema = z.object({
  occurred_at: z.string().datetime(),
  event_id: z.string().min(1),
  event_type: z.enum(handledSubscriptionEventTypes),
  data: z.object({
    canceled_at: z.string().datetime().nullable(),
    current_billing_period: z
      .object({
        ends_at: z.string().datetime(),
        starts_at: z.string().datetime(),
      })
      .nullable(),
    scheduled_change: z
      .object({
        effective_at: z.string().datetime(),
      })
      .nullable()
      .optional(),
    custom_data: z.record(z.string(), z.unknown()).nullable().optional(),
    customer_id: z.string().min(1),
    id: z.string().min(1),
    items: z
      .array(
        z.object({
          price: z
            .object({
              id: z.string().min(1).optional(),
            })
            .optional(),
        }),
      )
      .optional(),
    next_billed_at: z.string().datetime().nullable(),
    started_at: z.string().datetime().nullable(),
    status: z.string().min(1),
  }),
});

const webhookEnvelopeSchema = z.object({
  event_type: z.string().min(1),
});

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("paddle-signature");
  const { webhookSecretKey } = getPaddleRuntimeConfig();

  if (!verifyPaddleWebhookSignature(rawBody, signature, webhookSecretKey)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  let payload: unknown;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsedEnvelope = webhookEnvelopeSchema.safeParse(payload);

  if (!parsedEnvelope.success) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  if (
    !handledSubscriptionEventTypes.includes(
      parsedEnvelope.data.event_type as (typeof handledSubscriptionEventTypes)[number],
    )
  ) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const parsedEvent = subscriptionEventSchema.safeParse(payload);

  if (!parsedEvent.success) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const event = parsedEvent.data;
  const status = parsePaddleSubscriptionStatus(event.data.status);

  if (!status) {
    console.info("[paddle-webhook] ignored unsupported status", {
      eventType: event.event_type,
      rawStatus: event.data.status,
      subscriptionId: event.data.id,
    });
    return NextResponse.json({ ok: true, ignored: true });
  }

  const existingBySubscription = await prisma.billingSubscription.findUnique({
    select: {
      id: true,
      lastEventOccurredAt: true,
      trialEndsAt: true,
      userId: true,
    },
    where: { paddleSubscriptionId: event.data.id },
  });
  const customDataUserId = readPaddleCustomDataUserId(event.data.custom_data);
  const userId = customDataUserId ?? existingBySubscription?.userId ?? null;

  if (!userId) {
    console.info("[paddle-webhook] ignored because no app user id was available", {
      customData: event.data.custom_data,
      eventType: event.event_type,
      subscriptionId: event.data.id,
    });
    return NextResponse.json({ ok: true, ignored: true });
  }

  const existingByUser =
    existingBySubscription?.userId === userId
      ? existingBySubscription
      : await prisma.billingSubscription.findUnique({
          select: {
            id: true,
            lastEventOccurredAt: true,
            trialEndsAt: true,
            userId: true,
          },
          where: { userId },
        });

  const currentRecord = existingBySubscription ?? existingByUser;
  const occurredAt = new Date(event.occurred_at);

  if (
    currentRecord?.lastEventOccurredAt &&
    currentRecord.lastEventOccurredAt.getTime() > occurredAt.getTime()
  ) {
    return NextResponse.json({ ok: true, ignored: true, stale: true });
  }

  const updateData = {
    canceledAt: event.data.canceled_at ? new Date(event.data.canceled_at) : null,
    currentPeriodEndsAt: event.data.current_billing_period
      ? new Date(event.data.current_billing_period.ends_at)
      : null,
    currentPeriodStartsAt: event.data.current_billing_period
      ? new Date(event.data.current_billing_period.starts_at)
      : null,
    lastEventOccurredAt: occurredAt,
    paddleCustomerId: event.data.customer_id,
    paddleSubscriptionId: event.data.id,
    priceId: event.data.items?.[0]?.price?.id ?? null,
    scheduledCancellationAt: event.data.scheduled_change?.effective_at
      ? new Date(event.data.scheduled_change.effective_at)
      : null,
    startedAt: event.data.started_at ? new Date(event.data.started_at) : null,
    status,
    trialEndsAt:
      status === BillingSubscriptionStatus.TRIALING && event.data.next_billed_at
        ? new Date(event.data.next_billed_at)
        : currentRecord?.trialEndsAt ?? null,
  };

  if (currentRecord) {
    await prisma.billingSubscription.update({
      data: updateData,
      where: { id: currentRecord.id },
    });
  } else {
    await prisma.billingSubscription.create({
      data: {
        ...updateData,
        userId,
      },
    });
  }

  console.info("[paddle-webhook] upserted subscription", {
    eventType: event.event_type,
    status,
    subscriptionId: event.data.id,
    userId,
  });

  return NextResponse.json({ ok: true });
}
