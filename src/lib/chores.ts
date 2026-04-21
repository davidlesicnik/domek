import type {
  ChoreAssignmentType,
  ChoreIntervalUnit,
  ChoreRecurrenceType,
  Prisma,
} from "@prisma/client";
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

export type ChoreCategoryView = {
  id: string;
  name: string;
};

export type ChoreView = {
  id: string;
  name: string;
  categoryId: string | null;
  categoryName: string | null;
  assignmentType: ChoreAssignmentType;
  recurrenceType: ChoreRecurrenceType;
  startsAt: string;
  intervalValue: number;
  intervalUnit: ChoreIntervalUnit;
  weeklyDays: number[];
  rotationMemberIds: string[];
  rotationIndex: number;
  assignedHouseholdMemberId: string | null;
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

const weekdaySchema = z.number().int().min(0).max(6);

const createChoreInputSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    categoryName: z.string().trim().min(1).max(60).optional().nullable(),
    assignmentType: z.enum(["UNASSIGNED", "FIXED", "ROTATING"]),
    assignedHouseholdMemberId: z.string().cuid().nullable().optional(),
    rotationMemberIds: z.array(z.string().cuid()).max(50).default([]),
    recurrenceType: z.enum(["DAILY", "WEEKLY", "MONTHLY", "CUSTOM"]),
    startsAt: z.string().datetime({ offset: true }),
    intervalValue: z.number().int().min(1).max(999).optional(),
    intervalUnit: z.enum(["DAYS", "WEEKS", "MONTHS"]).optional(),
    weeklyDays: z.array(weekdaySchema).max(7).default([]),
  })
  .strict()
  .superRefine((input, ctx) => {
    if (input.assignmentType === "FIXED" && !input.assignedHouseholdMemberId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Choose a person for fixed chores.",
        path: ["assignedHouseholdMemberId"],
      });
    }

    if (input.assignmentType === "ROTATING" && input.rotationMemberIds.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Choose at least one person to rotate this chore.",
        path: ["rotationMemberIds"],
      });
    }

    if (input.assignmentType !== "ROTATING" && input.rotationMemberIds.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Rotation members are only valid for rotating chores.",
        path: ["rotationMemberIds"],
      });
    }

    if (input.recurrenceType === "WEEKLY" && input.weeklyDays.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Choose at least one weekday.",
        path: ["weeklyDays"],
      });
    }

    if (input.recurrenceType !== "WEEKLY" && input.weeklyDays.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Weekdays are only valid for weekly chores.",
        path: ["weeklyDays"],
      });
    }

    if (input.recurrenceType === "CUSTOM") {
      if (!input.intervalValue) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Set a custom repeat interval.",
          path: ["intervalValue"],
        });
      }

      if (!input.intervalUnit) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Choose a custom repeat unit.",
          path: ["intervalUnit"],
        });
      }
    }

    if (input.recurrenceType !== "CUSTOM" && (input.intervalValue || input.intervalUnit)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Custom interval fields are only valid for custom chores.",
        path: ["intervalValue"],
      });
    }
  });

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

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
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

function getNextWeeklyDueDate(baseDate: Date, weeklyDays: number[]): Date {
  const normalizedBaseDate = normalizeDate(baseDate);
  const allowedDays = [...new Set(weeklyDays)].sort((a, b) => a - b);

  for (let offset = 1; offset <= 14; offset += 1) {
    const candidate = addDays(normalizedBaseDate, offset);
    if (allowedDays.includes(candidate.getUTCDay())) {
      return candidate;
    }
  }

  return addDays(normalizedBaseDate, 7);
}

function getNextDueDate(
  chore: Pick<RawChore, "startsAt" | "intervalValue" | "intervalUnit" | "recurrenceType" | "weeklyDays" | "completions">,
): Date {
  const lastCompletion = chore.completions[0]?.completedAt ?? null;
  if (!lastCompletion) {
    return normalizeDate(chore.startsAt);
  }

  const normalizedBaseDate = normalizeDate(lastCompletion);

  switch (chore.recurrenceType) {
    case "DAILY":
      return addDays(normalizedBaseDate, 1);
    case "WEEKLY":
      return getNextWeeklyDueDate(normalizedBaseDate, chore.weeklyDays);
    case "MONTHLY":
      return addMonths(normalizedBaseDate, 1);
    case "CUSTOM":
    default:
      if (chore.intervalUnit === "MONTHS") {
        return addMonths(normalizedBaseDate, chore.intervalValue);
      }

      return addDays(normalizedBaseDate, INTERVAL_UNIT_IN_DAYS[chore.intervalUnit] * chore.intervalValue);
  }
}

const choreSelect = {
  id: true,
  name: true,
  categoryId: true,
  category: {
    select: {
      id: true,
      name: true,
    },
  },
  assignmentType: true,
  recurrenceType: true,
  startsAt: true,
  intervalValue: true,
  intervalUnit: true,
  weeklyDays: true,
  rotationMemberIds: true,
  rotationIndex: true,
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
  const nextDueDate = getNextDueDate(chore);

  return {
    id: chore.id,
    name: chore.name,
    categoryId: chore.categoryId,
    categoryName: chore.category?.name ?? null,
    assignmentType: chore.assignmentType,
    recurrenceType: chore.recurrenceType,
    startsAt: chore.startsAt.toISOString(),
    intervalValue: chore.intervalValue,
    intervalUnit: chore.intervalUnit,
    weeklyDays: chore.weeklyDays,
    rotationMemberIds: chore.rotationMemberIds,
    rotationIndex: chore.rotationIndex,
    assignedHouseholdMemberId: chore.assignedHouseholdMemberId,
    assignedHouseholdMemberName:
      chore.assignedHouseholdMember?.user.name ?? chore.assignedHouseholdMember?.user.email ?? null,
    assignedHouseholdMemberColor: chore.assignedHouseholdMember?.color ?? null,
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
  return prisma.householdMember
    .findMany({
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
    })
    .then((rows) =>
      rows.map((row) => ({
        id: row.id,
        color: row.color,
        email: row.user.email,
        name: row.user.name,
      })),
    );
}

export async function listChoreCategories(scope: ChoreScope): Promise<ChoreCategoryView[]> {
  return prisma.choreCategory.findMany({
    where: { householdId: scope.householdId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
    },
  });
}

function intervalForRecurrence(
  input: z.infer<typeof createChoreInputSchema>,
): Pick<Prisma.ChoreCreateInput, "intervalValue" | "intervalUnit"> {
  switch (input.recurrenceType) {
    case "DAILY":
      return { intervalValue: 1, intervalUnit: "DAYS" };
    case "WEEKLY":
      return { intervalValue: 1, intervalUnit: "WEEKS" };
    case "MONTHLY":
      return { intervalValue: 1, intervalUnit: "MONTHS" };
    case "CUSTOM":
    default:
      return {
        intervalValue: input.intervalValue ?? 1,
        intervalUnit: input.intervalUnit ?? "WEEKS",
      };
  }
}

export async function createChore(
  input: z.infer<typeof createChoreInputSchema>,
  scope: ChoreScope,
): Promise<ChoreView | null> {
  const validMemberIds = new Set(
    (
      await prisma.householdMember.findMany({
        select: { id: true },
        where: { householdId: scope.householdId },
      })
    ).map((member) => member.id),
  );

  const assignedHouseholdMemberId =
    input.assignmentType === "FIXED"
      ? input.assignedHouseholdMemberId ?? null
      : input.assignmentType === "ROTATING"
        ? input.rotationMemberIds[0] ?? null
        : null;

  if (assignedHouseholdMemberId && !validMemberIds.has(assignedHouseholdMemberId)) {
    return null;
  }

  if (input.rotationMemberIds.some((memberId) => !validMemberIds.has(memberId))) {
    return null;
  }

  const categoryName = input.categoryName?.trim() || null;
  let categoryId: string | null = null;

  if (categoryName) {
    const existingCategory = await prisma.choreCategory.findFirst({
      where: {
        householdId: scope.householdId,
        name: {
          equals: categoryName,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    if (existingCategory) {
      categoryId = existingCategory.id;
    } else {
      const createdCategory = await prisma.choreCategory.create({
        data: {
          name: categoryName,
          householdId: scope.householdId,
          createdByUserId: scope.userId,
        },
        select: { id: true },
      });
      categoryId = createdCategory.id;
    }
  }

  const chore = await prisma.chore.create({
    data: {
      assignmentType: input.assignmentType,
      assignedHouseholdMemberId,
      categoryId,
      createdByUserId: scope.userId,
      householdId: scope.householdId,
      recurrenceType: input.recurrenceType,
      startsAt: new Date(input.startsAt),
      rotationIndex: 0,
      rotationMemberIds: input.assignmentType === "ROTATING" ? [...new Set(input.rotationMemberIds)] : [],
      weeklyDays: input.recurrenceType === "WEEKLY" ? [...new Set(input.weeklyDays)].sort((a, b) => a - b) : [],
      ...intervalForRecurrence(input),
      name: input.name,
    },
    select: choreSelect,
  });

  return toChoreView(chore, new Date());
}

export async function completeChore(choreId: string, scope: ChoreScope): Promise<ChoreView | null> {
  const chore = await prisma.chore.findFirst({
    select: {
      id: true,
      assignmentType: true,
      assignedHouseholdMemberId: true,
      rotationIndex: true,
      rotationMemberIds: true,
    },
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

    if (chore.assignmentType === "ROTATING" && chore.rotationMemberIds.length > 0) {
      const nextIndex = (chore.rotationIndex + 1) % chore.rotationMemberIds.length;

      await tx.chore.update({
        where: { id: chore.id },
        data: {
          assignedHouseholdMemberId: chore.rotationMemberIds[nextIndex] ?? null,
          rotationIndex: nextIndex,
        },
      });
    }

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
