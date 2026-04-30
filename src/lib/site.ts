const DEFAULT_SITE_ORIGIN = "https://domekapp.com";

export function getSiteOrigin(): string {
  const appUrl = process.env.APP_URL?.trim();

  if (appUrl && URL.canParse(appUrl)) {
    return new URL(appUrl).origin;
  }

  return DEFAULT_SITE_ORIGIN;
}

export function getSiteUrl(pathname = "/"): string {
  return new URL(pathname, getSiteOrigin()).toString();
}
