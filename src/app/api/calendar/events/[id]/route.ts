import { ZodError } from "zod";

import {
  deleteCalendarEvent,
  getCurrentCalendarScope,
  parseCalendarEventInput,
  updateCalendarEvent,
} from "@/lib/calendar-events";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getCurrentCalendarScope();

  if (!scope) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const input = parseCalendarEventInput(await request.json());
    const calendarEvent = await updateCalendarEvent(id, input, scope);

    if (!calendarEvent) {
      return Response.json({ error: "Event not found." }, { status: 404 });
    }

    return Response.json({ event: calendarEvent });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      return Response.json({ error: "Invalid calendar event." }, { status: 400 });
    }

    console.error("[PATCH /api/calendar/events/[id]]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getCurrentCalendarScope();

  if (!scope) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const deleted = await deleteCalendarEvent(id, scope);

  if (!deleted) {
    return Response.json({ error: "Event not found." }, { status: 404 });
  }

  return new Response(null, { status: 204 });
}
