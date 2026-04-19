import { ZodError } from "zod";

import { createNote, getCurrentNoteScope, parseNoteInput } from "@/lib/notes";
import { enforceWriteApiRateLimit } from "@/lib/rate-limit-route";

export async function POST(request: Request) {
  const rateLimitResponse = await enforceWriteApiRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

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
