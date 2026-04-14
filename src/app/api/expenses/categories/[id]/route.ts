import { ZodError } from "zod";

import {
  getCurrentExpenseScope,
  parseCategoryUpdate,
  updateCategory,
} from "@/lib/expenses";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const scope = await getCurrentExpenseScope();
  if (!scope) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const input = parseCategoryUpdate(await request.json());
    const category = await updateCategory(id, input, scope);

    if (!category) return Response.json({ error: "Not found." }, { status: 404 });
    return Response.json({ category });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      return Response.json({ error: "Invalid category." }, { status: 400 });
    }

    throw error;
  }
}
