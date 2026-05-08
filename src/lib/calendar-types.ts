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
  time: CalendarEventTime;
  householdMemberIds: string[];
  sourceProvider: string | null;
  sourceExternalId: string | null;
}>;

export type CalendarEventInput = Readonly<{
  dateKey: string;
  groupId: string;
  name: string;
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
