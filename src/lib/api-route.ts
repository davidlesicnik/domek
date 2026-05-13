import { ZodError } from "zod";

import { getCurrentAppSession, type AppSession } from "@/lib/authz";

export function jsonError(error: string, status: number) {
  return Response.json({ error }, { status });
}

export async function requireApiSession(request: Request): Promise<AppSession | Response> {
  const session = await getCurrentAppSession(request);
  return session ?? jsonError("Unauthorized", 401);
}

export function handleRouteError(
  error: unknown,
  options: {
    invalidMessage: string;
    logLabel: string;
  },
) {
  if (error instanceof SyntaxError || error instanceof ZodError) {
    return jsonError(options.invalidMessage, 400);
  }

  console.error(options.logLabel, error);
  return jsonError("Internal server error", 500);
}
