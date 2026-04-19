import { deleteTodoItem, getCurrentTodoScope, toggleTodoItem } from "@/lib/todo-lists";
import { enforceWriteApiRateLimit } from "@/lib/rate-limit-route";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const rateLimitResponse = await enforceWriteApiRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const scope = await getCurrentTodoScope();

  if (!scope) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { itemId } = await params;
  const item = await toggleTodoItem(itemId, scope);

  if (!item) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  return Response.json({ item });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const rateLimitResponse = await enforceWriteApiRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const scope = await getCurrentTodoScope();

  if (!scope) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { itemId } = await params;
  const deleted = await deleteTodoItem(itemId, scope);

  if (!deleted) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  return Response.json({ ok: true });
}
