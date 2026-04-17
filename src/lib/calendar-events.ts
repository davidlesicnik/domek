import type { CalendarEventCategory, Prisma } from "@prisma/client";
import { z } from "zod";

import { getCurrentAppSession } from "@/lib/authz";
import {
  calendarCategoryOptions,
  type CalendarCategory,
  type CalendarEventInput,
  type CalendarEventView,
  type CalendarMemberOption,
} from "@/lib/calendar-types";
import { prisma } from "@/lib/db";
import { getFirstHouseholdMembership } from "@/lib/users";

type CalendarScope = Readonly<{
  create: Pick<Prisma.CalendarEventUncheckedCreateInput, "createdByUserId" | "householdId">;
  householdId: string;
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
  householdMemberIds: true,
  id: true,
  name: true,
  time: true,
} satisfies Prisma.CalendarEventSelect;

const calendarEventInputSchema = z
  .object({
    category: z.enum(calendarCategoryOptions),
    dateKey: z.string().regex(dateKeyPattern).refine(isValidDateKey, "Use a valid date."),
    householdMemberIds: z
      .array(z.string().cuid())
      .max(30)
      .transform((memberIds) => Array.from(new Set(memberIds))),
    name: z.string().trim().min(1).max(200),
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
    householdMemberIds: calendarEvent.householdMemberIds,
    id: calendarEvent.id,
    name: calendarEvent.name,
    time: calendarEvent.allDay
      ? { kind: "all-day" }
      : { kind: "time", value: calendarEvent.time ?? "00:00" },
  };
}

export function parseCalendarEventInput(input: unknown): CalendarEventInput {
  return calendarEventInputSchema.parse(input);
}

export async function getCurrentCalendarScope(): Promise<CalendarScope | null> {
  const session = await getCurrentAppSession();

  if (!session) {
    return null;
  }

  const membership = await getFirstHouseholdMembership(session.user.id);
  const householdId = membership?.householdId;

  if (!householdId) {
    return null;
  }

  return {
    create: {
      createdByUserId: session.user.id,
      householdId,
    },
    householdId,
    where: {
      householdId,
    },
  };
}

export async function listCalendarEventMembers(): Promise<CalendarMemberOption[]> {
  const scope = await getCurrentCalendarScope();

  if (!scope) {
    return [];
  }

  const members = await prisma.householdMember.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, color: true, user: { select: { email: true, name: true } } },
    where: { householdId: scope.householdId },
  });

  return members.map((member) => ({
    color: member.color,
    email: member.user.email,
    id: member.id,
    name: member.user.name,
  }));
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
  const members =
    input.householdMemberIds.length > 0
      ? await prisma.householdMember.findMany({
          select: { id: true },
          where: { householdId: scope.householdId, id: { in: input.householdMemberIds } },
        })
      : [];

  if (members.length !== input.householdMemberIds.length) {
    return null;
  }

  const calendarEvent = await prisma.calendarEvent.create({
    data: {
      ...scope.create,
      allDay: input.time.kind === "all-day",
      category: calendarCategoryToDb[input.category],
      dateKey: input.dateKey,
      householdMemberIds: input.householdMemberIds,
      name: input.name,
      time: input.time.kind === "time" ? input.time.value : null,
    },
    select: calendarEventSelect,
  });

  return toCalendarEventView(calendarEvent);
}

export async function updateCalendarEvent(
  id: string,
  input: CalendarEventInput,
  scope: CalendarScope,
): Promise<CalendarEventView | null> {
  const existing = await prisma.calendarEvent.findFirst({
    select: { id: true },
    where: { id, ...scope.where },
  });

  if (!existing) {
    return null;
  }

  const members =
    input.householdMemberIds.length > 0
      ? await prisma.householdMember.findMany({
          select: { id: true },
          where: { householdId: scope.householdId, id: { in: input.householdMemberIds } },
        })
      : [];

  if (members.length !== input.householdMemberIds.length) {
    return null;
  }

  const calendarEvent = await prisma.calendarEvent.update({
    data: {
      allDay: input.time.kind === "all-day",
      category: calendarCategoryToDb[input.category],
      dateKey: input.dateKey,
      householdMemberIds: input.householdMemberIds,
      name: input.name,
      time: input.time.kind === "time" ? input.time.value : null,
    },
    select: calendarEventSelect,
    where: { id },
  });

  return toCalendarEventView(calendarEvent);
}

export async function deleteCalendarEvent(id: string, scope: CalendarScope): Promise<boolean> {
  const existing = await prisma.calendarEvent.findFirst({
    select: { id: true },
    where: { id, ...scope.where },
  });

  if (!existing) {
    return false;
  }

  await prisma.calendarEvent.delete({ where: { id } });

  return true;
}
