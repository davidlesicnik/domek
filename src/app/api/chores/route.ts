import { ZodError } from "zod";

import { createChore, getCurrentChoreScope, parseCreateChoreInput } from "@/lib/chores";

export async function POST(request: Request) {
  const scope = await getCurrentChoreScope();
  if (!scope) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const input = parseCreateChoreInput(await request.json());
    const chore = await createChore(input, scope);

    if (!chore) {
      return Response.json({ error: "Invalid chore." }, { status: 400 });
    }

    return Response.json({ chore }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      return Response.json({ error: "Invalid chore." }, { status: 400 });
    }

    throw error;
  }
}
