import { ZodError } from "zod";

import {
  createExpense,
  getCurrentExpenseScope,
  getMonthStats,
  listExpenses,
  parseExpenseInput,
} from "@/lib/expenses";

export async function GET(request: Request) {
  const scope = await getCurrentExpenseScope(request);
  if (!scope) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get("year");
  const monthParam = searchParams.get("month");
  const year = yearParam === null ? new Date().getUTCFullYear() : Number(yearParam);
  const month = monthParam === null ? new Date().getUTCMonth() + 1 : Number(monthParam);

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return Response.json({ error: "Invalid year." }, { status: 400 });
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return Response.json({ error: "Invalid month." }, { status: 400 });
  }

  const [expenses, stats] = await Promise.all([
    listExpenses(scope, year, month),
    getMonthStats(scope, year, month),
  ]);

  return Response.json({ expenses, stats });
}

export async function POST(request: Request) {
  const scope = await getCurrentExpenseScope(request);
  if (!scope) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const input = parseExpenseInput(await request.json());
    const expense = await createExpense(input, scope);
    if (!expense) return Response.json({ error: "Invalid expense." }, { status: 400 });

    return Response.json({ expense }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      return Response.json({ error: "Invalid expense." }, { status: 400 });
    }
    console.error("[POST /api/expenses]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
