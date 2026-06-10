export type AnalyticsEventName =
  | "calendar_plan_added"
  | "expense_added"
  | "list_created"
  | "list_item_added"
  | "list_item_checked"
  | "login_started"
  | "note_created";

export type AnalyticsEventParams = Record<string, boolean | number | string | null | undefined>;

export function trackAnalyticsEvent(
  _eventName: AnalyticsEventName,
  _eventParams: AnalyticsEventParams = {},
) {
  void _eventName;
  void _eventParams;
  return;
}
