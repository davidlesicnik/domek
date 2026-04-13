import type { CalendarEventCategory, Prisma } from "@prisma/client";
import { z } from "zod";

import { auth } from "@/auth";
import {
  calendarCategoryOptions,
  type CalendarCategory,
  type CalendarEventInput,
  type CalendarEventView,
} from "@/lib/calendar-types";
import { prisma } from "@/lib/db";
import { hasAuthRuntimeConfig } from "@/lib/env";

type CalendarScope = Readonly<{
  create: Pick<Prisma.CalendarEventUncheckedCreateInput, "createdByUserId" | "householdId">;
  where: Prisma.CalendarEventWhereInput;
}>;

const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const dbCategoryToCalendar: Record<CalendarEventCategory, CalendarCategory> = {
  CARE: "care",
  GUESTS: "guests",
  HOME: "home",
  SCHOOL: "school",
};

const calendarCategoryToDb: Record<CalendarCategory, CalendarEventCategory> = {
  care: "CARE",
  guests: "GUESTS",
  home: "HOME",
  school: "SCHOOL",
};

const calendarEventSelect = {
  allDay: true,
  category: true,
  dateKey: true,
  id: true,
  name: true,
  people: true,
  time: true,
} satisfies Prisma.CalendarEventSelect;

const calendarEventInputSchema = z
  .object({
    category: z.enum(calendarCategoryOptions),
    dateKey: z.string().regex(dateKeyPattern).refine(isValidDateKey, "Use a valid date."),
    name: z.string().trim().min(1).max(200),
    people: z
      .array(z.string().trim().min(1).max(80))
      .max(30)
      .transform((people) => Array.from(new Set(people))),
    time: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("all-day") }),
      z.object({ kind: z.literal("time"), value: z.string().regex(timePattern) }),
    ]),
  })
  .strict();

function isValidDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.toISOString().slice(0, 10) === dateKey;
}

function toCalendarEventView(
  calendarEvent: Prisma.CalendarEventGetPayload<{ select: typeof calendarEventSelect }>,
): CalendarEventView {
  return {
    category: dbCategoryToCalendar[calendarEvent.category],
    dateKey: calendarEvent.dateKey,
    id: calendarEvent.id,
    name: calendarEvent.name,
    people: calendarEvent.people,
    time: calendarEvent.allDay
      ? { kind: "all-day" }
      : { kind: "time", value: calendarEvent.time ?? "00:00" },
  };
}

export function parseCalendarEventInput(input: unknown): CalendarEventInput {
  return calendarEventInputSchema.parse(input);
}

export async function getCurrentCalendarScope(): Promise<CalendarScope | null> {
  if (!hasAuthRuntimeConfig()) {
    return {
      create: {},
      where: {
        createdByUserId: null,
        householdId: null,
      },
    };
  }

  const session = await auth();

  if (!session?.user?.email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    select: {
      id: true,
      memberships: {
        orderBy: {
          createdAt: "asc",
        },
        select: {
          householdId: true,
        },
        take: 1,
      },
    },
    where: {
      email: session.user.email,
    },
  });

  if (!user) {
    return null;
  }

  const householdId = user.memberships[0]?.householdId;

  if (householdId) {
    return {
      create: {
        createdByUserId: user.id,
        householdId,
      },
      where: {
        householdId,
      },
    };
  }

  return {
    create: {
      createdByUserId: user.id,
    },
    where: {
      createdByUserId: user.id,
      householdId: null,
    },
  };
}

export async function listCalendarEvents() {
  const scope = await getCurrentCalendarScope();

  if (!scope) {
    return [];
  }

  const calendarEvents = await prisma.calendarEvent.findMany({
    orderBy: [{ dateKey: "asc" }, { allDay: "desc" }, { time: "asc" }, { createdAt: "asc" }],
    select: calendarEventSelect,
    where: scope.where,
  });

  return calendarEvents.map(toCalendarEventView);
}

export async function createCalendarEvent(input: CalendarEventInput, scope: CalendarScope) {
  const calendarEvent = await prisma.calendarEvent.create({
    data: {
      ...scope.create,
      allDay: input.time.kind === "all-day",
      category: calendarCategoryToDb[input.category],
      dateKey: input.dateKey,
      name: input.name,
      people: input.people,
      time: input.time.kind === "time" ? input.time.value : null,
    },
    select: calendarEventSelect,
  });

  return toCalendarEventView(calendarEvent);
}
