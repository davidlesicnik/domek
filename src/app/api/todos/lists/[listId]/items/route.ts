import { revalidateDashboard } from "@/lib/revalidate-dashboard";
import { ZodError } from "zod";

import {
  createTodoItem,
  getCurrentTodoScope,
  parseTodoItemInput,
} from "@/lib/todo-lists";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ listId: string }> },
) {
  const scope = await getCurrentTodoScope(request);

  if (!scope) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const input = parseTodoItemInput(await request.json());
    const { listId } = await params;
    const item = await createTodoItem(listId, input, scope);

    if (!item) {
      return Response.json({ error: "Not found." }, { status: 404 });
    }

    revalidateDashboard();
    return Response.json({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      return Response.json({ error: "Invalid todo item." }, { status: 400 });
    }

    console.error("[POST /api/todos/lists/[listId]/items]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
