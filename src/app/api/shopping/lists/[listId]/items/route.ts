import { ZodError } from "zod";

import {
  createShoppingItem,
  getCurrentShoppingScope,
  parseShoppingItemInput,
} from "@/lib/shopping-lists";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ listId: string }> },
) {
  const scope = await getCurrentShoppingScope();

  if (!scope) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const input = parseShoppingItemInput(await request.json());
    const { listId } = await params;
    const item = await createShoppingItem(listId, input.text, scope);

    if (!item) {
      return Response.json({ error: "Not found." }, { status: 404 });
    }

    return Response.json({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      return Response.json({ error: "Invalid shopping item." }, { status: 400 });
    }

    throw error;
  }
}
