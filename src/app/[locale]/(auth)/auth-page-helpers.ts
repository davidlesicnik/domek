import { stripLocalePrefix } from "@/i18n/routing";

export function stringParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/app";
  }

  const stripped = stripLocalePrefix(value);
  if (
    stripped.startsWith("/login") ||
    stripped.startsWith("/register") ||
    stripped.startsWith("/forgot-password") ||
    stripped.startsWith("/reset-password")
  ) {
    return "/app";
  }

  return value;
}
