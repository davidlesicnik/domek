import type { CalendarEventCategory, Prisma } from "@prisma/client";

import type { CalendarEventView, CalendarMemberOption } from "@/lib/calendar-types";
import type { ExpenseScope, ExpenseView, MonthStats } from "@/lib/expenses";
import { getMonthStats, listExpenses } from "@/lib/expenses";
import type { ChoreScope, ChoreView } from "@/lib/chores";
import { listChores } from "@/lib/chores";
import { prisma } from "@/lib/db";
import { getFirstHouseholdMembership } from "@/lib/users";

export type DashboardMember = Readonly<{
  color: string;
  email: string | null;
  emoji: string | null;
  id: string;
  name: string | null;
}>;

export type DashboardActionSummary = Readonly<{
  calendarThisWeek: number;
  overdueChores: number;
  todosThisWeek: number;
}>;

export type DashboardAgendaSource = "calendar" | "chore" | "todo";

export type DashboardAgendaItem = Readonly<{
  dateKey: string;
  href: string;
  id: string;
  member: DashboardMember | null;
  source: DashboardAgendaSource;
  sourceDetail: string | null;
  timeLabel: string | null;
  title: string;
}>;

export type DashboardAgendaDay = Readonly<{
  dateKey: string;
  items: DashboardAgendaItem[];
}>;

export type DashboardMonthCellCounts = Readonly<{
  calendar: number;
  chore: number;
  todo: number;
  total: number;
}>;

export type DashboardExpenseEntry = Readonly<{
  amount: number;
  categoryColor: string | null;
  categoryName: string | null;
  date: string;
  householdMemberColor: string | null;
  householdMemberEmoji: string | null;
  householdMemberName: string | null;
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
}>;

export type DashboardExpenseSnapshot = Readonly<{
  entries: DashboardExpenseEntry[];
  monthLabel: string;
  stats: MonthStats;
}>;

export type DashboardData = Readonly<{
  actionSummary: DashboardActionSummary;
  agendaDays: DashboardAgendaDay[];
  calendarEvents: CalendarEventView[];
  calendarMembers: CalendarMemberOption[];
  expenseSnapshot: DashboardExpenseSnapshot;
  members: DashboardMember[];
  monthItemCountsByDate: Record<string, DashboardMonthCellCounts>;
  nonCalendarItemsByDate: Record<string, DashboardAgendaItem[]>;
  todayKey: string;
}>;

type DashboardCalendarEvent = Prisma.CalendarEventGetPayload<{
  select: typeof dashboardCalendarEventSelect;
}>;

type DashboardTodoItem = Prisma.TodoItemGetPayload<{
  select: typeof dashboardTodoItemSelect;
}>;

const dashboardCalendarEventSelect = {
  allDay: true,
  category: true,
  dateKey: true,
  householdMemberIds: true,
  id: true,
  name: true,
  time: true,
} satisfies Prisma.CalendarEventSelect;

const dashboardTodoItemSelect = {
  assignedHouseholdMember: {
    select: {
      color: true,
      emoji: true,
      id: true,
      name: true,
      account: {
        select: {
          email: true,
        },
      },
    },
  },
  dueDate: true,
  id: true,
  list: {
    select: {
      name: true,
    },
  },
  text: true,
} satisfies Prisma.TodoItemSelect;

const calendarCategoryLabels: Record<CalendarEventCategory, string> = {
  CARE: "Care",
  GUESTS: "Guests",
  HOME: "Home",
  SCHOOL: "School",
};

const dashboardCalendarCategoryToCalendar = {
  CARE: "care",
  GUESTS: "guests",
  HOME: "home",
  SCHOOL: "school",
} as const satisfies Record<CalendarEventCategory, CalendarEventView["category"]>;

const agendaSourceOrder: Record<DashboardAgendaSource, number> = {
  calendar: 0,
  chore: 1,
  todo: 2,
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

function currentMonthLabel(dateKey: string) {
  const [year, month] = dateKey.split("-").map(Number);

  return new Intl.DateTimeFormat("en", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function isWithinRange(dateKey: string, startKey: string, endKey: string) {
  return dateKey >= startKey && dateKey <= endKey;
}

function buildMember(member: {
  color: string;
  emoji: string | null;
  id: string;
  name: string | null;
  account: { email: string | null } | null;
}): DashboardMember {
  return {
    color: member.color,
    email: member.account?.email ?? null,
    emoji: member.emoji,
    id: member.id,
    name: member.name,
  };
}

function toCalendarMemberOption(member: DashboardMember): CalendarMemberOption {
  return {
    color: member.color,
    email: member.email,
    emoji: member.emoji,
    id: member.id,
    name: member.name,
  };
}

function toCalendarEventView(calendarEvent: DashboardCalendarEvent): CalendarEventView {
  return {
    category: dashboardCalendarCategoryToCalendar[calendarEvent.category],
    dateKey: calendarEvent.dateKey,
    householdMemberIds: calendarEvent.householdMemberIds,
    id: calendarEvent.id,
    name: calendarEvent.name,
    time: calendarEvent.allDay
      ? { kind: "all-day" }
      : { kind: "time", value: calendarEvent.time ?? "00:00" },
  };
}

function choreSourceDetail(chore: ChoreView) {
  if (chore.assignmentType === "FIXED" && chore.assignedHouseholdMemberName) {
    return `Assigned to ${chore.assignedHouseholdMemberName}`;
  }

  if (chore.assignmentType === "ROTATING" && chore.assignedHouseholdMemberName) {
    return `Next: ${chore.assignedHouseholdMemberName}`;
  }

  if (chore.assignmentType === "ROTATING") {
    return "Rotating";
  }

  if (chore.categoryName) {
    return chore.categoryName;
  }

  return "House chore";
}

function calendarAgendaItem(
  calendarEvent: DashboardCalendarEvent,
  membersById: Map<string, DashboardMember>,
): DashboardAgendaItem {
  const firstAssignedMember = calendarEvent.householdMemberIds[0]
    ? membersById.get(calendarEvent.householdMemberIds[0]) ?? null
    : null;

  return {
    dateKey: calendarEvent.dateKey,
    href: "/app#home-calendar",
    id: calendarEvent.id,
    member: firstAssignedMember,
    source: "calendar",
    sourceDetail: calendarCategoryLabels[calendarEvent.category],
    timeLabel: calendarEvent.allDay ? "All day" : calendarEvent.time ?? "00:00",
    title: calendarEvent.name,
  };
}

function choreAgendaItem(chore: ChoreView): DashboardAgendaItem {
  const member =
    chore.assignedHouseholdMemberName && chore.assignedHouseholdMemberColor
      ? {
          color: chore.assignedHouseholdMemberColor,
          email: null,
          emoji: chore.assignedHouseholdMemberEmoji,
          id: chore.assignedHouseholdMemberId ?? `${chore.id}-assignee`,
          name: chore.assignedHouseholdMemberName,
        }
      : null;

  return {
    dateKey: chore.nextDueAt.slice(0, 10),
    href: "/app/chores",
    id: chore.id,
    member,
    source: "chore",
    sourceDetail: choreSourceDetail(chore),
    timeLabel: null,
    title: chore.name,
  };
}

function todoAgendaItem(todo: DashboardTodoItem): DashboardAgendaItem {
  const member = todo.assignedHouseholdMember ? buildMember(todo.assignedHouseholdMember) : null;

  return {
    dateKey: todo.dueDate?.toISOString().slice(0, 10) ?? todayKey(),
    href: "/app/todos",
    id: todo.id,
    member,
    source: "todo",
    sourceDetail: todo.list.name,
    timeLabel: null,
    title: todo.text,
  };
}

function sortAgendaItems(a: DashboardAgendaItem, b: DashboardAgendaItem) {
  const dateCompare = a.dateKey.localeCompare(b.dateKey);

  if (dateCompare !== 0) {
    return dateCompare;
  }

  const sourceCompare = agendaSourceOrder[a.source] - agendaSourceOrder[b.source];

  if (sourceCompare !== 0) {
    return sourceCompare;
  }

  if (a.source === "calendar" && b.source === "calendar") {
    if (a.timeLabel === "All day" && b.timeLabel !== "All day") return -1;
    if (a.timeLabel !== "All day" && b.timeLabel === "All day") return 1;
    const timeCompare = (a.timeLabel ?? "").localeCompare(b.timeLabel ?? "");

    if (timeCompare !== 0) {
      return timeCompare;
    }
  }

  return a.title.localeCompare(b.title);
}

function groupAgendaItems(items: DashboardAgendaItem[]): DashboardAgendaDay[] {
  const itemsByDate = items.reduce<Record<string, DashboardAgendaItem[]>>((result, item) => {
    return {
      ...result,
      [item.dateKey]: [...(result[item.dateKey] ?? []), item],
    };
  }, {});

  return Object.keys(itemsByDate)
    .sort((a, b) => a.localeCompare(b))
    .map((dateKey) => ({
      dateKey,
      items: [...(itemsByDate[dateKey] ?? [])].sort(sortAgendaItems),
    }));
}

function groupItemsByDateRecord(items: DashboardAgendaItem[]) {
  return items.reduce<Record<string, DashboardAgendaItem[]>>((result, item) => {
    return {
      ...result,
      [item.dateKey]: [...(result[item.dateKey] ?? []), item].sort(sortAgendaItems),
    };
  }, {});
}

function incrementMonthCount(
  monthItemCountsByDate: Record<string, DashboardMonthCellCounts>,
  dateKey: string,
  source: DashboardAgendaSource,
) {
  const current = monthItemCountsByDate[dateKey] ?? {
    calendar: 0,
    chore: 0,
    todo: 0,
    total: 0,
  };

  monthItemCountsByDate[dateKey] = {
    ...current,
    [source]: current[source] + 1,
    total: current.total + 1,
  };
}

function toExpenseEntry(expense: ExpenseView): DashboardExpenseEntry {
  return {
    amount: expense.amount,
    categoryColor: expense.categoryColor,
    categoryName: expense.categoryName,
    date: expense.date,
    householdMemberColor: expense.householdMemberColor,
    householdMemberEmoji: expense.householdMemberEmoji,
    householdMemberName: expense.householdMemberName,
    id: expense.id,
    name: expense.name,
    type: expense.type,
  };
}

export async function getDashboardData(userId: string): Promise<DashboardData | null> {
  const membership = await getFirstHouseholdMembership(userId);

  if (!membership?.householdId) {
    return null;
  }

  const householdId = membership.householdId;
  const currentDayKey = todayKey();
  const agendaEndKey = addDays(currentDayKey, 6);
  const expenseScope: ExpenseScope = { householdId, userId };
  const choreScope: ChoreScope = { householdId, userId };

  const [members, calendarEvents, todos, chores, expenseStats, monthlyExpenses] = await Promise.all([
    prisma.householdMember.findMany({
      orderBy: [{ name: "asc" }, { createdAt: "asc" }],
      select: {
        color: true,
        emoji: true,
        id: true,
        name: true,
        account: {
          select: {
            email: true,
          },
        },
      },
      where: { householdId },
    }),
    prisma.calendarEvent.findMany({
      orderBy: [{ dateKey: "asc" }, { allDay: "desc" }, { time: "asc" }, { createdAt: "asc" }],
      select: dashboardCalendarEventSelect,
      where: { householdId },
    }),
    prisma.todoItem.findMany({
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      select: dashboardTodoItemSelect,
      where: {
        done: false,
        dueDate: { not: null },
        list: {
          householdId,
        },
      },
    }),
    listChores(choreScope),
    getMonthStats(
      expenseScope,
      new Date().getUTCFullYear(),
      new Date().getUTCMonth() + 1,
    ),
    listExpenses(
      expenseScope,
      new Date().getUTCFullYear(),
      new Date().getUTCMonth() + 1,
    ),
  ]);

  const dashboardMembers = members.map(buildMember);
  const membersById = new Map(dashboardMembers.map((member) => [member.id, member]));
  const monthItemCountsByDate: Record<string, DashboardMonthCellCounts> = {};
  const allChoreItems = chores.map(choreAgendaItem);
  const allTodoItems = todos.map(todoAgendaItem);

  for (const calendarEvent of calendarEvents) {
    incrementMonthCount(monthItemCountsByDate, calendarEvent.dateKey, "calendar");
  }

  for (const todo of todos) {
    const dueDateKey = todo.dueDate?.toISOString().slice(0, 10);

    if (dueDateKey) {
      incrementMonthCount(monthItemCountsByDate, dueDateKey, "todo");
    }
  }

  for (const chore of chores) {
    incrementMonthCount(monthItemCountsByDate, chore.nextDueAt.slice(0, 10), "chore");
  }

  const agendaItems = [
    ...calendarEvents
      .filter((calendarEvent) => isWithinRange(calendarEvent.dateKey, currentDayKey, agendaEndKey))
      .map((calendarEvent) => calendarAgendaItem(calendarEvent, membersById)),
    ...chores
      .filter((chore) => !chore.isOverdue)
      .filter((chore) => isWithinRange(chore.nextDueAt.slice(0, 10), currentDayKey, agendaEndKey))
      .map(choreAgendaItem),
    ...todos
      .filter((todo) => {
        const dueDateKey = todo.dueDate?.toISOString().slice(0, 10);

        return dueDateKey ? isWithinRange(dueDateKey, currentDayKey, agendaEndKey) : false;
      })
      .map(todoAgendaItem),
  ].sort(sortAgendaItems);

  return {
    actionSummary: {
      calendarThisWeek: calendarEvents.filter((calendarEvent) =>
        isWithinRange(calendarEvent.dateKey, currentDayKey, agendaEndKey),
      ).length,
      overdueChores: chores.filter((chore) => chore.isOverdue).length,
      todosThisWeek: todos.filter((todo) => {
        const dueDateKey = todo.dueDate?.toISOString().slice(0, 10);

        return dueDateKey ? isWithinRange(dueDateKey, currentDayKey, agendaEndKey) : false;
      }).length,
    },
    agendaDays: groupAgendaItems(agendaItems),
    calendarEvents: calendarEvents.map(toCalendarEventView),
    calendarMembers: dashboardMembers.map(toCalendarMemberOption),
    expenseSnapshot: {
      entries: monthlyExpenses.slice(0, 3).map(toExpenseEntry),
      monthLabel: currentMonthLabel(currentDayKey),
      stats: expenseStats,
    },
    members: dashboardMembers,
    monthItemCountsByDate,
    nonCalendarItemsByDate: groupItemsByDateRecord([...allChoreItems, ...allTodoItems]),
    todayKey: currentDayKey,
  };
}
