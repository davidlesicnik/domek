import { ZodError } from "zod";

import {
  createCalendarGroup,
  getCurrentCalendarScope,
  listCalendarGroups,
  parseCalendarGroupInput,
} from "@/lib/calendar-events";

export async function GET() {
  const scope = await getCurrentCalendarScope();

  if (!scope) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const groups = await listCalendarGroups(scope);
  return Response.json({ groups });
}

export async function POST(request: Request) {
  const scope = await getCurrentCalendarScope();

  if (!scope) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const input = parseCalendarGroupInput(await request.json());
    const group = await createCalendarGroup(input.name, scope, input.color);

    return Response.json({ group }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      return Response.json({ error: "Invalid group." }, { status: 400 });
    }

    throw error;
  }
}
