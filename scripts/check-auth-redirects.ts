import assert from "node:assert/strict";

import {
  sanitizeAuthCallbackNextPath,
  sanitizeAuthStartNextPath,
} from "../src/lib/auth-redirect";
import {
  parseAllowedDevHosts,
  resolveAuthOriginFromRequest,
} from "../src/lib/origin";

class SimpleHeaders {
  private readonly values = new Map<string, string>();

  constructor(init: Record<string, string | undefined>) {
    for (const [key, value] of Object.entries(init)) {
      if (typeof value === "string") {
        this.values.set(key.toLowerCase(), value);
      }
    }
  }

  get(name: string): string | null {
    return this.values.get(name.toLowerCase()) ?? null;
  }
}

function assertThrows(message: string, fn: () => unknown) {
  let didThrow = false;

  try {
    fn();
  } catch {
    didThrow = true;
  }

  assert.equal(didThrow, true, message);
}

function run() {
  assert.equal(sanitizeAuthStartNextPath("/app"), "/app");
  assert.equal(sanitizeAuthStartNextPath("https://evil.example"), "/");
  assert.equal(sanitizeAuthStartNextPath("//evil.example"), "/");
  assert.equal(sanitizeAuthStartNextPath("/auth/callback?code=123"), "/");

  assert.equal(sanitizeAuthCallbackNextPath("/invite/test"), "/invite/test");
  assert.equal(sanitizeAuthCallbackNextPath("/login?next=/app"), "/app");
  assert.equal(sanitizeAuthCallbackNextPath("https://evil.example"), "/app");
  assert.equal(sanitizeAuthCallbackNextPath("/app?code=123"), "/app");

  assert.equal(
    resolveAuthOriginFromRequest(
      new URL("http://localhost:3000/auth/start/google"),
      new SimpleHeaders({
        "x-forwarded-proto": "http",
        "x-forwarded-host": "localhost:3000",
      }),
      {
        allowedDevHosts: new Set(["localhost", "127.0.0.1"]),
        nodeEnv: "development",
      },
    ),
    "http://localhost:3000",
  );


  const allowedHosts = parseAllowedDevHosts("LOCALHOST,127.0.0.1, [::1] ");
  assert.equal(allowedHosts.has("localhost"), true);
  assert.equal(allowedHosts.has("LOCALHOST"), false);

  assert.equal(
    resolveAuthOriginFromRequest(
      new URL("http://localhost:3000/auth/start/google"),
      new SimpleHeaders({
        "x-forwarded-proto": "HTTPS",
        "x-forwarded-host": "evil.example",
      }),
      {
        appUrl: "https://app.example.com",
        allowedDevHosts: new Set(["localhost"]),
        nodeEnv: "production",
      },
    ),
    "https://app.example.com",
  );

  assertThrows("non-allowlisted development host should fail", () =>
    resolveAuthOriginFromRequest(
      new URL("http://localhost:3000/auth/start/google"),
      new SimpleHeaders({
        "x-forwarded-proto": "https",
        "x-forwarded-host": "evil.example",
      }),
      {
        allowedDevHosts: new Set(["localhost"]),
        nodeEnv: "development",
      },
    ),
  );

  assertThrows("production should require APP_URL", () =>
    resolveAuthOriginFromRequest(
      new URL("http://localhost:3000/auth/start/google"),
      new SimpleHeaders({}),
      {
        allowedDevHosts: new Set(["localhost"]),
        nodeEnv: "production",
      },
    ),
  );

  console.log("Auth redirect safety checks passed.");
}

run();
