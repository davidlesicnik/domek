import { ZodError } from "zod";

import {
  createTodoItem,
  getCurrentTodoScope,
  parseTodoItemInput,
} from "@/lib/todo-lists";
import { enforceWriteApiRateLimit } from "@/lib/rate-limit-route";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ listId: string }> },
) {
  const rateLimitResponse = await enforceWriteApiRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const scope = await getCurrentTodoScope();

  if (!scope) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const input = parseTodoItemInput(await request.json());
    const { listId } = await params;
    const item = await createTodoItem(listId, input.text, scope);

    if (!item) {
      return Response.json({ error: "Not found." }, { status: 404 });
    }

    return Response.json({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      return Response.json({ error: "Invalid todo item." }, { status: 400 });
    }

    throw error;
  }
}
