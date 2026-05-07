import { ZodError } from "zod";

import {
  createCalendarEvent,
  getCurrentCalendarScope,
  parseCalendarEventInput,
} from "@/lib/calendar-events";

export async function POST(request: Request) {
  const scope = await getCurrentCalendarScope();

  if (!scope) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const input = parseCalendarEventInput(await request.json());
    const calendarEvent = await createCalendarEvent(input, scope);

    if (!calendarEvent) {
      return Response.json({ error: "Choose a valid group and household members." }, { status: 400 });
    }

    return Response.json({ event: calendarEvent }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      return Response.json({ error: "Invalid calendar event." }, { status: 400 });
    }

    console.error("[POST /api/calendar/events]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
