import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { getGoogleCalendarConfig } from "@/lib/env";

const STATE_MAX_AGE_SECONDS = 10 * 60;

type StatePayload = Readonly<{
  nextPath: string;
  householdId: string;
  userId: string;
  nonce: string;
  issuedAt: number;
}>;

function getSigningSecret(): string {
  const { tokenEncryptionKey } = getGoogleCalendarConfig();

  if (!tokenEncryptionKey) {
    throw new Error("Google Calendar OAuth signing secret is not configured.");
  }

  return tokenEncryptionKey;
}

function sign(payload: string): string {
  return createHmac("sha256", getSigningSecret()).update(payload).digest("base64url");
}

export function createOAuthState(input: {
  householdId: string;
  userId: string;
  nextPath: string;
}): string {
  const payload: StatePayload = {
    householdId: input.householdId,
    issuedAt: Math.floor(Date.now() / 1000),
    nextPath: input.nextPath,
    nonce: randomBytes(12).toString("base64url"),
    userId: input.userId,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = sign(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifyOAuthState(state: string): StatePayload {
  const [encodedPayload, signature] = state.split(".");

  if (!encodedPayload || !signature) {
    throw new Error("Invalid OAuth state payload.");
  }

  const expectedSignature = sign(encodedPayload);
  const providedSignature = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (providedSignature.length !== expectedSignatureBuffer.length) {
    throw new Error("Invalid OAuth state signature.");
  }

  const valid = timingSafeEqual(providedSignature, expectedSignatureBuffer);

  if (!valid) {
    throw new Error("Invalid OAuth state signature.");
  }

  const parsed = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as StatePayload;

  if (!parsed.issuedAt || !parsed.householdId || !parsed.userId || !parsed.nextPath) {
    throw new Error("Invalid OAuth state payload.");
  }

  const now = Math.floor(Date.now() / 1000);

  if (now - parsed.issuedAt > STATE_MAX_AGE_SECONDS) {
    throw new Error("OAuth state has expired.");
  }

  return parsed;
}
