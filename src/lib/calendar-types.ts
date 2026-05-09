export type CalendarEventTime =
  | Readonly<{ kind: "all-day" }>
  | Readonly<{ kind: "time"; value: string }>;

export type CalendarGroupView = Readonly<{
  id: string;
  color: string;
  name: string;
}>;

export type CalendarEventView = Readonly<{
  id: string;
  dateKey: string;
  groupColor: string;
  groupId: string;
  groupName: string;
  name: string;
  notificationOffsetMinutes: 10 | 60 | 1440 | null;
  time: CalendarEventTime;
  notificationOffsetMinutes: 10 | 60 | 1440 | null;
  householdMemberIds: string[];
}>;

export type CalendarEventInput = Readonly<{
  dateKey: string;
  groupId: string;
  name: string;
  notificationOffsetMinutes?: 10 | 60 | 1440 | null;
  time: CalendarEventTime;
  notificationOffsetMinutes: 10 | 60 | 1440 | null;
  householdMemberIds: string[];
}>;

export type CalendarMemberOption = Readonly<{
  id: string;
  name: string | null;
  email: string | null;
  color: string;
  emoji: string | null;
}>;
