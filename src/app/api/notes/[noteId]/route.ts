import { ZodError } from "zod";

import { deleteNote, getCurrentNoteScope, parseNoteInput, updateNote } from "@/lib/notes";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ noteId: string }> },
) {
  const scope = await getCurrentNoteScope();

  if (!scope) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const input = parseNoteInput(await request.json());
    const { noteId } = await params;
    const note = await updateNote(noteId, input.title, input.body, scope);

    if (!note) {
      return Response.json({ error: "Not found." }, { status: 404 });
    }

    return Response.json({ note });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      return Response.json({ error: "Invalid note." }, { status: 400 });
    }

    console.error("[PATCH /api/notes/[noteId]]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ noteId: string }> },
) {
  const scope = await getCurrentNoteScope();

  if (!scope) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { noteId } = await params;
  const deleted = await deleteNote(noteId, scope);

  if (!deleted) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  return Response.json({ ok: true });
}
