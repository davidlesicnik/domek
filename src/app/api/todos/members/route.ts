import { getCurrentTodoScope, listTodoMembers } from "@/lib/todo-lists";

export async function GET(request: Request) {
  const scope = await getCurrentTodoScope(request);

  if (!scope) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const members = await listTodoMembers(scope);
  return Response.json({ members });
}
