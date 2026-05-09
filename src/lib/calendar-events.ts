import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { getCurrentAppSession } from "@/lib/authz";
import type { CalendarEventInput, CalendarEventView, CalendarGroupView } from "@/lib/calendar-types";
import { prisma } from "@/lib/db";
import { EXPENSE_CATEGORY_COLOR_OPTIONS } from "@/lib/expense-colors";
import { getFirstHouseholdMembership } from "@/lib/users";

export type CalendarScope = Readonly<{
  create: Pick<Prisma.CalendarEventUncheckedCreateInput, "createdByUserId" | "householdId">;
  householdId: string;
  userId: string;
  where: Prisma.CalendarEventWhereInput;
}>;

const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const hexColorPattern = /^#[0-9A-Fa-f]{6}$/;

const calendarEventSelect = {
  allDay: true,
  dateKey: true,
  group: {
    select: {
      color: true,
      id: true,
      name: true,
    },
  },
  householdMemberIds: true,
  id: true,
  name: true,
  time: true,
} satisfies Prisma.CalendarEventSelect;

const calendarGroupSelect = {
  color: true,
  id: true,
  name: true,
} satisfies Prisma.CalendarGroupSelect;

const calendarEventInputSchema = z
  .object({
    dateKey: z.string().regex(dateKeyPattern).refine(isValidDateKey, "Use a valid date."),
    groupId: z.string().min(1),
    householdMemberIds: z
      .array(z.string().cuid())
      .max(30)
      .transform((memberIds) => Array.from(new Set(memberIds))),
    name: z.string().trim().min(1).max(200),
    notificationOffsetMinutes: z.union([z.literal(10), z.literal(60), z.literal(1440), z.null()]),
    time: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("all-day") }),
      z.object({ kind: z.literal("time"), value: z.string().regex(timePattern) }),
    ]),
  })
  .strict();

const calendarGroupInputSchema = z
  .object({
    color: z.string().regex(hexColorPattern).optional(),
    name: z.string().trim().min(1).max(60),
  })
  .strict();

const calendarGroupUpdateSchema = z
  .object({
    color: z.string().regex(hexColorPattern),
    name: z.string().trim().min(1).max(60),
  })
  .strict();

function isValidDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.toISOString().slice(0, 10) === dateKey;
}

function pickCalendarGroupColor(existingColors: string[]) {
  const normalizedColors = existingColors.map((color) => color.toLowerCase());
  const usedColors = new Set(normalizedColors);
  const unusedColor = EXPENSE_CATEGORY_COLOR_OPTIONS.find((color) => !usedColors.has(color.toLowerCase()));

  if (unusedColor) {
    return unusedColor;
  }

  const usageCounts = normalizedColors.reduce<Record<string, number>>((counts, color) => {
    counts[color] = (counts[color] ?? 0) + 1;
    return counts;
  }, {});

  return EXPENSE_CATEGORY_COLOR_OPTIONS.reduce((leastUsedColor, color) =>
    (usageCounts[color.toLowerCase()] ?? 0) < (usageCounts[leastUsedColor.toLowerCase()] ?? 0)
      ? color
      : leastUsedColor,
    EXPENSE_CATEGORY_COLOR_OPTIONS[0],
  );
}

function toCalendarEventView(
  calendarEvent: Prisma.CalendarEventGetPayload<{ select: typeof calendarEventSelect }>,
): CalendarEventView {
  return {
    dateKey: calendarEvent.dateKey,
    groupColor: calendarEvent.group?.color ?? "#8b918c",
    groupId: calendarEvent.group?.id ?? "",
    groupName: calendarEvent.group?.name ?? "",
    householdMemberIds: calendarEvent.householdMemberIds,
    id: calendarEvent.id,
    name: calendarEvent.name,
    notificationOffsetMinutes: null,
    time: calendarEvent.allDay
      ? { kind: "all-day" }
      : { kind: "time", value: calendarEvent.time ?? "00:00" },
  };
}

export function toCalendarGroupView(
  group: Prisma.CalendarGroupGetPayload<{ select: typeof calendarGroupSelect }>,
): CalendarGroupView {
  return {
    color: group.color,
    id: group.id,
    name: group.name,
  };
}

export function parseCalendarEventInput(input: unknown): CalendarEventInput {
  return calendarEventInputSchema.parse(input);
}

export function parseCalendarGroupInput(input: unknown) {
  return calendarGroupInputSchema.parse(input);
}

export function parseCalendarGroupUpdate(input: unknown) {
  return calendarGroupUpdateSchema.parse(input);
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
    userId: session.user.id,
    where: {
      householdId,
    },
  };
}

export async function listCalendarGroups(scope: CalendarScope): Promise<CalendarGroupView[]> {
  const groups = await prisma.calendarGroup.findMany({
    orderBy: { name: "asc" },
    select: calendarGroupSelect,
    where: { householdId: scope.householdId },
  });

  return groups.map(toCalendarGroupView);
}

export async function createCalendarGroup(
  name: string,
  scope: CalendarScope,
  color?: string,
): Promise<CalendarGroupView> {
  const existingGroups = await prisma.calendarGroup.findMany({
    select: { color: true },
    where: { householdId: scope.householdId },
  });

  const group = await prisma.calendarGroup.create({
    data: {
      color: color ?? pickCalendarGroupColor(existingGroups.map((existingGroup) => existingGroup.color)),
      createdByUserId: scope.userId,
      householdId: scope.householdId,
      name,
    },
    select: calendarGroupSelect,
  });

  return toCalendarGroupView(group);
}

export async function updateCalendarGroup(
  id: string,
  data: z.infer<typeof calendarGroupUpdateSchema>,
  scope: CalendarScope,
): Promise<CalendarGroupView | null> {
  const existing = await prisma.calendarGroup.findFirst({
    select: { id: true },
    where: { householdId: scope.householdId, id },
  });

  if (!existing) {
    return null;
  }

  const group = await prisma.calendarGroup.update({
    data: {
      color: data.color,
      name: data.name,
    },
    select: calendarGroupSelect,
    where: { id },
  });

  return toCalendarGroupView(group);
}

export async function createCalendarEvent(input: CalendarEventInput, scope: CalendarScope) {
  const [members, group] = await Promise.all([
    input.householdMemberIds.length > 0
      ? prisma.householdMember.findMany({
          select: { id: true },
          where: { householdId: scope.householdId, id: { in: input.householdMemberIds } },
        })
      : Promise.resolve([]),
    prisma.calendarGroup.findFirst({
      select: { id: true },
      where: { householdId: scope.householdId, id: input.groupId },
    }),
  ]);

  if (!group || members.length !== input.householdMemberIds.length) {
    return null;
  }

  const calendarEvent = await prisma.calendarEvent.create({
    data: {
      ...scope.create,
      allDay: input.time.kind === "all-day",
      dateKey: input.dateKey,
      groupId: input.groupId,
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

  const [members, group] = await Promise.all([
    input.householdMemberIds.length > 0
      ? prisma.householdMember.findMany({
          select: { id: true },
          where: { householdId: scope.householdId, id: { in: input.householdMemberIds } },
        })
      : Promise.resolve([]),
    prisma.calendarGroup.findFirst({
      select: { id: true },
      where: { householdId: scope.householdId, id: input.groupId },
    }),
  ]);

  if (!group || members.length !== input.householdMemberIds.length) {
    return null;
  }

  const calendarEvent = await prisma.calendarEvent.update({
    data: {
      allDay: input.time.kind === "all-day",
      dateKey: input.dateKey,
      groupId: input.groupId,
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
