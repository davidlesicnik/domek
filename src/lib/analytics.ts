export type AnalyticsEventName =
  | "calendar_plan_added"
  | "expense_added"
  | "list_created"
  | "list_item_added"
  | "list_item_checked"
  | "login_started"
  | "note_created";

export type AnalyticsEventParams = Record<string, boolean | number | string | null | undefined>;

declare global {
  interface Window {
    umami?: {
      track: (eventName: string, eventParams?: AnalyticsEventParams) => void;
    };
  }
}

export function trackAnalyticsEvent(
  eventName: AnalyticsEventName,
  eventParams: AnalyticsEventParams = {},
) {
  if (typeof window === "undefined") {
    return;
  }

  window.umami?.track(eventName, eventParams);
}
