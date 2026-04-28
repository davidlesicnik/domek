import { stripLocalePrefix } from "@/i18n/routing";

function isSafeRelativePath(value: string | null | undefined): value is string {
  return Boolean(value && value.startsWith("/") && !value.startsWith("//"));
}

type SanitizeNextOptions = {
  blockedPrefixes: readonly string[];
  fallback: string;
  rejectOAuthCodeParam?: boolean;
};

function sanitizeNextPath(value: string | null | undefined, options: SanitizeNextOptions): string {
  if (!isSafeRelativePath(value)) {
    return options.fallback;
  }

  const pathWithoutLocale = stripLocalePrefix(value);

  if (options.blockedPrefixes.some((prefix) => pathWithoutLocale.startsWith(prefix))) {
    return options.fallback;
  }

  if (options.rejectOAuthCodeParam && value.includes("code=")) {
    return options.fallback;
  }

  return value;
}

export function sanitizeAuthStartNextPath(value: string | null | undefined): string {
  return sanitizeNextPath(value, {
    blockedPrefixes: ["/login", "/auth/callback", "/auth/start"],
    fallback: "/",
    rejectOAuthCodeParam: true,
  });
}

export function sanitizeAuthCallbackNextPath(value: string | null | undefined): string {
  return sanitizeNextPath(value, {
    blockedPrefixes: ["/login", "/auth/callback", "/auth/start"],
    fallback: "/app",
    rejectOAuthCodeParam: true,
  });
}
