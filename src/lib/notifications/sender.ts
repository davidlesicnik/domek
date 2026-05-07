import webpush from "web-push";

import { prisma } from "@/lib/db";
import { getOptionalVapidConfig } from "@/lib/env";

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

type NotificationPayload = {
  title: string;
  body: string;
  url: string;
};

export type SendResult = {
  sent: number;
  errors: number;
};

function getChoreNextDueDate(chore: {
  startsAt: Date;
  recurrenceType: string;
  intervalValue: number;
  intervalUnit: string;
  weeklyDays: number[];
  completions: { completedAt: Date }[];
}): Date {
  const lastCompletion = chore.completions[0]?.completedAt ?? null;

  // No completions yet — chore is due on its start date, not start + interval
  if (!lastCompletion) {
    return startOfDay(chore.startsAt);
  }

  const base = startOfDay(lastCompletion);

  switch (chore.recurrenceType) {
    case "DAILY":
      return addDays(base, 1);
    case "WEEKLY": {
      for (let offset = 1; offset <= 7; offset++) {
        const candidate = addDays(base, offset);
        if (chore.weeklyDays.includes(candidate.getDay())) return candidate;
      }
      return addDays(base, 7);
    }
    case "MONTHLY": {
      const d = new Date(base);
      d.setMonth(d.getMonth() + 1);
      return d;
    }
    case "CUSTOM":
    default:
      if (chore.intervalUnit === "MONTHS") {
        const d = new Date(base);
        d.setMonth(d.getMonth() + chore.intervalValue);
        return d;
      }
      return addDays(
        base,
        chore.intervalUnit === "WEEKS" ? chore.intervalValue * 7 : chore.intervalValue,
      );
  }
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
    if (status === 404 || status === 410) return "dead";
    return "error";
  }
}

export async function sendDailyNotifications(): Promise<SendResult> {
  const vapid = getOptionalVapidConfig();
  if (!vapid) {
    return { sent: 0, errors: 0 };
  }

  webpush.setVapidDetails(vapid.mailto, vapid.publicKey, vapid.privateKey);

  const now = new Date();
  const tomorrow = startOfDay(addDays(now, 1));
  const tomorrowKey = formatDateKey(tomorrow);
  const todayKey = formatDateKey(startOfDay(now));
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const subscriptions = await prisma.pushSubscription.findMany({
    include: {
      user: {
        select: {
          id: true,
          memberships: {
            select: { householdId: true },
            take: 1,
          },
        },
      },
    },
  });

  let sent = 0;
  let errors = 0;
  const deadIds: string[] = [];

  for (const sub of subscriptions) {
    const householdId = sub.user.memberships[0]?.householdId;
    if (!householdId) continue;

    const payloads: NotificationPayload[] = [];

    const [calendarEvents, todoItems, chores] = await Promise.all([
      prisma.calendarEvent.findMany({
        where: {
          householdId,
          dateKey: { in: [tomorrowKey, todayKey] },
        },
        select: { id: true, name: true, dateKey: true, time: true, allDay: true },
      }),
      prisma.todoItem.findMany({
        where: {
          done: false,
          dueDate: { lte: in24h },
          list: { householdId },
        },
        select: { id: true, text: true, dueDate: true },
      }),
      prisma.chore.findMany({
        where: { householdId },
        select: {
          id: true,
          name: true,
          recurrenceType: true,
          startsAt: true,
          intervalValue: true,
          intervalUnit: true,
          weeklyDays: true,
          completions: {
            orderBy: { completedAt: "desc" },
            select: { completedAt: true },
            take: 1,
          },
        },
      }),
    ]);

    for (const event of calendarEvents) {
      if (event.dateKey === tomorrowKey) {
        payloads.push({
          title: "Tomorrow: " + event.name,
          body: event.allDay ? "All day" : (event.time ?? ""),
          url: "/app/calendar",
        });
      } else if (event.dateKey === todayKey && !event.allDay && event.time) {
        payloads.push({
          title: "Today: " + event.name,
          body: event.time,
          url: "/app/calendar",
        });
      }
    }

    for (const item of todoItems) {
      payloads.push({
        title: "Todo due: " + item.text.slice(0, 80),
        body: item.dueDate ? formatDate(item.dueDate) : "Due now",
        url: "/app/todos",
      });
    }

    for (const chore of chores) {
      const nextDue = getChoreNextDueDate(chore);
      if (nextDue <= in24h) {
        payloads.push({
          title: "Chore due: " + chore.name,
          body: formatDate(nextDue),
          url: "/app/chores",
        });
      }
    }

    if (payloads.length === 0) continue;

    const summary: NotificationPayload =
      payloads.length === 1
        ? payloads[0]
        : { title: `${payloads.length} reminders for today`, body: payloads.map((p) => p.title).join(", "), url: "/app" };

    const result = await sendOne(sub, summary);
    if (result === "ok") {
      sent++;
    } else if (result === "dead") {
      deadIds.push(sub.id);
    } else {
      errors++;
    }
  }

  if (deadIds.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: deadIds } } });
  }

  return { sent, errors };
}
