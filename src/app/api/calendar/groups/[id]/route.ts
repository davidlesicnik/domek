import { ZodError } from "zod";

import {
  getCurrentCalendarScope,
  parseCalendarGroupUpdate,
  updateCalendarGroup,
} from "@/lib/calendar-events";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const scope = await getCurrentCalendarScope();

  if (!scope) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const input = parseCalendarGroupUpdate(await request.json());
    const group = await updateCalendarGroup(id, input, scope);

    if (!group) {
      return Response.json({ error: "Not found." }, { status: 404 });
    }

    return Response.json({ group });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      return Response.json({ error: "Invalid group." }, { status: 400 });
    }

    throw error;
  }
}
