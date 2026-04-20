import { ZodError } from "zod";

import { deleteChore, getCurrentChoreScope, parseChoreId } from "@/lib/chores";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ choreId: string }> },
) {
  const scope = await getCurrentChoreScope();
  if (!scope) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { choreId: rawChoreId } = await params;
    const choreId = parseChoreId(rawChoreId);
    const deleted = await deleteChore(choreId, scope);

    if (!deleted) {
      return Response.json({ error: "Not found." }, { status: 404 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json({ error: "Invalid chore id." }, { status: 400 });
    }

    throw error;
  }
}
