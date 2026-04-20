import type { ChoreIntervalUnit, Prisma } from "@prisma/client";
import { z } from "zod";

import { getCurrentAppSession } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { getFirstHouseholdMembership } from "@/lib/users";

export type ChoreScope = {
  householdId: string;
  userId: string;
};

export type ChoreMemberView = {
  id: string;
  color: string;
  name: string | null;
  email: string | null;
};

export type ChoreView = {
  id: string;
  name: string;
  intervalValue: number;
  intervalUnit: ChoreIntervalUnit;
  assignedHouseholdMemberId: string;
  assignedHouseholdMemberName: string | null;
  assignedHouseholdMemberColor: string | null;
  lastCompletedAt: string | null;
  nextDueAt: string;
  createdAt: string;
  isOverdue: boolean;
};

const INTERVAL_UNIT_IN_DAYS: Record<Exclude<ChoreIntervalUnit, "MONTHS">, number> = {
  DAYS: 1,
  WEEKS: 7,
};

const createChoreInputSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    assignedHouseholdMemberId: z.string().cuid(),
    intervalValue: z.number().int().min(1).max(999),
    intervalUnit: z.enum(["DAYS", "WEEKS", "MONTHS"]),
  })
  .strict();

export function parseCreateChoreInput(input: unknown) {
  return createChoreInputSchema.parse(input);
}

export async function getCurrentChoreScope(): Promise<ChoreScope | null> {
  const session = await getCurrentAppSession();
  if (!session) return null;

  const membership = await getFirstHouseholdMembership(session.user.id);
  if (!membership?.householdId) return null;

  return {
    householdId: membership.householdId,
    userId: session.user.id,
  };
}

function buildChoreWhere(scope: ChoreScope): Prisma.ChoreWhereInput {
  return { householdId: scope.householdId };
}

const choreIdSchema = z.string().cuid();

export function parseChoreId(value: string) {
  return choreIdSchema.parse(value);
}

function normalizeDate(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addMonths(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const targetMonth = month + months;
  const targetYear = year + Math.floor(targetMonth / 12);
  const normalizedTargetMonth = ((targetMonth % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, normalizedTargetMonth + 1, 0)).getUTCDate();

  return new Date(Date.UTC(targetYear, normalizedTargetMonth, Math.min(day, lastDayOfTargetMonth)));
}

function getNextDueDate(baseDate: Date, intervalValue: number, intervalUnit: ChoreIntervalUnit): Date {
  const normalizedBaseDate = normalizeDate(baseDate);

  if (intervalUnit === "MONTHS") {
    return addMonths(normalizedBaseDate, intervalValue);
  }

  const intervalDays = INTERVAL_UNIT_IN_DAYS[intervalUnit] * intervalValue;
  return new Date(normalizedBaseDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);
}

const choreSelect = {
  id: true,
  name: true,
  intervalValue: true,
  intervalUnit: true,
  assignedHouseholdMemberId: true,
  assignedHouseholdMember: {
    select: {
      color: true,
      user: {
        select: {
          email: true,
          name: true,
        },
      },
    },
  },
  createdAt: true,
  completions: {
    orderBy: { completedAt: "desc" as const },
    select: { completedAt: true },
    take: 1,
  },
} satisfies Prisma.ChoreSelect;

type RawChore = Prisma.ChoreGetPayload<{ select: typeof choreSelect }>;

function toChoreView(chore: RawChore, referenceDate: Date): ChoreView {
  const lastCompletion = chore.completions[0]?.completedAt ?? null;
  const nextDueDate = getNextDueDate(lastCompletion ?? chore.createdAt, chore.intervalValue, chore.intervalUnit);

  return {
    id: chore.id,
    name: chore.name,
    intervalValue: chore.intervalValue,
    intervalUnit: chore.intervalUnit,
    assignedHouseholdMemberId: chore.assignedHouseholdMemberId,
    assignedHouseholdMemberName:
      chore.assignedHouseholdMember.user.name ?? chore.assignedHouseholdMember.user.email ?? null,
    assignedHouseholdMemberColor: chore.assignedHouseholdMember.color,
    createdAt: chore.createdAt.toISOString(),
    lastCompletedAt: lastCompletion?.toISOString() ?? null,
    nextDueAt: nextDueDate.toISOString(),
    isOverdue: nextDueDate.getTime() < normalizeDate(referenceDate).getTime(),
  };
}

function compareChores(a: ChoreView, b: ChoreView): number {
  if (a.isOverdue !== b.isOverdue) {
    return a.isOverdue ? -1 : 1;
  }

  const dueCompare = new Date(a.nextDueAt).getTime() - new Date(b.nextDueAt).getTime();
  if (dueCompare !== 0) return dueCompare;

  return a.name.localeCompare(b.name);
}

export async function listChores(scope: ChoreScope): Promise<ChoreView[]> {
  const chores = await prisma.chore.findMany({
    select: choreSelect,
    where: buildChoreWhere(scope),
  });

  const referenceDate = new Date();
  return chores.map((chore) => toChoreView(chore, referenceDate)).sort(compareChores);
}

export async function listChoreMembers(scope: ChoreScope): Promise<ChoreMemberView[]> {
  return prisma.householdMember.findMany({
    orderBy: [{ user: { name: "asc" } }, { user: { email: "asc" } }],
    select: {
      color: true,
      id: true,
      user: {
        select: {
          email: true,
          name: true,
        },
      },
    },
    where: { householdId: scope.householdId },
  }).then((rows) =>
    rows.map((row) => ({
      id: row.id,
      color: row.color,
      email: row.user.email,
      name: row.user.name,
    })),
  );
}

export async function createChore(
  input: z.infer<typeof createChoreInputSchema>,
  scope: ChoreScope,
): Promise<ChoreView | null> {
  const member = await prisma.householdMember.findFirst({
    select: { id: true },
    where: { householdId: scope.householdId, id: input.assignedHouseholdMemberId },
  });

  if (!member) return null;

  const chore = await prisma.chore.create({
    data: {
      assignedHouseholdMemberId: input.assignedHouseholdMemberId,
      createdByUserId: scope.userId,
      householdId: scope.householdId,
      intervalUnit: input.intervalUnit,
      intervalValue: input.intervalValue,
      name: input.name,
    },
    select: choreSelect,
  });

  return toChoreView(chore, new Date());
}

export async function completeChore(choreId: string, scope: ChoreScope): Promise<ChoreView | null> {
  const chore = await prisma.chore.findFirst({
    select: { id: true },
    where: { id: choreId, ...buildChoreWhere(scope) },
  });

  if (!chore) return null;

  const updated = await prisma.$transaction(async (tx) => {
    await tx.choreCompletion.create({
      data: {
        choreId,
        completedByUserId: scope.userId,
      },
    });

    return tx.chore.findUnique({
      select: choreSelect,
      where: { id: choreId },
    });
  });

  return updated ? toChoreView(updated, new Date()) : null;
}

export async function deleteChore(choreId: string, scope: ChoreScope): Promise<boolean> {
  const result = await prisma.chore.deleteMany({
    where: { id: choreId, ...buildChoreWhere(scope) },
  });

  return result.count > 0;
}
