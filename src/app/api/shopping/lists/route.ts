import { ZodError } from "zod";

import {
  createShoppingList,
  getCurrentShoppingScope,
  parseShoppingListInput,
} from "@/lib/shopping-lists";
import { enforceWriteApiRateLimit } from "@/lib/rate-limit-route";

export async function POST(request: Request) {
  const rateLimitResponse = await enforceWriteApiRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

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
