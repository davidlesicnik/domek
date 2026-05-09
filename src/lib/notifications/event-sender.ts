import webpush from "web-push";
import { randomUUID } from "crypto";

import { prisma } from "@/lib/db";
import { getOptionalVapidConfig } from "@/lib/env";
import { normalizeLocale, notificationCopy, type SendResult } from "@/lib/notifications/sender";

type NotificationPayload = {
  title: string;
  body: string;
  url: string;
};

type EventRow = {
  id: string;
  householdId: string;
  name: string;
  dateKey: string;
  time: string | null;
  allDay: boolean;
};

type EventNotificationLogRow = {
  eventId: string;
  offsetMinutes: number;
  scheduledForDate: Date;
};

const SUPPORTED_OFFSETS = [10, 60, 1440] as const;
const WINDOW_BEFORE_MS = 4 * 60 * 1000;
const WINDOW_AFTER_MS = 60 * 1000;

function parseUtcDateTime(dateKey: string, time: string): Date | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) {
    return null;
  }

  const [year, month, day] = dateKey.split("-").map((part) => Number(part));
  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
}

function parseUtcDateAtHour(dateKey: string, hour: number): Date | null {
  const [year, month, day] = dateKey.split("-").map((part) => Number(part));
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  return new Date(Date.UTC(year, month - 1, day, hour, 0, 0, 0));
}

function toScheduleDateUtc(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 0, 0, 0, 0));
}

function getEventFireTime(event: EventRow, offsetMinutes: number): Date | null {
  if (event.allDay) {
    if (offsetMinutes !== 1440) {
      return null;
    }

    const eventDayAtEightUtc = parseUtcDateAtHour(event.dateKey, 8);
    if (!eventDayAtEightUtc) {
      return null;
    }

    return new Date(eventDayAtEightUtc.getTime() - 24 * 60 * 60 * 1000);
  }

  if (!event.time) {
    return null;
  }

  const eventDateTime = parseUtcDateTime(event.dateKey, event.time);
  if (!eventDateTime) {
    return null;
  }

  return new Date(eventDateTime.getTime() - offsetMinutes * 60 * 1000);
}

function inWindow(fireTime: Date, windowStart: Date, windowEnd: Date): boolean {
  return fireTime.getTime() >= windowStart.getTime() && fireTime.getTime() <= windowEnd.getTime();
}

function bodyForOffset(locale: "en" | "sl", offsetMinutes: number): string {
  const copy = notificationCopy[locale];

  if (offsetMinutes === 10) return copy.inTenMinutes;
  if (offsetMinutes === 60) return copy.inOneHour;
  return copy.tomorrow;
}

async function sendOne(
  subscription: { endpoint: string; p256dh: string; auth: string; id: string },
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

export async function sendEventNotifications(): Promise<SendResult> {
  const vapid = getOptionalVapidConfig();
  if (!vapid) {
    return { sent: 0, errors: 0 };
  }

  webpush.setVapidDetails(vapid.mailto, vapid.publicKey, vapid.privateKey);

  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_BEFORE_MS);
  const windowEnd = new Date(now.getTime() + WINDOW_AFTER_MS);

  const householdsByEvent = new Map<string, string>();
  const namesByEvent = new Map<string, string>();
  const offsetsByEvent = new Map<string, number>();
  const scheduledForByEvent = new Map<string, Date>();

  for (const offset of SUPPORTED_OFFSETS) {
    const rows = await prisma.$queryRaw<EventRow[]>`
      SELECT id, "householdId", name, "dateKey", time, "allDay"
      FROM "CalendarEvent"
      WHERE "householdId" IS NOT NULL
        AND "notificationOffsetMinutes" = ${offset}
    `;

    for (const event of rows) {
      const fireTime = getEventFireTime(event, offset);
      if (!fireTime || !inWindow(fireTime, windowStart, windowEnd)) {
        continue;
      }

      householdsByEvent.set(event.id, event.householdId);
      namesByEvent.set(event.id, event.name);
      offsetsByEvent.set(event.id, offset);
      scheduledForByEvent.set(event.id, toScheduleDateUtc(fireTime));
    }
  }

  const eventIds = [...householdsByEvent.keys()];
  if (eventIds.length === 0) {
    return { sent: 0, errors: 0 };
  }

  const existingLogs = await prisma.$queryRaw<EventNotificationLogRow[]>`
    SELECT "eventId", "offsetMinutes", "scheduledForDate"
    FROM "EventNotificationLog"
    WHERE "eventId" = ANY(${eventIds}::text[])
  `;

  const loggedKeys = new Set(
    existingLogs.map(
      (log) => `${log.eventId}|${log.offsetMinutes}|${toScheduleDateUtc(log.scheduledForDate).toISOString()}`,
    ),
  );

  const pending = eventIds.filter((eventId) => {
    const scheduledFor = scheduledForByEvent.get(eventId);
    if (!scheduledFor) {
      return false;
    }
    const offset = offsetsByEvent.get(eventId);
    if (offset === undefined) {
      return false;
    }
    return !loggedKeys.has(`${eventId}|${offset}|${scheduledFor.toISOString()}`);
  });

  if (pending.length === 0) {
    return { sent: 0, errors: 0 };
  }

  const householdIds = [...new Set(pending.map((eventId) => householdsByEvent.get(eventId)).filter(Boolean))] as string[];
  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      user: {
        memberships: {
          some: {
            householdId: { in: householdIds },
          },
        },
      },
    },
    include: {
      user: {
        select: {
          memberships: {
            select: { householdId: true },
          },
        },
      },
    },
  });

  const subscriptionsByHousehold = new Map<string, Map<string, (typeof subscriptions)[number]>>();
  for (const subscription of subscriptions) {
    for (const membership of subscription.user.memberships) {
      if (!householdIds.includes(membership.householdId)) {
        continue;
      }
      const current = subscriptionsByHousehold.get(membership.householdId) ?? new Map<string, (typeof subscriptions)[number]>();
      current.set(subscription.id, subscription);
      subscriptionsByHousehold.set(membership.householdId, current);
    }
  }

  let sent = 0;
  let errors = 0;
  const deadIds = new Set<string>();

  for (const eventId of pending) {
    const householdId = householdsByEvent.get(eventId);
    const eventName = namesByEvent.get(eventId);
    const offset = offsetsByEvent.get(eventId);
    const scheduledForDate = scheduledForByEvent.get(eventId);

    if (!householdId || !eventName || offset === undefined || !scheduledForDate) {
      continue;
    }

    const eventSubscriptions = [...(subscriptionsByHousehold.get(householdId)?.values() ?? [])];
    if (eventSubscriptions.length === 0) {
      continue;
    }

    let anySuccess = false;

    for (const sub of eventSubscriptions) {
      const locale = normalizeLocale(sub.locale);
      const result = await sendOne(sub, {
        title: eventName,
        body: bodyForOffset(locale, offset),
        url: "/app/calendar",
      });

      if (result === "ok") {
        sent++;
        anySuccess = true;
      } else if (result === "dead") {
        deadIds.add(sub.id);
      } else {
        errors++;
      }
    }

    if (anySuccess) {
      await prisma.$executeRaw`
        INSERT INTO "EventNotificationLog" (id, "eventId", "offsetMinutes", "scheduledForDate", "sentAt")
        VALUES (${randomUUID()}, ${eventId}, ${offset}, ${scheduledForDate}, NOW())
      `;
    }
  }

  if (deadIds.size > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: [...deadIds] } } });
  }

  return { sent, errors };
}
