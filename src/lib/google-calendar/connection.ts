import { prisma } from "@/lib/db";
import { getGoogleCalendarConfig } from "@/lib/env";
import { decryptToken, encryptToken } from "@/lib/google-calendar/crypto";

const GOOGLE_OAUTH_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const TOKEN_REFRESH_BUFFER_SECONDS = 5 * 60;

type TokenExchangeResponse = Readonly<{
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  id_token?: string;
}>;

function sanitizeScope(scope: string | undefined): string {
  return scope?.trim() || "https://www.googleapis.com/auth/calendar";
}

function computeTokenExpiry(expiresInSeconds: number): Date {
  return new Date(Date.now() + Math.max(expiresInSeconds, 60) * 1000);
}

async function requestGoogleOAuthToken(params: URLSearchParams): Promise<TokenExchangeResponse> {
  const response = await fetch(GOOGLE_OAUTH_TOKEN_ENDPOINT, {
    body: params,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });

  const body = (await response.json()) as TokenExchangeResponse & { error?: string; error_description?: string };

  if (!response.ok || !body.access_token) {
    const description = body.error_description ?? body.error ?? "Google token request failed.";
    throw new Error(description);
  }

  return body;
}

export function isGoogleCalendarEnabled(): boolean {
  return getGoogleCalendarConfig().enabled;
}

export async function upsertGoogleCalendarConnection(input: {
  code: string;
  householdId: string;
  redirectUri: string;
  userId: string;
}) {
  const { clientId, clientSecret } = getGoogleCalendarConfig();

  if (!clientId || !clientSecret) {
    throw new Error("Google Calendar OAuth client is not configured.");
  }

  const tokenResponse = await requestGoogleOAuthToken(
    new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: input.code,
      grant_type: "authorization_code",
      redirect_uri: input.redirectUri,
    }),
  );

  const accessToken = tokenResponse.access_token;
  const refreshToken = tokenResponse.refresh_token;

  if (!refreshToken) {
    throw new Error("Google did not return a refresh token. Reconnect and grant offline access.");
  }

  return prisma.googleCalendarConnection.upsert({
    create: {
      encryptedAccessToken: encryptToken(accessToken),
      encryptedRefreshToken: encryptToken(refreshToken),
      googleAccountId: null,
      googleEmail: null,
      householdId: input.householdId,
      scope: sanitizeScope(tokenResponse.scope),
      tokenExpiresAt: computeTokenExpiry(tokenResponse.expires_in),
      userId: input.userId,
    },
    select: {
      createdAt: true,
      googleEmail: true,
      id: true,
      scope: true,
      tokenExpiresAt: true,
      updatedAt: true,
    },
    update: {
      encryptedAccessToken: encryptToken(accessToken),
      encryptedRefreshToken: encryptToken(refreshToken),
      scope: sanitizeScope(tokenResponse.scope),
      tokenExpiresAt: computeTokenExpiry(tokenResponse.expires_in),
      userId: input.userId,
    },
    where: {
      householdId: input.householdId,
    },
  });
}

async function refreshConnectionAccessToken(connectionId: string, encryptedRefreshToken: string) {
  const { clientId, clientSecret } = getGoogleCalendarConfig();

  if (!clientId || !clientSecret) {
    throw new Error("Google Calendar OAuth client is not configured.");
  }

  const refreshToken = decryptToken(encryptedRefreshToken);
  const tokenResponse = await requestGoogleOAuthToken(
    new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  );

  const encryptedAccessToken = encryptToken(tokenResponse.access_token);
  const encryptedRefreshTokenToStore = tokenResponse.refresh_token
    ? encryptToken(tokenResponse.refresh_token)
    : encryptedRefreshToken;

  const updated = await prisma.googleCalendarConnection.update({
    data: {
      encryptedAccessToken,
      encryptedRefreshToken: encryptedRefreshTokenToStore,
      scope: sanitizeScope(tokenResponse.scope),
      tokenExpiresAt: computeTokenExpiry(tokenResponse.expires_in),
    },
    where: { id: connectionId },
  });

  return decryptToken(updated.encryptedAccessToken);
}

function needsRefresh(tokenExpiresAt: Date): boolean {
  const secondsUntilExpiry = (tokenExpiresAt.getTime() - Date.now()) / 1000;
  return secondsUntilExpiry <= TOKEN_REFRESH_BUFFER_SECONDS;
}

export async function getAccessTokenForHousehold(householdId: string): Promise<string | null> {
  const connection = await prisma.googleCalendarConnection.findUnique({
    select: {
      encryptedAccessToken: true,
      encryptedRefreshToken: true,
      id: true,
      tokenExpiresAt: true,
    },
    where: { householdId },
  });

  if (!connection) {
    return null;
  }

  if (!needsRefresh(connection.tokenExpiresAt)) {
    return decryptToken(connection.encryptedAccessToken);
  }

  return refreshConnectionAccessToken(connection.id, connection.encryptedRefreshToken);
}

export async function getGoogleCalendarConnection(householdId: string) {
  return prisma.googleCalendarConnection.findUnique({
    select: {
      createdAt: true,
      googleEmail: true,
      id: true,
      scope: true,
      tokenExpiresAt: true,
      updatedAt: true,
      userId: true,
    },
    where: { householdId },
  });
}

export async function deleteGoogleCalendarConnection(householdId: string) {
  const existing = await prisma.googleCalendarConnection.findUnique({
    select: { id: true },
    where: { householdId },
  });

  if (!existing) {
    return false;
  }

  await prisma.googleCalendarConnection.delete({ where: { householdId } });
  return true;
}
