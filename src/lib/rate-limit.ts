export type RateLimitContext = Readonly<{
  action: string;
  ipAddress: string;
  pathname: string;
  userId?: string | null;
}>;

export type RateLimitPolicy = Readonly<{
  burst: { limit: number; windowMs: number };
  sustained: { limit: number; windowMs: number };
}>;

type BucketState = {
  count: number;
  resetAt: number;
};

type WindowDecision = Readonly<{
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  resetAtUnixSeconds: number;
}>;

type LimiterStore = Map<string, BucketState>;

type RateLimitDecision = Readonly<{
  allowed: boolean;
  key: string;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  resetAtUnixSeconds: number;
}>;

declare global {
  var __domekRateLimitStore: LimiterStore | undefined;
}

const globalStore = globalThis.__domekRateLimitStore ?? new Map<string, BucketState>();
if (!globalThis.__domekRateLimitStore) {
  globalThis.__domekRateLimitStore = globalStore;
}

function getWindowDecision(key: string, windowMs: number, limit: number, now: number): WindowDecision {
  const stateKey = `${key}:${windowMs}`;
  const existing = globalStore.get(stateKey);

  if (!existing || existing.resetAt <= now) {
    const next = { count: 1, resetAt: now + windowMs };
    globalStore.set(stateKey, next);

    return {
      allowed: true,
      remaining: Math.max(limit - next.count, 0),
      resetAtUnixSeconds: Math.ceil(next.resetAt / 1000),
      retryAfterSeconds: 0,
    };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAtUnixSeconds: Math.ceil(existing.resetAt / 1000),
      retryAfterSeconds: Math.max(Math.ceil((existing.resetAt - now) / 1000), 1),
    };
  }

  existing.count += 1;
  globalStore.set(stateKey, existing);

  return {
    allowed: true,
    remaining: Math.max(limit - existing.count, 0),
    resetAtUnixSeconds: Math.ceil(existing.resetAt / 1000),
    retryAfterSeconds: 0,
  };
}

function sanitizeToken(value: string | null | undefined): string {
  if (!value) return "unknown";
  return value.trim().toLowerCase().replace(/[^a-z0-9:_\-.]/g, "_").slice(0, 120) || "unknown";
}

function buildStableKey(context: RateLimitContext): string {
  const principal = context.userId ? `user:${sanitizeToken(context.userId)}` : "user:anonymous";
  const ip = `ip:${sanitizeToken(context.ipAddress)}`;
  return `${sanitizeToken(context.action)}|${ip}|${principal}`;
}

export function getClientIpAddress(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor
      .split(",")
      .map((entry) => entry.trim())
      .find((entry) => entry.length > 0);

    if (firstIp) {
      return firstIp;
    }
  }

  return headers.get("x-real-ip") ?? "unknown";
}

export function checkRateLimit(context: RateLimitContext, policy: RateLimitPolicy): RateLimitDecision {
  const now = Date.now();
  const key = buildStableKey(context);

  const burst = getWindowDecision(key, policy.burst.windowMs, policy.burst.limit, now);
  const sustained = getWindowDecision(key, policy.sustained.windowMs, policy.sustained.limit, now);

  const activeWindow = burst.allowed ? sustained : burst;

  return {
    allowed: burst.allowed && sustained.allowed,
    key,
    limit: burst.allowed ? policy.sustained.limit : policy.burst.limit,
    remaining: Math.min(burst.remaining, sustained.remaining),
    resetAtUnixSeconds: activeWindow.resetAtUnixSeconds,
    retryAfterSeconds: Math.max(burst.retryAfterSeconds, sustained.retryAfterSeconds),
  };
}

export function logRateLimitEvent(
  context: RateLimitContext,
  decision: RateLimitDecision,
  layer: "proxy" | "route",
) {
  if (decision.allowed) return;

  console.warn(
    JSON.stringify({
      event: "rate_limit_exceeded",
      layer,
      action: context.action,
      key: decision.key,
      ipAddress: context.ipAddress,
      pathname: context.pathname,
      retryAfterSeconds: decision.retryAfterSeconds,
      userId: context.userId ?? null,
    }),
  );
}

export function applyRateLimitHeaders(headers: Headers, decision: RateLimitDecision): void {
  headers.set("Retry-After", String(decision.retryAfterSeconds));
  headers.set("X-RateLimit-Limit", String(decision.limit));
  headers.set("X-RateLimit-Remaining", String(decision.remaining));
  headers.set("X-RateLimit-Reset", String(decision.resetAtUnixSeconds));
}
