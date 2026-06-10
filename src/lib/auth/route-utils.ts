import { Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";

import { resolveAuthOrigin } from "@/lib/origin";

export function resolveAuthOriginSafely(request: NextRequest): string {
  try {
    return resolveAuthOrigin(request);
  } catch (error) {
    console.error("[auth] falling back to request origin", error);
    return new URL(request.url).origin;
  }
}

export function isAuthSetupError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  );
}

export function logAuthRouteError(scope: string, error: unknown): void {
  console.error(`[auth:${scope}] request failed`, error);
}

export async function readAuthRequestData(request: NextRequest): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return request.json().catch(() => null);
  }

  const formData = await request.formData().catch(() => null);
  return formData ? Object.fromEntries(formData.entries()) : null;
}
