const LOCALHOST_ORIGIN = "http://localhost:3000";

export function getSiteOrigin(): string {
  const appUrl = process.env.APP_URL?.trim();

  if (appUrl && URL.canParse(appUrl)) {
    return new URL(appUrl).origin;
  }

  return LOCALHOST_ORIGIN;
}

export function getSiteUrl(pathname = "/"): string {
  return new URL(pathname, getSiteOrigin()).toString();
}
