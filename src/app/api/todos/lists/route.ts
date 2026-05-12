import { ZodError } from "zod";

import {
  createTodoList,
  getCurrentTodoScope,
  listAllTodoListsWithItems,
  parseTodoListInput,
} from "@/lib/todo-lists";
import { revalidateDashboard } from "@/lib/revalidate-dashboard";

<<<<<<< HEAD
export async function GET(request: Request) {
  const scope = await getCurrentTodoScope(request);

  if (!scope) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lists = await listAllTodoListsWithItems(scope);
  return Response.json({ lists });
}

export async function POST(request: Request) {
  const scope = await getCurrentTodoScope(request);

  if (!scope) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const input = parseTodoListInput(await request.json());
    const list = await createTodoList(input.name, scope);

    revalidateDashboard();
    return Response.json({ list }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      return Response.json({ error: "Invalid todo list." }, { status: 400 });
    }

    console.error("[POST /api/todos/lists]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
