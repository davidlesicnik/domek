import { createHash, randomBytes } from "node:crypto";

import { cookies } from "next/headers";

import { prisma } from "@/lib/db";

export const SESSION_COOKIE_NAME = "domek_session";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function parseCookieHeader(cookieHeader: string | null): Map<string, string> {
  const values = new Map<string, string>();

  if (!cookieHeader) {
    return values;
  }

  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    const separator = trimmed.indexOf("=");

    if (separator <= 0) {
      continue;
    }

    values.set(trimmed.slice(0, separator), trimmed.slice(separator + 1));
  }

  return values;
}

function cookieOptions(expiresAt?: Date) {
  return {
    expires: expiresAt,
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.userSession.create({
    data: {
      expiresAt,
      sessionTokenHash: hashToken(token),
      userId,
    },
  });

  return { expiresAt, token };
}

export async function writeSessionCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, cookieOptions(expiresAt));
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", cookieOptions(new Date(0)));
}

export function setSessionCookieOnResponse(
  response: Response,
  token: string,
  expiresAt: Date,
): void {
  const opts = cookieOptions(expiresAt);
  const parts = [
    `${SESSION_COOKIE_NAME}=${token}`,
    `Path=${opts.path}`,
    `Expires=${opts.expires!.toUTCString()}`,
    "HttpOnly",
    `SameSite=${opts.sameSite}`,
    ...(opts.secure ? ["Secure"] : []),
  ];
  response.headers.append("Set-Cookie", parts.join("; "));
}

export function clearSessionCookieOnResponse(response: Response): void {
  const opts = cookieOptions(new Date(0));
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    `Path=${opts.path}`,
    `Expires=${opts.expires!.toUTCString()}`,
    "HttpOnly",
    `SameSite=${opts.sameSite}`,
    ...(opts.secure ? ["Secure"] : []),
  ];
  response.headers.append("Set-Cookie", parts.join("; "));
}

export async function readSessionToken(request?: Request): Promise<string | null> {
  if (request) {
    return parseCookieHeader(request.headers.get("cookie")).get(SESSION_COOKIE_NAME) ?? null;
  }

  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export async function invalidateSession(
  token: string | null | undefined,
  response?: Response,
) {
  if (token) {
    await prisma.userSession.deleteMany({
      where: { sessionTokenHash: hashToken(token) },
    });
  }

  if (response) {
    clearSessionCookieOnResponse(response);
  } else {
    await clearSessionCookie();
  }
}

export async function getSessionRecord(token: string | null | undefined) {
  if (!token) {
    return null;
  }

  return prisma.userSession.findFirst({
    select: {
      expiresAt: true,
      id: true,
      user: {
        select: {
          deletedAt: true,
          email: true,
          id: true,
          image: true,
          name: true,
          themePreference: true,
        },
      },
      userId: true,
    },
    where: {
      expiresAt: { gt: new Date() },
      sessionTokenHash: hashToken(token),
    },
  });
}
