import { ZodError } from "zod";

import {
  deleteTodoList,
  getCurrentTodoScope,
  parseTodoListInput,
  updateTodoList,
} from "@/lib/todo-lists";
import { revalidateDashboard } from "@/lib/revalidate-dashboard";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ listId: string }> },
) {
  const scope = await getCurrentTodoScope(request);

  if (!scope) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const input = parseTodoListInput(await request.json());
    const { listId } = await params;
    const list = await updateTodoList(listId, input.name, scope);

    if (!list) {
      return Response.json({ error: "Not found." }, { status: 404 });
    }

    revalidateDashboard();
    return Response.json({ list });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      return Response.json({ error: "Invalid todo list." }, { status: 400 });
    }

    console.error("[PATCH /api/todos/lists/[listId]]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ listId: string }> },
) {
  const scope = await getCurrentTodoScope(request);

  if (!scope) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { listId } = await params;
  const deleted = await deleteTodoList(listId, scope);

  if (!deleted) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  revalidateDashboard();
  return Response.json({ ok: true });
}
