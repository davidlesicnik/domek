import { headers as nextHeaders } from "next/headers";

import { getAppRuntimeConfig } from "@/lib/env";
import {
  parseAllowedDevHosts,
  resolveAuthOriginFromHeaders,
  resolveAuthOriginFromRequest,
} from "@/lib/origin";
import {
  PUBLIC_FORM_HONEYPOT_FIELD,
  PUBLIC_MUTATION_COOLDOWN_MS,
} from "@/lib/public-form";

type HeadersLike = Pick<Headers, "get">;
type PublicMutationTarget = "contact" | "email-auth" | "signout";
type PublicMutationGuardResult =
  | { ok: true }
  | { ok: false; reason: "cross_origin" | "honeypot" | "rate_limited" };
type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const publicMutationRateLimits = {
  contact: { maxAttempts: 2, windowMs: PUBLIC_MUTATION_COOLDOWN_MS.contact },
  "email-auth": { maxAttempts: 4, windowMs: PUBLIC_MUTATION_COOLDOWN_MS["email-auth"] },
  signout: { maxAttempts: 12, windowMs: 60_000 },
} satisfies Record<PublicMutationTarget, { maxAttempts: number; windowMs: number }>;

const globalForPublicRequestGuard = globalThis as typeof globalThis & {
  domekPublicMutationRateLimits?: Map<string, RateLimitEntry>;
};

function rateLimitStore(): Map<string, RateLimitEntry> {
  if (!globalForPublicRequestGuard.domekPublicMutationRateLimits) {
    globalForPublicRequestGuard.domekPublicMutationRateLimits = new Map();
  }

  return globalForPublicRequestGuard.domekPublicMutationRateLimits;
}

function firstForwardedValue(value: string | null): string | null {
  return value?.split(",")[0]?.trim() || null;
}

function normalizeOrigin(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function requestOrigin(headers: HeadersLike): string | null {
  return normalizeOrigin(headers.get("origin")) ?? normalizeOrigin(headers.get("referer"));
}

function clientAddress(headers: HeadersLike): string {
  return (
    firstForwardedValue(headers.get("x-forwarded-for")) ??
    headers.get("x-real-ip")?.trim() ??
    "unknown"
  );
}

function normalizeKeyPart(value: string | null | undefined): string {
  if (!value) {
    return "unknown";
  }

  return value.trim().toLowerCase().slice(0, 120) || "unknown";
}

function cleanExpiredEntries(store: Map<string, RateLimitEntry>, now: number) {
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}

function isRateLimited(
  target: PublicMutationTarget,
  headers: HeadersLike,
  identifiers: readonly string[],
): boolean {
  const config = publicMutationRateLimits[target];
  const now = Date.now();
  const store = rateLimitStore();

  if (store.size > 500) {
    cleanExpiredEntries(store, now);
  }

  const key = [
    target,
    normalizeKeyPart(clientAddress(headers)),
    ...identifiers.map((identifier) => normalizeKeyPart(identifier)),
  ].join(":");

  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return false;
  }

  existing.count += 1;
  store.set(key, existing);

  return existing.count > config.maxAttempts;
}

function publicOriginRuntime() {
  const { appUrl, nodeEnv } = getAppRuntimeConfig();

  return {
    allowedDevHosts: parseAllowedDevHosts(process.env.AUTH_DEV_ALLOWED_HOSTS),
    appUrl,
    nodeEnv,
  };
}

function sameOrigin(headers: HeadersLike, expectedOrigin: string): boolean {
  return requestOrigin(headers) === expectedOrigin;
}

export function isPublicFormHoneypotFilled(formData: FormData | null | undefined): boolean {
  if (!formData) {
    return false;
  }

  const value = formData.get(PUBLIC_FORM_HONEYPOT_FIELD);
  return typeof value === "string" && value.trim().length > 0;
}

export async function validatePublicServerActionRequest(
  formData: FormData,
  target: PublicMutationTarget,
  identifiers: readonly string[] = [],
): Promise<PublicMutationGuardResult> {
  const requestHeaders = await nextHeaders();
  const expectedOrigin = (() => {
    try {
      return resolveAuthOriginFromHeaders(requestHeaders, publicOriginRuntime());
    } catch {
      return null;
    }
  })();

  if (!expectedOrigin || !sameOrigin(requestHeaders, expectedOrigin)) {
    return { ok: false, reason: "cross_origin" };
  }

  if (isPublicFormHoneypotFilled(formData)) {
    return { ok: false, reason: "honeypot" };
  }

  if (isRateLimited(target, requestHeaders, identifiers)) {
    return { ok: false, reason: "rate_limited" };
  }

  return { ok: true };
}

export function validatePublicRouteRequest(
  request: Request,
  target: PublicMutationTarget,
  options: {
    formData?: FormData | null;
    identifiers?: readonly string[];
  } = {},
): PublicMutationGuardResult {
  const expectedOrigin = (() => {
    try {
      return resolveAuthOriginFromRequest(
        new URL(request.url),
        request.headers,
        publicOriginRuntime(),
      );
    } catch {
      return null;
    }
  })();

  if (!expectedOrigin || !sameOrigin(request.headers, expectedOrigin)) {
    return { ok: false, reason: "cross_origin" };
  }

  if (isPublicFormHoneypotFilled(options.formData)) {
    return { ok: false, reason: "honeypot" };
  }

  if (isRateLimited(target, request.headers, options.identifiers ?? [])) {
    return { ok: false, reason: "rate_limited" };
  }

  return { ok: true };
}
