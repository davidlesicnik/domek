import { revalidateDashboard } from "@/lib/revalidate-dashboard";
import { ZodError } from "zod";

import {
  deleteTodoItem,
  getCurrentTodoScope,
  parseTodoItemInput,
  toggleTodoItem,
  updateTodoItem,
} from "@/lib/todo-lists";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const scope = await getCurrentTodoScope();

  if (!scope) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { itemId } = await params;

  try {
    const rawBody = await request.text();

    if (!rawBody.trim()) {
      const item = await toggleTodoItem(itemId, scope);

      if (!item) {
        return Response.json({ error: "Not found." }, { status: 404 });
      }

      revalidateDashboard();
      return Response.json({ item });
    }

    const input = parseTodoItemInput(JSON.parse(rawBody));
    const item = await updateTodoItem(itemId, input, scope);

    if (!item) {
      return Response.json({ error: "Not found." }, { status: 404 });
    }

    revalidateDashboard();
    return Response.json({ item });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      return Response.json({ error: "Invalid todo item." }, { status: 400 });
    }

    throw error;
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const scope = await getCurrentTodoScope();

  if (!scope) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { itemId } = await params;
  const deleted = await deleteTodoItem(itemId, scope);

  if (!deleted) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  revalidateDashboard();
  return Response.json({ ok: true });
}
