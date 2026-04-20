import { ZodError } from "zod";

import { completeChore, getCurrentChoreScope, parseChoreId } from "@/lib/chores";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ choreId: string }> },
) {
  const scope = await getCurrentChoreScope();
  if (!scope) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { choreId: rawChoreId } = await params;
    const choreId = parseChoreId(rawChoreId);
    const chore = await completeChore(choreId, scope);

    if (!chore) {
      return Response.json({ error: "Not found." }, { status: 404 });
    }

    return Response.json({ chore }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json({ error: "Invalid chore id." }, { status: 400 });
    }

    throw error;
  }
}
