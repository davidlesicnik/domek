import { ZodError } from "zod";

import {
  deleteCalendarEvent,
  getCurrentCalendarScope,
  parseCalendarEventInput,
  updateCalendarEvent,
} from "@/lib/calendar-events";
import { enforceWriteApiRateLimit } from "@/lib/rate-limit-route";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimitResponse = await enforceWriteApiRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

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

    throw error;
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimitResponse = await enforceWriteApiRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

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
