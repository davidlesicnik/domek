import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

import { getDevelopmentAccessBypassConfig } from "../src/lib/env";
import { PUBLIC_FORM_HONEYPOT_FIELD } from "../src/lib/public-form";
import { validatePublicRouteRequest } from "../src/lib/public-request-guard";
import {
  PADDLE_WEBHOOK_SIGNATURE_TOLERANCE_MS,
  verifyPaddleWebhookSignature,
} from "../src/lib/paddle";

const rateLimitStoreOwner = globalThis as typeof globalThis & {
  domekPublicMutationRateLimits?: Map<string, { count: number; resetAt: number }>;
};

function resetRateLimitStore() {
  rateLimitStoreOwner.domekPublicMutationRateLimits = new Map();
}

function withEnv<T>(
  nextEnv: Record<string, string | undefined>,
  fn: () => T,
): T {
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

function buildRequest(origin: string, url = "https://app.example.com/auth/email") {
  return new Request(url, {
    method: "POST",
    headers: {
      origin,
      referer: "https://app.example.com/en-US/login",
    },
  });
}

function buildSignedPaddleHeader(body: string, secret: string, timestampSeconds: number) {
  const signature = createHmac("sha256", secret)
    .update(`${timestampSeconds}:${body}`)
    .digest("hex");

  return `ts=${timestampSeconds};h1=${signature}`;
}

function run() {
  withEnv(
    {
      APP_URL: "https://app.example.com",
      NODE_ENV: "production",
      ENABLE_DEVELOPMENT_ACCESS_BYPASS: undefined,
      DEVELOPMENT_ACCESS_CODE: undefined,
    },
    () => {
      assert.deepEqual(getDevelopmentAccessBypassConfig(), {
        accessCode: null,
        enabled: false,
      });

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
        validatePublicRouteRequest(buildRequest("https://app.example.com"), "contact", {
          formData,
          identifiers: ["home@example.com"],
        }),
        { ok: true },
      );
      assert.deepEqual(
        validatePublicRouteRequest(buildRequest("https://app.example.com"), "contact", {
          formData,
          identifiers: ["home@example.com"],
        }),
        { ok: true },
      );
      assert.deepEqual(
        validatePublicRouteRequest(buildRequest("https://app.example.com"), "contact", {
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
      assert.deepEqual(
        validatePublicRouteRequest(signoutRequest, "signout", {
          identifiers: ["user-b"],
        }),
        { ok: true },
      );
    },
  );

  withEnv(
    {
      NODE_ENV: "development",
      ENABLE_DEVELOPMENT_ACCESS_BYPASS: "true",
      DEVELOPMENT_ACCESS_CODE: "letmein",
    },
    () => {
      assert.deepEqual(getDevelopmentAccessBypassConfig(), {
        accessCode: "letmein",
        enabled: true,
      });
    },
  );

  withEnv(
    {
      APP_URL: "https://app.example.com",
      NODE_ENV: "production",
      ENABLE_DEVELOPMENT_ACCESS_BYPASS: "true",
      DEVELOPMENT_ACCESS_CODE: "letmein",
    },
    () => {
      assert.throws(() => getDevelopmentAccessBypassConfig());
    },
  );

  const body = JSON.stringify({
    data: { id: "sub_123" },
    event_type: "subscription.created",
  });
  const secret = "pdl_secret";
  const nowMs = Date.now();
  const nowSeconds = Math.floor(nowMs / 1000);
  const validHeader = buildSignedPaddleHeader(body, secret, nowSeconds);

  assert.equal(
    verifyPaddleWebhookSignature(body, validHeader, secret, { nowMs }),
    true,
  );
  assert.equal(
    verifyPaddleWebhookSignature(body, validHeader, secret, {
      nowMs: nowMs + PADDLE_WEBHOOK_SIGNATURE_TOLERANCE_MS + 1_000,
    }),
    false,
  );
  assert.equal(
    verifyPaddleWebhookSignature(
      body,
      buildSignedPaddleHeader(body, "wrong-secret", nowSeconds),
      secret,
      { nowMs },
    ),
    false,
  );

  console.log("Security hardening checks passed.");
}

run();
