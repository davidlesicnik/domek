import { ZodError } from "zod";

import {
  createCategory,
  getCurrentExpenseScope,
  listCategories,
  parseCategoryInput,
} from "@/lib/expenses";

export async function GET() {
  const scope = await getCurrentExpenseScope();
  if (!scope) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const categories = await listCategories(scope);
  return Response.json({ categories });
}

export async function POST(request: Request) {
  const scope = await getCurrentExpenseScope();
  if (!scope) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const input = parseCategoryInput(await request.json());
    const category = await createCategory(input.name, scope);
    return Response.json({ category }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      return Response.json({ error: "Invalid category." }, { status: 400 });
    }
    throw error;
  }
}
