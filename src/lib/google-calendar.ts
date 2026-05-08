import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { prisma } from "@/lib/db";
import { getAppRuntimeConfig } from "@/lib/env";

export const GOOGLE_CALENDAR_PROVIDER = "google_calendar";

const GOOGLE_OAUTH_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.readonly",
] as const;

type GoogleOAuthConfig = Readonly<{
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  tokenEncryptionKey: string;
}>;

type GoogleTokenResponse = Readonly<{
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
}>;

type GoogleUserInfo = Readonly<{
  id: string;
  email: string;
}>;

type GoogleCalendarListEntry = Readonly<{
  id: string;
  summary?: string;
  primary?: boolean;
}>;

type GoogleCalendarEventItem = Readonly<{
  id: string;
  status?: string;
  summary?: string;
  updated?: string;
  start?: { date?: string; dateTime?: string };
}>;

export function getOptionalGoogleOAuthConfig(): GoogleOAuthConfig | null {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim();
  const tokenEncryptionKey = process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY?.trim();

  if (!clientId || !clientSecret || !tokenEncryptionKey) {
    return null;
  }

  const origin = getAppRuntimeConfig().appUrl ?? "http://localhost:3000";

  return {
    clientId,
    clientSecret,
    redirectUri: `${origin}/api/google-calendar/callback`,
    tokenEncryptionKey,
  };
}

function getGoogleOAuthConfig(): GoogleOAuthConfig {
  const optionalConfig = getOptionalGoogleOAuthConfig();

  if (!optionalConfig) {
    throw new Error(
      "Google Calendar OAuth is not configured. Set GOOGLE_CALENDAR_CLIENT_ID, GOOGLE_CALENDAR_CLIENT_SECRET, and GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY.",
    );
  }

  return optionalConfig;
}

function toCipherKey(rawKey: string): Buffer {
  const key = Buffer.from(rawKey, "base64");

  if (key.length !== 32) {
    throw new Error("GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  }

  return key;
}

function encryptSecret(secret: string, rawKey: string): string {
  const iv = randomBytes(12);
  const key = toCipherKey(rawKey);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

function decryptSecret(payload: string, rawKey: string): string {
  const decoded = Buffer.from(payload, "base64");
  const iv = decoded.subarray(0, 12);
  const authTag = decoded.subarray(12, 28);
  const encrypted = decoded.subarray(28);
  const key = toCipherKey(rawKey);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

async function exchangeToken(params: URLSearchParams): Promise<GoogleTokenResponse> {
  getGoogleOAuthConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    body: params,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Google OAuth token exchange failed with status ${response.status}.`);
  }

  return (await response.json()) as GoogleTokenResponse;
}

export function createGoogleOAuthUrl(state: string): string {
  const config = getGoogleOAuthConfig();
  const params = new URLSearchParams({
    access_type: "offline",
    client_id: config.clientId,
    include_granted_scopes: "true",
    prompt: "consent",
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: GOOGLE_OAUTH_SCOPES.join(" "),
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCodeForTokens(code: string): Promise<GoogleTokenResponse> {
  const config = getGoogleOAuthConfig();

  return await exchangeToken(
    new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: config.redirectUri,
    }),
  );
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const config = getGoogleOAuthConfig();

  return await exchangeToken(
    new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  );
}

export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Google userinfo request failed with status ${response.status}.`);
  }

  const data = (await response.json()) as Partial<GoogleUserInfo>;

  if (!data.id || !data.email) {
    throw new Error("Google user info response was missing id or email.");
  }

  return { email: data.email, id: data.id };
}

export async function fetchGoogleCalendars(accessToken: string): Promise<GoogleCalendarListEntry[]> {
  const response = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Google calendar list request failed with status ${response.status}.`);
  }

  const data = (await response.json()) as { items?: GoogleCalendarListEntry[] };

  return data.items ?? [];
}

export async function saveGoogleCalendarConnection(params: {
  userId: string;
  householdId: string;
  userInfo: GoogleUserInfo;
  tokens: GoogleTokenResponse;
}) {
  const config = getGoogleOAuthConfig();
  const existing = await prisma.googleCalendarConnection.findUnique({
    where: { userId: params.userId },
  });

  const refreshToken = params.tokens.refresh_token
    ? params.tokens.refresh_token
    : existing
      ? decryptSecret(existing.refreshTokenEncrypted, config.tokenEncryptionKey)
      : null;

  if (!refreshToken) {
    throw new Error("Google OAuth response did not include a refresh token.");
  }

  return await prisma.googleCalendarConnection.upsert({
    create: {
      googleEmail: params.userInfo.email,
      googleUserId: params.userInfo.id,
      householdId: params.householdId,
      refreshTokenEncrypted: encryptSecret(refreshToken, config.tokenEncryptionKey),
      tokenScope: params.tokens.scope ?? GOOGLE_OAUTH_SCOPES.join(" "),
      userId: params.userId,
    },
    update: {
      googleEmail: params.userInfo.email,
      googleUserId: params.userInfo.id,
      householdId: params.householdId,
      refreshTokenEncrypted: encryptSecret(refreshToken, config.tokenEncryptionKey),
      tokenScope: params.tokens.scope ?? existing?.tokenScope ?? GOOGLE_OAUTH_SCOPES.join(" "),
    },
    where: { userId: params.userId },
  });
}

function deriveDateKey(item: GoogleCalendarEventItem): string | null {
  const date = item.start?.date ?? item.start?.dateTime;

  if (!date) {
    return null;
  }

  return date.slice(0, 10);
}

function deriveTime(item: GoogleCalendarEventItem): { allDay: boolean; time: string | null } {
  if (item.start?.date) {
    return { allDay: true, time: null };
  }

  if (!item.start?.dateTime) {
    return { allDay: true, time: null };
  }

  const date = new Date(item.start.dateTime);
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");

  return { allDay: false, time: `${hours}:${minutes}` };
}

export async function syncGoogleCalendarForUser(params: {
  userId: string;
  householdId: string;
}): Promise<{ imported: number }> {
  const config = getGoogleOAuthConfig();
  const connection = await prisma.googleCalendarConnection.findUnique({
    where: { userId: params.userId },
  });

  if (!connection || connection.householdId !== params.householdId || !connection.syncEnabled) {
    return { imported: 0 };
  }

  const refreshToken = decryptSecret(connection.refreshTokenEncrypted, config.tokenEncryptionKey);
  const token = await refreshGoogleAccessToken(refreshToken);

  if (!token.access_token) {
    throw new Error("Google refresh token response did not include an access token.");
  }

  const calendars = await fetchGoogleCalendars(token.access_token);
  const selectedCalendar =
    calendars.find((calendar) => calendar.id === connection.selectedCalendarId) ??
    calendars.find((calendar) => calendar.primary) ??
    calendars[0];

  if (!selectedCalendar) {
    await prisma.googleCalendarConnection.update({
      data: {
        lastSyncError: "No calendars available on the connected Google account.",
      },
      where: { id: connection.id },
    });

    return { imported: 0 };
  }

  const now = new Date();
  const timeMin = new Date(now);
  timeMin.setDate(timeMin.getDate() - 30);

  const timeMax = new Date(now);
  timeMax.setDate(timeMax.getDate() + 180);

  const eventResponse = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(selectedCalendar.id)}/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(timeMin.toISOString())}&timeMax=${encodeURIComponent(timeMax.toISOString())}`,
    {
      headers: { Authorization: `Bearer ${token.access_token}` },
    },
  );

  if (!eventResponse.ok) {
    throw new Error(`Google calendar events request failed with status ${eventResponse.status}.`);
  }

  const payload = (await eventResponse.json()) as { items?: GoogleCalendarEventItem[] };
  const events = payload.items ?? [];

  const group = await prisma.calendarGroup.upsert({
    create: {
      color: "#8b918c",
      createdByUserId: params.userId,
      householdId: params.householdId,
      name: "Google Calendar",
    },
    update: {},
    where: {
      householdId_name: {
        householdId: params.householdId,
        name: "Google Calendar",
      },
    },
  });

  let imported = 0;

  for (const item of events) {
    if (!item.id || item.status === "cancelled") {
      continue;
    }

    const dateKey = deriveDateKey(item);

    if (!dateKey) {
      continue;
    }

    const { allDay, time } = deriveTime(item);

    await prisma.calendarEvent.upsert({
      create: {
        allDay,
        createdByUserId: params.userId,
        dateKey,
        groupId: group.id,
        householdId: params.householdId,
        householdMemberIds: [],
        name: item.summary?.trim() || "Untitled event",
        sourceExternalId: item.id,
        sourceProvider: GOOGLE_CALENDAR_PROVIDER,
        sourceUpdatedAt: item.updated ? new Date(item.updated) : null,
        time,
      },
      update: {
        allDay,
        dateKey,
        groupId: group.id,
        name: item.summary?.trim() || "Untitled event",
        sourceUpdatedAt: item.updated ? new Date(item.updated) : null,
        time,
      },
      where: {
        householdId_sourceProvider_sourceExternalId: {
          householdId: params.householdId,
          sourceExternalId: item.id,
          sourceProvider: GOOGLE_CALENDAR_PROVIDER,
        },
      },
    });

    imported += 1;
  }

  await prisma.googleCalendarConnection.update({
    data: {
      lastSyncError: null,
      lastSyncedAt: new Date(),
      selectedCalendarId: selectedCalendar.id,
      selectedCalendarName: selectedCalendar.summary ?? selectedCalendar.id,
    },
    where: { id: connection.id },
  });

  return { imported };
}

export async function disconnectGoogleCalendarConnection(userId: string) {
  await prisma.googleCalendarConnection.deleteMany({ where: { userId } });
}

export function createGoogleOAuthState(): string {
  return randomBytes(24).toString("hex");
}
