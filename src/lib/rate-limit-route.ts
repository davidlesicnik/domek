import { createSupabaseServerClient } from "@/lib/supabase";
import {
  applyRateLimitHeaders,
  checkRateLimit,
  getClientIpAddress,
  logRateLimitEvent,
  type RateLimitPolicy,
} from "@/lib/rate-limit";

export const WRITE_API_RATE_LIMIT_POLICY: RateLimitPolicy = {
  burst: { limit: 30, windowMs: 60_000 },
  sustained: { limit: 300, windowMs: 3_600_000 },
};

export async function enforceWriteApiRateLimit(request: Request): Promise<Response | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ipAddress = getClientIpAddress(request.headers);
  const pathname = new URL(request.url).pathname;
  const decision = checkRateLimit(
    {
      action: "api-write",
      ipAddress,
      pathname,
      userId: user?.id,
    },
    WRITE_API_RATE_LIMIT_POLICY,
  );

  if (decision.allowed) {
    return null;
  }

  logRateLimitEvent(
    {
      action: "api-write",
      ipAddress,
      pathname,
      userId: user?.id,
    },
    decision,
    "route",
  );

  const response = Response.json(
    {
      error: "Too many requests. Please wait and try again.",
      retryAfterSeconds: decision.retryAfterSeconds,
    },
    { status: 429 },
  );

  applyRateLimitHeaders(response.headers, decision);
  return response;
}
