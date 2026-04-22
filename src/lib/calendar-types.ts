export const calendarCategoryOptions = ["care", "guests", "home", "school"] as const;

export type CalendarCategory = (typeof calendarCategoryOptions)[number];

export type CalendarEventTime =
  | Readonly<{ kind: "all-day" }>
  | Readonly<{ kind: "time"; value: string }>;

export type CalendarEventView = Readonly<{
  id: string;
  dateKey: string;
  name: string;
  category: CalendarCategory;
  time: CalendarEventTime;
  householdMemberIds: string[];
}>;

export type CalendarEventInput = Readonly<{
  dateKey: string;
  name: string;
  category: CalendarCategory;
  time: CalendarEventTime;
  householdMemberIds: string[];
}>;

export type CalendarMemberOption = Readonly<{
  id: string;
  name: string | null;
  email: string | null;
  color: string;
  emoji: string | null;
}>;
