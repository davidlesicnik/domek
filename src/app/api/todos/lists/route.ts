import { ZodError } from "zod";

import {
  createTodoList,
  getCurrentTodoScope,
  parseTodoListInput,
} from "@/lib/todo-lists";

export async function POST(request: Request) {
  const scope = await getCurrentTodoScope();

  if (!scope) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const input = parseTodoListInput(await request.json());
    const list = await createTodoList(input.name, scope);

    return Response.json({ list }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      return Response.json({ error: "Invalid todo list." }, { status: 400 });
    }

    throw error;
  }
}
