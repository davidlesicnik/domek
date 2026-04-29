import type { NextRequest } from "next/server";

import { getAppRuntimeConfig } from "@/lib/env";

type AuthOriginRuntime = {
  appUrl?: string;
  nodeEnv?: string;
  allowedDevHosts: ReadonlySet<string>;
};

const defaultDevHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function normalizeHostValue(value: string): string {
  return value.trim().toLowerCase();
}

function parseForwardedValue(value: string | null): string | null {
  if (!value) return null;
  return value.split(",")[0]?.trim() ?? null;
}

function validateLocalHost(host: string, allowedHosts: ReadonlySet<string>): void {
  let hostname: string;
  const normalizedHost = normalizeHostValue(host);

  try {
    hostname = normalizeHostValue(new URL(`http://${host}`).hostname);
  } catch {
    throw new Error("Unable to determine auth origin because request host is invalid.");
  }

  if (!allowedHosts.has(hostname) && !allowedHosts.has(normalizedHost)) {
    throw new Error(
      `Unable to determine auth origin for non-allowlisted dev host \"${host}\". ` +
        "Set APP_URL or include host in AUTH_DEV_ALLOWED_HOSTS.",
    );
  }
}

export function parseAllowedDevHosts(rawValue: string | undefined): ReadonlySet<string> {
  if (!rawValue) {
    return new Set(defaultDevHosts);
  }

  const parsed = rawValue
    .split(",")
    .map((item) => normalizeHostValue(item))
    .filter(Boolean);

  return parsed.length > 0 ? new Set(parsed) : new Set(defaultDevHosts);
}

function resolveValidatedAuthOrigin(
  headers: Pick<Headers, "get">,
  runtime: AuthOriginRuntime,
  fallbackProtocol: string,
  fallbackHost: string | null,
): string {
  if (runtime.appUrl) {
    return new URL(runtime.appUrl).origin;
  }

  if (runtime.nodeEnv === "production") {
    throw new Error("APP_URL is required in production for auth redirects.");
  }

  const proto = normalizeHostValue(
    parseForwardedValue(headers.get("x-forwarded-proto")) ?? fallbackProtocol,
  );
  const host = parseForwardedValue(headers.get("x-forwarded-host")) ?? fallbackHost;

  if (!host) {
    throw new Error("Unable to determine auth origin because request host is missing.");
  }

  if (proto !== "http" && proto !== "https") {
    throw new Error(`Unable to determine auth origin because protocol \"${proto}\" is invalid.`);
  }

  validateLocalHost(host, runtime.allowedDevHosts);
  return `${proto}://${host}`;
}

export function resolveAuthOriginFromHeaders(
  headers: Pick<Headers, "get">,
  runtime: AuthOriginRuntime,
): string {
  return resolveValidatedAuthOrigin(
    headers,
    runtime,
    normalizeHostValue(parseForwardedValue(headers.get("x-forwarded-proto")) ?? "http"),
    headers.get("host"),
  );
}

export function resolveAuthOriginFromRequest(
  requestUrl: URL,
  headers: Pick<Headers, "get">,
  runtime: AuthOriginRuntime,
): string {
  return resolveValidatedAuthOrigin(
    headers,
    runtime,
    requestUrl.protocol.replace(":", ""),
    requestUrl.host,
  );
}

export function resolveAuthOrigin(request: NextRequest): string {
  const { appUrl, nodeEnv } = getAppRuntimeConfig();

  return resolveAuthOriginFromRequest(new URL(request.url), request.headers, {
    allowedDevHosts: parseAllowedDevHosts(process.env.AUTH_DEV_ALLOWED_HOSTS),
    appUrl,
    nodeEnv,
  });
}
