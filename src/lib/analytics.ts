export type AnalyticsEventName =
  | "calendar_plan_added"
  | "expense_added"
  | "list_created"
  | "list_item_added"
  | "list_item_checked"
  | "login_started"
  | "note_created";

export type AnalyticsEventParams = Record<string, boolean | number | string | null | undefined>;

type GtagCommand =
  | ["config", string, AnalyticsEventParams?]
  | ["event", AnalyticsEventName | "page_view", AnalyticsEventParams?]
  | ["js", Date];

declare global {
  interface Window {
    dataLayer?: GtagCommand[];
    gtag?: (...args: GtagCommand) => void;
  }
}

export function trackAnalyticsEvent(
  eventName: AnalyticsEventName,
  eventParams: AnalyticsEventParams = {},
) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", eventName, eventParams);
}
