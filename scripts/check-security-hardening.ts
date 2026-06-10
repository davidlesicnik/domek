import assert from "node:assert/strict";

import { PUBLIC_FORM_HONEYPOT_FIELD } from "../src/lib/public-form";
import { validatePublicRouteRequest } from "../src/lib/public-request-guard";

const rateLimitStoreOwner = globalThis as typeof globalThis & {
  domekPublicMutationRateLimits?: Map<string, { count: number; resetAt: number }>;
};

function resetRateLimitStore() {
  rateLimitStoreOwner.domekPublicMutationRateLimits = new Map();
}

function withEnv<T>(nextEnv: Record<string, string | undefined>, fn: () => T): T {
  const previousEnv = new Map<string, string | undefined>();

  for (const [key, value] of Object.entries(nextEnv)) {
    previousEnv.set(key, process.env[key]);

    if (typeof value === "undefined") {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return fn();
  } finally {
    for (const [key, value] of previousEnv.entries()) {
      if (typeof value === "undefined") {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

function buildRequest(origin: string, url = "https://app.example.com/auth/login") {
  return new Request(url, {
    method: "POST",
    headers: {
      origin,
      referer: "https://app.example.com/en-US/login",
    },
  });
}

function run() {
  withEnv(
    {
      APP_URL: "https://app.example.com",
      AUTH_SECRET: "12345678901234567890123456789012",
      NODE_ENV: "production",
    },
    () => {
      const formData = new FormData();
      formData.set("email", "home@example.com");

      assert.deepEqual(
        validatePublicRouteRequest(buildRequest("https://app.example.com"), "email-auth", {
          formData,
          identifiers: ["home@example.com"],
        }),
        { ok: true },
      );

      assert.deepEqual(
        validatePublicRouteRequest(buildRequest("https://evil.example"), "email-auth", {
          formData,
          identifiers: ["home@example.com"],
        }),
        { ok: false, reason: "cross_origin" },
      );

      const honeypotFormData = new FormData();
      honeypotFormData.set("email", "home@example.com");
      honeypotFormData.set(PUBLIC_FORM_HONEYPOT_FIELD, "spam");

      assert.deepEqual(
        validatePublicRouteRequest(buildRequest("https://app.example.com"), "email-auth", {
          formData: honeypotFormData,
          identifiers: ["home@example.com"],
        }),
        { ok: false, reason: "honeypot" },
      );

      resetRateLimitStore();

      assert.deepEqual(
        validatePublicRouteRequest(buildRequest("https://app.example.com", "https://app.example.com/en-US/contact"), "contact", {
          formData,
          identifiers: ["home@example.com"],
        }),
        { ok: true },
      );
      assert.deepEqual(
        validatePublicRouteRequest(buildRequest("https://app.example.com", "https://app.example.com/en-US/contact"), "contact", {
          formData,
          identifiers: ["home@example.com"],
        }),
        { ok: true },
      );
      assert.deepEqual(
        validatePublicRouteRequest(buildRequest("https://app.example.com", "https://app.example.com/en-US/contact"), "contact", {
          formData,
          identifiers: ["home@example.com"],
        }),
        { ok: false, reason: "rate_limited" },
      );

      resetRateLimitStore();

      const signoutRequest = buildRequest(
        "https://app.example.com",
        "https://app.example.com/api/auth/signout",
      );

      for (let attempt = 0; attempt < 12; attempt += 1) {
        assert.deepEqual(
          validatePublicRouteRequest(signoutRequest, "signout", {
            identifiers: ["user-a"],
          }),
          { ok: true },
        );
      }

      assert.deepEqual(
        validatePublicRouteRequest(signoutRequest, "signout", {
          identifiers: ["user-a"],
        }),
        { ok: false, reason: "rate_limited" },
      );
    },
  );

  console.log("Security hardening checks passed.");
}

run();
