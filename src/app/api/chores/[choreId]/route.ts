import { revalidateDashboard } from "@/lib/revalidate-dashboard";
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

    revalidateDashboard();
    return Response.json({ chore });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      return Response.json({ error: "Invalid chore." }, { status: 400 });
    }

    console.error("[PATCH /api/chores/[choreId]]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
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

    revalidateDashboard();
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json({ error: "Invalid chore id." }, { status: 400 });
    }

    console.error("[DELETE /api/chores/[choreId]]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
