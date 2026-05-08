import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { getGoogleCalendarConfig } from "@/lib/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

let cachedKey: Buffer | null = null;

function getEncryptionKey(): Buffer {
  if (cachedKey) {
    return cachedKey;
  }

  const { tokenEncryptionKey } = getGoogleCalendarConfig();

  if (!tokenEncryptionKey) {
    throw new Error("Google Calendar token encryption key is not configured.");
  }

  const key = Buffer.from(tokenEncryptionKey, "hex");

  if (key.length !== 32) {
    throw new Error(
      "GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY must be a 64-character hex key (32 bytes).",
    );
  }

  cachedKey = key;
  return key;
}

export function encryptToken(plainToken: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([cipher.update(plainToken, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptToken(encryptedToken: string): string {
  const payload = Buffer.from(encryptedToken, "base64");

  if (payload.length <= IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error("Stored Google Calendar token payload is invalid.");
  }

  const iv = payload.subarray(0, IV_LENGTH);
  const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}
