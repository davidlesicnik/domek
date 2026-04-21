import { ZodError } from "zod";

import {
  deleteChore,
  getCurrentChoreScope,
  parseChoreId,
  parseUpdateChoreInput,
  updateChore,
} from "@/lib/chores";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ choreId: string }> },
) {
  const scope = await getCurrentChoreScope();
  if (!scope) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { choreId: rawChoreId } = await params;
    const choreId = parseChoreId(rawChoreId);
    const input = parseUpdateChoreInput(await request.json());
    const chore = await updateChore(choreId, input, scope);

    if (!chore) {
      return Response.json({ error: "Invalid chore." }, { status: 400 });
    }

    return Response.json({ chore });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      return Response.json({ error: "Invalid chore." }, { status: 400 });
    }

    throw error;
  }
}

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
