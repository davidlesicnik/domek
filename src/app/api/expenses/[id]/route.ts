import { ZodError } from "zod";

import {
  deleteExpense,
  getCurrentExpenseScope,
  parseExpenseInput,
  updateExpense,
} from "@/lib/expenses";
import { enforceWriteApiRateLimit } from "@/lib/rate-limit-route";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rateLimitResponse = await enforceWriteApiRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const scope = await getCurrentExpenseScope();
  if (!scope) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const input = parseExpenseInput(await request.json());
    const expense = await updateExpense(id, input, scope);

    if (!expense) return Response.json({ error: "Not found." }, { status: 404 });
    return Response.json({ expense });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      return Response.json({ error: "Invalid expense." }, { status: 400 });
    }

    throw error;
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rateLimitResponse = await enforceWriteApiRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const scope = await getCurrentExpenseScope();
  if (!scope) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const deleted = await deleteExpense(id, scope);

  if (!deleted) return Response.json({ error: "Not found." }, { status: 404 });
  return Response.json({ ok: true });
}
