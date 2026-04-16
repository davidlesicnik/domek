export type AnalyticsEventName =
  | "calendar_plan_added"
  | "expense_added"
  | "list_created"
  | "list_item_added"
  | "list_item_checked"
  | "login_started"
  | "note_created";

export type AnalyticsEventParams = Record<string, boolean | number | string | null | undefined>;
export type CookieConsentValue = "accepted" | "rejected";

type GtagCommand =
  | ["config", string, AnalyticsEventParams?]
  | ["event", AnalyticsEventName | "page_view", AnalyticsEventParams?]
  | ["js", Date];

export const cookieConsentChangedEvent = "domek:cookie-consent-changed";
const cookieConsentName = "domek_cookie_consent";
const cookieConsentMaxAgeSeconds = 60 * 60 * 24 * 180;

declare global {
  interface Window {
    dataLayer?: GtagCommand[];
    gtag?: (...args: GtagCommand) => void;
  }
}

export function hasCookieConsent() {
  return readCookieConsent() === "accepted";
}

export function disableAnalytics() {
  if (typeof window === "undefined") {
    return;
  }

  window.gtag = undefined;
  window.dataLayer = [];
}

export function readCookieConsent(): CookieConsentValue | null {
  if (typeof document === "undefined") {
    return null;
  }

  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${cookieConsentName}=`));
  const value = cookie?.split("=")[1];

  return value === "accepted" || value === "rejected" ? value : null;
}

export function writeCookieConsent(value: CookieConsentValue) {
  if (typeof document === "undefined") {
    return;
  }

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${cookieConsentName}=${value}; Path=/; Max-Age=${cookieConsentMaxAgeSeconds}; SameSite=Lax${secure}`;
  if (value === "rejected") {
    disableAnalytics();
  }
  window.dispatchEvent(new Event(cookieConsentChangedEvent));
}

export function trackAnalyticsEvent(
  eventName: AnalyticsEventName,
  eventParams: AnalyticsEventParams = {},
) {
  if (
    typeof window === "undefined" ||
    !hasCookieConsent() ||
    typeof window.gtag !== "function"
  ) {
    return;
  }

  window.gtag("event", eventName, eventParams);
}
