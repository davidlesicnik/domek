import { deleteTodoList, getCurrentTodoScope } from "@/lib/todo-lists";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ listId: string }> },
) {
  const scope = await getCurrentTodoScope();

  if (!scope) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { listId } = await params;
  const deleted = await deleteTodoList(listId, scope);

  if (!deleted) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  return Response.json({ ok: true });
}
