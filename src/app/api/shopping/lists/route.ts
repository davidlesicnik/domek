import { ZodError } from "zod";

import {
  createShoppingList,
  getCurrentShoppingScope,
  parseShoppingListInput,
} from "@/lib/shopping-lists";

export async function POST(request: Request) {
  const scope = await getCurrentShoppingScope();

  if (!scope) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const input = parseShoppingListInput(await request.json());
    const list = await createShoppingList(input.name, scope);

    return Response.json({ list }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      return Response.json({ error: "Invalid shopping list." }, { status: 400 });
    }

    throw error;
  }
}
