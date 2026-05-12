import { getCurrentTodoScope, listTodoMembers } from "@/lib/todo-lists";

export async function GET() {
  const scope = await getCurrentTodoScope();

  if (!scope) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const members = await listTodoMembers(scope);
  return Response.json({ members });
}
