import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { getCurrentAppSession } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { EXPENSE_CATEGORY_COLOR_OPTIONS } from "@/lib/expense-colors";
import { getHouseholdMemberName } from "@/lib/household-members";
import { getFirstHouseholdMembership } from "@/lib/users";

export type ExpenseView = {
  id: string;
  name: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  date: string;
  notes: string | null;
  memberName: string | null;
  categoryId: string | null;
  categoryColor: string | null;
  categoryName: string | null;
  householdMemberId: string | null;
  householdMemberName: string | null;
  householdMemberColor: string | null;
  householdMemberEmoji: string | null;
};

export type CategoryView = { id: string; color: string; name: string };

export type MemberView = {
  id: string;
  color: string;
  emoji: string | null;
  name: string | null;
  email: string | null;
};

export type MonthStats = {
  carryover: number;
  income: number;
  expenses: number;
  net: number;
};

export type ExpenseScope = {
  householdId: string;
  userId: string;
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const hexColorPattern = /^#[0-9A-Fa-f]{6}$/;

function pickCategoryColor(existingColors: string[]): string {
  const normalizedColors = existingColors.map((color) => color.toLowerCase());
  const usedColors = new Set(normalizedColors);
  const unusedColor = EXPENSE_CATEGORY_COLOR_OPTIONS.find((color) => !usedColors.has(color.toLowerCase()));

  if (unusedColor) return unusedColor;

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

export async function getCurrentExpenseScope(): Promise<ExpenseScope | null> {
  const session = await getCurrentAppSession();
  if (!session) return null;

  const membership = await getFirstHouseholdMembership(session.user.id);
  if (!membership?.householdId) return null;

  return {
    householdId: membership.householdId,
    userId: session.user.id,
  };
}

function buildExpenseWhere(scope: ExpenseScope): Prisma.ExpenseWhereInput {
  return { householdId: scope.householdId };
}

function buildCategoryWhere(scope: ExpenseScope): Prisma.ExpenseCategoryWhereInput {
  return { householdId: scope.householdId };
}

function monthBounds(year: number, month: number) {
  return {
    gte: new Date(Date.UTC(year, month - 1, 1)),
    lt: new Date(Date.UTC(year, month, 1)),
  };
}

function isValidDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.toISOString().slice(0, 10) === dateKey;
}

const expenseSelect = {
  id: true,
  name: true,
  amount: true,
  type: true,
  date: true,
  notes: true,
  memberName: true,
  categoryId: true,
  category: { select: { color: true, name: true } },
  householdMemberId: true,
  householdMember: {
    select: { color: true, emoji: true, name: true, account: { select: { email: true } } },
  },
} satisfies Prisma.ExpenseSelect;

type RawExpense = {
  id: string;
  name: string;
  amount: Prisma.Decimal;
  type: "INCOME" | "EXPENSE";
  date: Date;
  notes: string | null;
  memberName: string | null;
  categoryId: string | null;
  category: { color: string; name: string } | null;
  householdMemberId: string | null;
  householdMember: {
    color: string;
    emoji: string | null;
    name: string;
    account: { email: string | null } | null;
  } | null;
};

function toExpenseView(e: RawExpense): ExpenseView {
  return {
    id: e.id,
    name: e.name,
    amount: Number(e.amount),
    type: e.type,
    date: e.date.toISOString(),
    notes: e.notes,
    memberName: e.memberName,
    categoryId: e.categoryId,
    categoryColor: e.category?.color ?? null,
    categoryName: e.category?.name ?? null,
    householdMemberId: e.householdMemberId,
    householdMemberName: e.householdMember
      ? getHouseholdMemberName({
          accountEmail: e.householdMember.account?.email,
          name: e.householdMember.name,
        })
      : e.memberName,
    householdMemberColor: e.householdMember?.color ?? null,
    householdMemberEmoji: e.householdMember?.emoji ?? null,
  };
}

export async function listExpenses(
  scope: ExpenseScope,
  year: number,
  month: number,
): Promise<ExpenseView[]> {
  const rows = await prisma.expense.findMany({
    orderBy: { date: "desc" },
    select: expenseSelect,
    where: { ...buildExpenseWhere(scope), date: monthBounds(year, month) },
  });
  return rows.map(toExpenseView);
}

export async function getMonthStats(
  scope: ExpenseScope,
  year: number,
  month: number,
): Promise<MonthStats> {
  const bounds = monthBounds(year, month);
  const baseWhere: Prisma.ExpenseWhereInput = {
    ...buildExpenseWhere(scope),
    date: bounds,
  };
  const carryoverWhere: Prisma.ExpenseWhereInput = {
    ...buildExpenseWhere(scope),
    date: { lt: bounds.gte },
  };

  const [incomeAgg, expenseAgg, carryoverIncomeAgg, carryoverExpenseAgg] = await Promise.all([
    prisma.expense.aggregate({ _sum: { amount: true }, where: { ...baseWhere, type: "INCOME" } }),
    prisma.expense.aggregate({ _sum: { amount: true }, where: { ...baseWhere, type: "EXPENSE" } }),
    prisma.expense.aggregate({ _sum: { amount: true }, where: { ...carryoverWhere, type: "INCOME" } }),
    prisma.expense.aggregate({ _sum: { amount: true }, where: { ...carryoverWhere, type: "EXPENSE" } }),
  ]);

  const income = Number(incomeAgg._sum.amount ?? 0);
  const expenses = Number(expenseAgg._sum.amount ?? 0);
  const carryover = Number(carryoverIncomeAgg._sum.amount ?? 0) - Number(carryoverExpenseAgg._sum.amount ?? 0);
  return { carryover, income, expenses, net: carryover + income - expenses };
}

export const expenseInputSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    amount: z.number().positive().finite(),
    type: z.enum(["INCOME", "EXPENSE"]),
    date: z.string().regex(datePattern).refine(isValidDateKey, "Use a valid date."),
    notes: z.string().trim().max(1000).optional().nullable(),
    memberName: z.string().trim().max(120).optional().nullable(),
    categoryId: z.string().cuid().optional().nullable(),
    householdMemberId: z.string().cuid().optional().nullable(),
  })
  .strict();

export function parseExpenseInput(input: unknown) {
  return expenseInputSchema.parse(input);
}

async function expenseReferencesExist(data: z.infer<typeof expenseInputSchema>, scope: ExpenseScope) {
  const [category, householdMember] = await Promise.all([
    data.categoryId
      ? prisma.expenseCategory.findFirst({
          select: { id: true },
          where: { id: data.categoryId, ...buildCategoryWhere(scope) },
        })
      : Promise.resolve({ id: null }),
    data.householdMemberId && scope.householdId
      ? prisma.householdMember.findFirst({
          select: { id: true },
          where: { householdId: scope.householdId, id: data.householdMemberId },
        })
      : Promise.resolve(data.householdMemberId ? null : { id: null }),
  ]);

  if (!category || !householdMember) {
    return false;
  }

  return true;
}

export async function createExpense(
  data: z.infer<typeof expenseInputSchema>,
  scope: ExpenseScope,
): Promise<ExpenseView | null> {
  if (!(await expenseReferencesExist(data, scope))) return null;

  const create: Prisma.ExpenseUncheckedCreateInput = {
    name: data.name,
    amount: data.amount,
    type: data.type,
    date: new Date(`${data.date}T00:00:00.000Z`),
    notes: data.notes ?? null,
    memberName: data.householdMemberId ? null : (data.memberName ?? null),
    categoryId: data.categoryId ?? null,
    householdMemberId: data.householdMemberId ?? null,
    createdByUserId: scope.userId,
    householdId: scope.householdId,
  };

  const expense = await prisma.expense.create({ data: create, select: expenseSelect });
  return toExpenseView(expense);
}

export async function updateExpense(
  id: string,
  data: z.infer<typeof expenseInputSchema>,
  scope: ExpenseScope,
): Promise<ExpenseView | null> {
  const existing = await prisma.expense.findFirst({
    select: { id: true },
    where: { id, ...buildExpenseWhere(scope) },
  });

  if (!existing || !(await expenseReferencesExist(data, scope))) return null;

  const expense = await prisma.expense.update({
    data: {
      name: data.name,
      amount: data.amount,
      type: data.type,
      date: new Date(`${data.date}T00:00:00.000Z`),
      notes: data.notes ?? null,
      memberName: data.householdMemberId ? null : (data.memberName ?? null),
      categoryId: data.categoryId ?? null,
      householdMemberId: data.householdMemberId ?? null,
    },
    select: expenseSelect,
    where: { id },
  });

  return toExpenseView(expense);
}

export async function deleteExpense(id: string, scope: ExpenseScope): Promise<boolean> {
  const result = await prisma.expense.deleteMany({
    where: { id, ...buildExpenseWhere(scope) },
  });
  return result.count > 0;
}

export const categoryInputSchema = z
  .object({ name: z.string().trim().min(1).max(60) })
  .strict();

export function parseCategoryInput(input: unknown) {
  return categoryInputSchema.parse(input);
}

export const categoryUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(60),
    color: z.string().regex(hexColorPattern),
  })
  .strict();

export function parseCategoryUpdate(input: unknown) {
  return categoryUpdateSchema.parse(input);
}

export async function listCategories(scope: ExpenseScope): Promise<CategoryView[]> {
  return prisma.expenseCategory.findMany({
    orderBy: { name: "asc" },
    select: { id: true, color: true, name: true },
    where: buildCategoryWhere(scope),
  });
}

export async function createCategory(name: string, scope: ExpenseScope): Promise<CategoryView> {
  const existingCategories = await prisma.expenseCategory.findMany({
    select: { color: true },
    where: buildCategoryWhere(scope),
  });
  const create: Prisma.ExpenseCategoryUncheckedCreateInput = {
    name,
    color: pickCategoryColor(existingCategories.map((category) => category.color)),
    createdByUserId: scope.userId,
    householdId: scope.householdId,
  };
  return prisma.expenseCategory.create({ data: create, select: { id: true, color: true, name: true } });
}

export async function updateCategory(
  id: string,
  data: z.infer<typeof categoryUpdateSchema>,
  scope: ExpenseScope,
): Promise<CategoryView | null> {
  const existing = await prisma.expenseCategory.findFirst({
    select: { id: true },
    where: { id, ...buildCategoryWhere(scope) },
  });

  if (!existing) return null;

  return prisma.expenseCategory.update({
    data: { color: data.color, name: data.name },
    select: { id: true, color: true, name: true },
    where: { id },
  });
}

export async function listMembers(scope: ExpenseScope): Promise<MemberView[]> {
  const members = await prisma.householdMember.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, color: true, emoji: true, name: true, account: { select: { email: true } } },
    where: { householdId: scope.householdId },
  });

  return members.map((member) => ({
    id: member.id,
    color: member.color,
    emoji: member.emoji,
    name: member.name,
    email: member.account?.email ?? null,
  }));
}
