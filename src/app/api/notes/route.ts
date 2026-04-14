import { ZodError } from "zod";

import { createNote, getCurrentNoteScope, parseNoteInput } from "@/lib/notes";

export async function POST(request: Request) {
  const scope = await getCurrentNoteScope();

  if (!scope) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const input = parseNoteInput(await request.json());
    const note = await createNote(input.title, input.body, scope);

    return Response.json({ note }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      return Response.json({ error: "Invalid note." }, { status: 400 });
    }

    throw error;
  }
}
