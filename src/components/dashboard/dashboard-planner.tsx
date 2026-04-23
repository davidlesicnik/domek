"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";

import { MemberAvatar } from "@/components/ui/member-avatar";
import {
  calendarCategoryOptions,
  type CalendarCategory,
  type CalendarEventInput,
  type CalendarEventTime,
  type CalendarEventView,
  type CalendarMemberOption,
} from "@/lib/calendar-types";
import type {
  DashboardAgendaDay,
  DashboardAgendaItem,
  DashboardMonthCellCounts,
} from "@/lib/dashboard";
import { getMemberColor } from "@/lib/member-colors";

type DashboardPlannerProps = Readonly<{
  agendaDays: DashboardAgendaDay[];
  calendarEvents: CalendarEventView[];
  calendarMembers: CalendarMemberOption[];
  monthItemCountsByDate: Record<string, DashboardMonthCellCounts>;
  nonCalendarItemsByDate: Record<string, DashboardAgendaItem[]>;
  todayKey: string;
}>;

type TodoEditorState = Readonly<{
  dateKey: string;
  id: string;
  listName: string;
  memberId: string | null;
  text: string;
}>;

type MonthCursor = Readonly<{
  monthIndex: number;
  year: number;
}>;

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const agendaSourceOrder: Record<DashboardAgendaItem["source"], number> = {
  calendar: 0,
  chore: 1,
  todo: 2,
};

const sourceStyles: Record<
  DashboardAgendaItem["source"],
  Readonly<{
    chip: string;
    label: string;
  }>
> = {
  calendar: {
    chip: "border-[#cdd1e5] bg-[#f0f2fa] text-[#5b648b]",
    label: "Calendar",
  },
  chore: {
    chip: "border-[#c6d7c9] bg-[#edf4ee] text-[#476950]",
    label: "Chore",
  },
  todo: {
    chip: "border-[#e4d99b] bg-[#fbf4d7] text-[#776824]",
    label: "To-do",
  },
};

const categoryStyles: Record<
  CalendarCategory,
  Readonly<{
    chip: string;
    dot: string;
    label: string;
    text: string;
  }>
> = {
  care: {
    chip: "border-[#c6d7c9] bg-[#edf4ee] text-[#476950]",
    dot: "bg-[#6e9274]",
    label: "Care",
    text: "text-[#476950]",
  },
  guests: {
    chip: "border-[#cdd1e5] bg-[#f0f2fa] text-[#5b648b]",
    dot: "bg-[#8b91b5]",
    label: "Guests",
    text: "text-[#5b648b]",
  },
  home: {
    chip: "border-[#e4d99b] bg-[#fbf4d7] text-[#776824]",
    dot: "bg-[#c7ad32]",
    label: "Home",
    text: "text-[#776824]",
  },
  school: {
    chip: "border-[#e8c5c1] bg-[#f8ebe9] text-[#8d5852]",
    dot: "bg-[#c77d78]",
    label: "School",
    text: "text-[#8d5852]",
  },
};

const monthFormatter = new Intl.DateTimeFormat("en", {
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});

const fullDateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});

const agendaDateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  weekday: "long",
});

const weekdayFormatter = new Intl.DateTimeFormat("en", {
  timeZone: "UTC",
  weekday: "long",
});

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day));
}

function toDateKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createDate(year: number, monthIndex: number, day: number) {
  return new Date(Date.UTC(year, monthIndex, day));
}

function addDays(date: Date, days: number) {
  return createDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days);
}

function moveMonth(cursor: MonthCursor, offset: number): MonthCursor {
  const nextMonth = createDate(cursor.year, cursor.monthIndex + offset, 1);

  return {
    monthIndex: nextMonth.getUTCMonth(),
    year: nextMonth.getUTCFullYear(),
  };
}

function getIsoWeek(date: Date) {
  const weekDate = createDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const day = weekDate.getUTCDay() || 7;

  weekDate.setUTCDate(weekDate.getUTCDate() + 4 - day);

  const yearStart = createDate(weekDate.getUTCFullYear(), 0, 1);
  const daysSinceYearStart = (weekDate.getTime() - yearStart.getTime()) / 86_400_000 + 1;

  return Math.ceil(daysSinceYearStart / 7);
}

function getMonthDays({ year, monthIndex }: MonthCursor) {
  const firstOfMonth = createDate(year, monthIndex, 1);
  const firstWeekdayOffset = (firstOfMonth.getUTCDay() + 6) % 7;
  const daysInMonth = createDate(year, monthIndex + 1, 0).getUTCDate();
  const cellCount = Math.max(35, Math.ceil((firstWeekdayOffset + daysInMonth) / 7) * 7);
  const firstCell = addDays(firstOfMonth, -firstWeekdayOffset);

  return Array.from({ length: cellCount }, (_, index) => addDays(firstCell, index));
}

function agendaDateLabel(dateKey: string, todayKey: string) {
  if (dateKey === todayKey) {
    return "Today";
  }

  const tomorrowKey = toDateKey(addDays(parseDateKey(todayKey), 1));

  if (dateKey === tomorrowKey) {
    return "Tomorrow";
  }

  return agendaDateFormatter.format(parseDateKey(dateKey));
}

function eventTimeLabel(time: CalendarEventTime) {
  return time.kind === "all-day" ? "All day" : time.value;
}

function itemMeta(item: DashboardAgendaItem) {
  return [item.timeLabel, item.sourceDetail].filter(Boolean).join(" · ");
}

function sourceDotColor(source: DashboardAgendaItem["source"]) {
  if (source === "calendar") return "#8b91b5";
  if (source === "chore") return "#6e9274";
  return "#c7ad32";
}

function memberLabel(member: CalendarMemberOption) {
  return member.name ?? member.email ?? "Household member";
}

function groupEventsByDate(events: CalendarEventView[]) {
  return events.reduce<Record<string, CalendarEventView[]>>((eventsByDate, calendarEvent) => {
    const nextEvents = [...(eventsByDate[calendarEvent.dateKey] ?? []), calendarEvent].sort(sortCalendarEvents);

    return {
      ...eventsByDate,
      [calendarEvent.dateKey]: nextEvents,
    };
  }, {});
}

function sortCalendarEvents(a: CalendarEventView, b: CalendarEventView) {
  if (a.time.kind === "all-day" && b.time.kind !== "all-day") return -1;
  if (a.time.kind !== "all-day" && b.time.kind === "all-day") return 1;
  const timeCompare = eventTimeLabel(a.time).localeCompare(eventTimeLabel(b.time));

  if (timeCompare !== 0) {
    return timeCompare;
  }

  return a.name.localeCompare(b.name);
}

function sortDashboardItems(a: DashboardAgendaItem, b: DashboardAgendaItem) {
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

function calendarEventAgendaItem(
  calendarEvent: CalendarEventView,
  membersById: Map<string, CalendarMemberOption>,
): DashboardAgendaItem {
  const firstAssignedMember = calendarEvent.householdMemberIds[0]
    ? membersById.get(calendarEvent.householdMemberIds[0]) ?? null
    : null;

  return {
    dateKey: calendarEvent.dateKey,
    href: "/app#home-calendar",
    id: calendarEvent.id,
    member: firstAssignedMember
      ? {
          color: firstAssignedMember.color,
          email: firstAssignedMember.email,
          emoji: firstAssignedMember.emoji,
          id: firstAssignedMember.id,
          name: firstAssignedMember.name,
        }
      : null,
    source: "calendar",
    sourceDetail: categoryStyles[calendarEvent.category].label,
    timeLabel: eventTimeLabel(calendarEvent.time),
    title: calendarEvent.name,
  };
}

function withCalendarCountDelta(
  currentCounts: Record<string, DashboardMonthCellCounts>,
  dateKey: string,
  delta: number,
) {
  const current = currentCounts[dateKey] ?? {
    calendar: 0,
    chore: 0,
    todo: 0,
    total: 0,
  };
  const next = {
    ...current,
    calendar: Math.max(0, current.calendar + delta),
    total: Math.max(0, current.total + delta),
  };

  if (next.calendar === 0 && next.chore === 0 && next.todo === 0 && next.total === 0) {
    const rest = { ...currentCounts };

    delete rest[dateKey];

    return rest;
  }

  return {
    ...currentCounts,
    [dateKey]: next,
  };
}

function CalendarMemberPill({
  member,
  onRemove,
}: Readonly<{
  member: CalendarMemberOption;
  onRemove: () => void;
}>) {
  const color = getMemberColor(member.color);

  return (
    <button
      className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold"
      onClick={onRemove}
      style={{
        backgroundColor: color.tint,
        borderColor: color.border,
        color: color.avatarText,
      }}
      type="button"
    >
      {memberLabel(member)}
      <span aria-hidden>x</span>
    </button>
  );
}

function DashboardCalendarEventCard({
  calendarEvent,
  isDeleting,
  membersById,
  onDelete,
  onEdit,
}: Readonly<{
  calendarEvent: CalendarEventView;
  isDeleting: boolean;
  membersById: Map<string, CalendarMemberOption>;
  onDelete: () => void;
  onEdit: () => void;
}>) {
  const agendaItem = calendarEventAgendaItem(calendarEvent, membersById);
  const styles = sourceStyles.calendar;
  const assignedMembers = calendarEvent.householdMemberIds
    .map((memberId) => membersById.get(memberId))
    .filter((member): member is CalendarMemberOption => Boolean(member));

  return (
    <article className="group rounded-md border border-[#e3ded6] bg-[#fbfaf6] p-4 transition hover:bg-[#f4f1ea]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cx(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                styles.chip,
              )}
            >
              {styles.label}
            </span>
            {itemMeta(agendaItem) ? (
              <span className="text-[11px] font-medium text-[#7a817d]">{itemMeta(agendaItem)}</span>
            ) : null}
          </div>
          <h3 className="mt-2 text-base font-semibold text-[#202321]">{calendarEvent.name}</h3>
        </div>
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#d8d2c8] bg-white text-[#5d635f] transition hover:bg-[#f7f4ec] disabled:opacity-50"
            disabled={isDeleting}
            onClick={onEdit}
            title="Edit event"
            type="button"
          >
            <Pencil aria-hidden className="h-3.5 w-3.5" />
          </button>
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e8cec8] bg-[#fdf2f0] text-[#904035] transition hover:bg-[#f9e0db] disabled:opacity-50"
            disabled={isDeleting}
            onClick={onDelete}
            title="Delete event"
            type="button"
          >
            {isDeleting ? <span className="text-[10px] font-bold">…</span> : <Trash2 aria-hidden className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {assignedMembers.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {assignedMembers.map((member) => (
            <MemberAvatar
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-[11px] font-semibold"
              color={member.color}
              email={member.email}
              emoji={member.emoji}
              key={member.id}
              name={member.name}
              title={memberLabel(member)}
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function DashboardPlanner({
  agendaDays,
  calendarEvents,
  calendarMembers,
  monthItemCountsByDate,
  nonCalendarItemsByDate,
  todayKey,
}: DashboardPlannerProps) {
  const router = useRouter();
  const today = useMemo(() => parseDateKey(todayKey), [todayKey]);
  const [visibleMonth, setVisibleMonth] = useState<MonthCursor>({
    monthIndex: today.getUTCMonth(),
    year: today.getUTCFullYear(),
  });
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const [eventsByDate, setEventsByDate] = useState(() => groupEventsByDate(calendarEvents));
  const [calendarCounts, setCalendarCounts] = useState(monthItemCountsByDate);
  const [composerDateKey, setComposerDateKey] = useState(todayKey);
  const [eventName, setEventName] = useState("");
  const [eventCategory, setEventCategory] = useState<CalendarCategory>("home");
  const [isAllDay, setIsAllDay] = useState(true);
  const [eventTime, setEventTime] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isDeletingEventId, setIsDeletingEventId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingScheduledItemId, setIsDeletingScheduledItemId] = useState<string | null>(null);
  const [isSavingTodo, setIsSavingTodo] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingTodo, setEditingTodo] = useState<TodoEditorState | null>(null);
  const [scheduledItemsByDate, setScheduledItemsByDate] = useState(nonCalendarItemsByDate);
  const agendaSectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const calendarSectionRef = useRef<HTMLDivElement | null>(null);
  const [todoText, setTodoText] = useState("");
  const [todoDueDate, setTodoDueDate] = useState(todayKey);
  const [todoMemberId, setTodoMemberId] = useState<string | null>(null);
  const [todoFormError, setTodoFormError] = useState<string | null>(null);
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  useEffect(() => {
    setEventsByDate(groupEventsByDate(calendarEvents));
  }, [calendarEvents]);

  useEffect(() => {
    setCalendarCounts(monthItemCountsByDate);
  }, [monthItemCountsByDate]);

  useEffect(() => {
    setScheduledItemsByDate(nonCalendarItemsByDate);
  }, [nonCalendarItemsByDate]);

  const monthDays = useMemo(() => getMonthDays(visibleMonth), [visibleMonth]);
  const membersById = useMemo(
    () => new Map(calendarMembers.map((member) => [member.id, member])),
    [calendarMembers],
  );
  const selectedDate = useMemo(() => parseDateKey(selectedDateKey), [selectedDateKey]);
  const selectedEvents = useMemo(() => eventsByDate[selectedDateKey] ?? [], [eventsByDate, selectedDateKey]);
  const selectedDayItems = useMemo(() => {
    const calendarItems = selectedEvents.map((calendarEvent) =>
      calendarEventAgendaItem(calendarEvent, membersById),
    );

    return [...calendarItems, ...(scheduledItemsByDate[selectedDateKey] ?? [])].sort(sortDashboardItems);
  }, [membersById, scheduledItemsByDate, selectedDateKey, selectedEvents]);
  const selectedMembers = selectedMemberIds
    .map((memberId) => membersById.get(memberId))
    .filter((member): member is CalendarMemberOption => Boolean(member));
  const selectedDateIsToday = selectedDateKey === todayKey;
  const effectiveSelectedAgendaDateKey = selectedDateIsToday ? todayKey : null;
  const isCurrentMonthVisible =
    visibleMonth.monthIndex === today.getUTCMonth() && visibleMonth.year === today.getUTCFullYear();

  useEffect(() => {
    if (!selectedDateIsToday || !effectiveSelectedAgendaDateKey) return;

    const section = agendaSectionRefs.current[effectiveSelectedAgendaDateKey];

    section?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [effectiveSelectedAgendaDateKey, selectedDateIsToday]);

  function resetComposer(defaultDateKey = selectedDateKey) {
    setComposerDateKey(defaultDateKey);
    setEventName("");
    setEventCategory("home");
    setIsAllDay(true);
    setEventTime("");
    setSelectedMemberIds([]);
    setFormError(null);
  }

  function selectDate(dateKey: string) {
    const date = parseDateKey(dateKey);

    setSelectedDateKey(dateKey);
    setComposerDateKey(dateKey);
    setVisibleMonth({
      monthIndex: date.getUTCMonth(),
      year: date.getUTCFullYear(),
    });
  }

  function openComposer(dateKey: string) {
    setEditingEventId(null);
    setIsComposerOpen(true);
    selectDate(dateKey);
    resetComposer(dateKey);
  }

  function closeComposer() {
    setEditingEventId(null);
    setIsComposerOpen(false);
    resetComposer();
  }

  function openEditor(calendarEvent: CalendarEventView) {
    setEditingEventId(calendarEvent.id);
    setIsComposerOpen(true);
    setComposerDateKey(calendarEvent.dateKey);
    setEventName(calendarEvent.name);
    setEventCategory(calendarEvent.category);
    setIsAllDay(calendarEvent.time.kind === "all-day");
    setEventTime(calendarEvent.time.kind === "time" ? calendarEvent.time.value : "");
    setSelectedMemberIds([...calendarEvent.householdMemberIds]);
    setFormError(null);
    selectDate(calendarEvent.dateKey);
  }

  function goToMonth(offset: number) {
    const nextMonth = moveMonth(visibleMonth, offset);
    const nextDateKey = toDateKey(createDate(nextMonth.year, nextMonth.monthIndex, 1));

    setVisibleMonth(nextMonth);
    setSelectedDateKey(nextDateKey);
    setComposerDateKey(nextDateKey);
  }

  function goToToday() {
    setVisibleMonth({
      monthIndex: today.getUTCMonth(),
      year: today.getUTCFullYear(),
    });
    setSelectedDateKey(todayKey);
    setComposerDateKey(todayKey);
  }

  function refreshDashboard() {
    startTransition(() => {
      router.refresh();
    });
  }

  async function saveEvent(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();

    const trimmedEventName = eventName.trim();

    if (!trimmedEventName) {
      return;
    }

    if (!isAllDay && !eventTime) {
      setFormError("Add a time or keep the event all day.");

      return;
    }

    const input: CalendarEventInput = {
      category: eventCategory,
      dateKey: composerDateKey,
      householdMemberIds: selectedMemberIds,
      name: trimmedEventName,
      time: isAllDay ? { kind: "all-day" } : { kind: "time", value: eventTime },
    };

    setFormError(null);
    setIsSaving(true);

    try {
      if (editingEventId) {
        const response = await fetch(`/api/calendar/events/${editingEventId}`, {
          body: JSON.stringify(input),
          headers: { "Content-Type": "application/json" },
          method: "PATCH",
        });

        if (!response.ok) {
          setFormError("The event was not saved.");

          return;
        }

        const { event: updatedEvent } = (await response.json()) as { event: CalendarEventView };
        const previousEvent = Object.values(eventsByDate)
          .flat()
          .find((calendarEvent) => calendarEvent.id === editingEventId);

        setEventsByDate((currentEvents) => {
          const nextEvents: Record<string, CalendarEventView[]> = {};

          for (const [dateKey, dayEvents] of Object.entries(currentEvents)) {
            const filteredEvents = dayEvents.filter((calendarEvent) => calendarEvent.id !== editingEventId);

            if (filteredEvents.length > 0) {
              nextEvents[dateKey] = filteredEvents;
            }
          }

          nextEvents[updatedEvent.dateKey] = [
            ...(nextEvents[updatedEvent.dateKey] ?? []),
            updatedEvent,
          ].sort(sortCalendarEvents);

          return nextEvents;
        });

        if (previousEvent && previousEvent.dateKey !== updatedEvent.dateKey) {
          setCalendarCounts((currentCounts) => {
            const decrementedCounts = withCalendarCountDelta(currentCounts, previousEvent.dateKey, -1);

            return withCalendarCountDelta(decrementedCounts, updatedEvent.dateKey, 1);
          });
        }

        selectDate(updatedEvent.dateKey);
      } else {
        const response = await fetch("/api/calendar/events", {
          body: JSON.stringify(input),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        });

        if (!response.ok) {
          setFormError("The event was not saved.");

          return;
        }

        const { event: savedEvent } = (await response.json()) as { event: CalendarEventView };

        setEventsByDate((currentEvents) => ({
          ...currentEvents,
          [savedEvent.dateKey]: [...(currentEvents[savedEvent.dateKey] ?? []), savedEvent].sort(
            sortCalendarEvents,
          ),
        }));
        setCalendarCounts((currentCounts) => withCalendarCountDelta(currentCounts, savedEvent.dateKey, 1));
        selectDate(savedEvent.dateKey);
      }

      closeComposer();
      refreshDashboard();
    } catch {
      setFormError("The event was not saved.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteEvent(id: string) {
    setIsDeletingEventId(id);

    try {
      const response = await fetch(`/api/calendar/events/${id}`, { method: "DELETE" });

      if (!response.ok) {
        return;
      }

      const deletedEvent = Object.values(eventsByDate)
        .flat()
        .find((calendarEvent) => calendarEvent.id === id);

      setEventsByDate((currentEvents) => {
        const nextEvents: Record<string, CalendarEventView[]> = {};

        for (const [dateKey, dayEvents] of Object.entries(currentEvents)) {
          const filteredEvents = dayEvents.filter((calendarEvent) => calendarEvent.id !== id);

          if (filteredEvents.length > 0) {
            nextEvents[dateKey] = filteredEvents;
          }
        }

        return nextEvents;
      });

      if (deletedEvent) {
        setCalendarCounts((currentCounts) => withCalendarCountDelta(currentCounts, deletedEvent.dateKey, -1));
      }

      if (editingEventId === id) {
        closeComposer();
      }

      refreshDashboard();
    } finally {
      setIsDeletingEventId(null);
    }
  }

  function focusCalendarDate(dateKey: string) {
    selectDate(dateKey);

    calendarSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openTodoEditor(item: DashboardAgendaItem) {
    setEditingTodo({
      dateKey: item.dateKey,
      id: item.id,
      listName: item.sourceDetail ?? "List",
      memberId: item.member?.id ?? null,
      text: item.title,
    });
    setTodoText(item.title);
    setTodoDueDate(item.dateKey);
    setTodoMemberId(item.member?.id ?? null);
    setTodoFormError(null);
  }

  function closeTodoEditor() {
    if (isSavingTodo) {
      return;
    }

    setEditingTodo(null);
    setTodoText("");
    setTodoDueDate(todayKey);
    setTodoMemberId(null);
    setTodoFormError(null);
  }

  async function saveTodoEdit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();

    if (!editingTodo) {
      return;
    }

    const trimmedText = todoText.trim();

    if (!trimmedText) {
      setTodoFormError("Add a task name.");
      return;
    }

    setTodoFormError(null);
    setIsSavingTodo(true);

    try {
      const response = await fetch(`/api/todos/items/${editingTodo.id}`, {
        body: JSON.stringify({
          assignedHouseholdMemberId: todoMemberId,
          dueDate: todoDueDate,
          text: trimmedText,
        }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });

      if (!response.ok) {
        setTodoFormError("The task was not saved.");
        return;
      }

      setScheduledItemsByDate((currentItems) => {
        const nextItems: Record<string, DashboardAgendaItem[]> = {};

        for (const [dateKey, dayItems] of Object.entries(currentItems)) {
          const filteredItems = dayItems.filter((item) => item.id !== editingTodo.id);

          if (filteredItems.length > 0) {
            nextItems[dateKey] = filteredItems;
          }
        }

        const member = todoMemberId
          ? calendarMembers.find((candidate) => candidate.id === todoMemberId) ?? null
          : null;
        const updatedItem: DashboardAgendaItem = {
          dateKey: todoDueDate,
          href: "/app/todos",
          id: editingTodo.id,
          member: member
            ? {
                color: member.color,
                email: member.email,
                emoji: member.emoji,
                id: member.id,
                name: member.name,
              }
            : null,
          source: "todo",
          sourceDetail: editingTodo.listName,
          timeLabel: null,
          title: trimmedText,
        };

        nextItems[todoDueDate] = [...(nextItems[todoDueDate] ?? []), updatedItem].sort(sortDashboardItems);

        return nextItems;
      });

      selectDate(todoDueDate);
      closeTodoEditor();
      refreshDashboard();
    } catch {
      setTodoFormError("The task was not saved.");
    } finally {
      setIsSavingTodo(false);
    }
  }

  async function deleteScheduledItem(item: DashboardAgendaItem) {
    setIsDeletingScheduledItemId(item.id);

    try {
      const response = await fetch(
        item.source === "todo" ? `/api/todos/items/${item.id}` : `/api/chores/${item.id}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        return;
      }

      setScheduledItemsByDate((currentItems) => {
        const nextItems: Record<string, DashboardAgendaItem[]> = {};

        for (const [dateKey, dayItems] of Object.entries(currentItems)) {
          const filteredItems = dayItems.filter((candidate) => candidate.id !== item.id);

          if (filteredItems.length > 0) {
            nextItems[dateKey] = filteredItems;
          }
        }

        return nextItems;
      });

      if (editingTodo?.id === item.id) {
        closeTodoEditor();
      }

      refreshDashboard();
    } finally {
      setIsDeletingScheduledItemId(null);
    }
  }

  function renderEventForm() {
    const isEditing = editingEventId !== null;

    return (
      <form className="grid gap-4" onSubmit={saveEvent}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#a6543c]">
              Calendar
            </p>
            <h3 className="mt-1 font-serif text-xl font-semibold tracking-normal text-[#171a18]">
              {isEditing ? "Edit event" : "Add event"}
            </h3>
          </div>
          <button
            aria-label="Close event editor"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#d8d2c8] bg-white text-[#5d635f] transition hover:bg-[#f7f4ec]"
            disabled={isSaving}
            onClick={closeComposer}
            type="button"
          >
            <span aria-hidden>&times;</span>
          </button>
        </div>

        <label className="grid gap-2 text-sm font-semibold text-[#3f4642]">
          Date
          <input
            className="h-10 rounded-md border border-[#d8d2c8] bg-white px-3 text-sm font-medium text-[#202321] outline-none transition focus:border-[#9bb6a4]"
            onChange={(changeEvent) => setComposerDateKey(changeEvent.target.value)}
            required
            type="date"
            value={composerDateKey}
          />
        </label>

        <label className="grid gap-2 text-sm font-semibold text-[#3f4642]">
          Name
          <input
            className="h-10 rounded-md border border-[#d8d2c8] bg-white px-3 text-sm font-medium text-[#202321] outline-none transition focus:border-[#9bb6a4]"
            onChange={(changeEvent) => setEventName(changeEvent.target.value)}
            required
            type="text"
            value={eventName}
          />
        </label>

        <label className="grid gap-2 text-sm font-semibold text-[#3f4642]">
          Category
          <select
            className="h-10 rounded-md border border-[#d8d2c8] bg-white px-3 text-sm font-medium text-[#202321] outline-none transition focus:border-[#9bb6a4]"
            onChange={(changeEvent) => setEventCategory(changeEvent.target.value as CalendarCategory)}
            value={eventCategory}
          >
            {calendarCategoryOptions.map((category) => (
              <option key={category} value={category}>
                {categoryStyles[category].label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-[#3f4642]">
            <input
              checked={isAllDay}
              className="h-4 w-4 accent-[#6e9274]"
              onChange={(changeEvent) => setIsAllDay(changeEvent.target.checked)}
              type="checkbox"
            />
            All day
          </label>
          {!isAllDay ? (
            <label className="grid gap-2 text-sm font-semibold text-[#3f4642]">
              Time
              <input
                className="h-10 rounded-md border border-[#d8d2c8] bg-white px-3 text-sm font-medium text-[#202321] outline-none transition focus:border-[#9bb6a4]"
                onChange={(changeEvent) => setEventTime(changeEvent.target.value)}
                required
                type="time"
                value={eventTime}
              />
            </label>
          ) : null}
        </div>

        <div className="grid gap-2 text-sm font-semibold text-[#3f4642]">
          Who is involved?
          <select
            className="h-10 rounded-md border border-[#d8d2c8] bg-white px-3 text-sm font-medium text-[#202321] outline-none transition focus:border-[#9bb6a4]"
            disabled={calendarMembers.length === 0}
            onChange={(changeEvent) => {
              const memberId = changeEvent.target.value;
              if (!memberId) return;
              setSelectedMemberIds((currentIds) =>
                currentIds.includes(memberId) ? currentIds : [...currentIds, memberId],
              );
              changeEvent.target.value = "";
            }}
            value=""
          >
            <option value="">
              {calendarMembers.length > 0 ? "Add household member" : "No household members yet"}
            </option>
            {calendarMembers.map((member) => (
              <option disabled={selectedMemberIds.includes(member.id)} key={member.id} value={member.id}>
                {memberLabel(member)}
              </option>
            ))}
          </select>

          {selectedMembers.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedMembers.map((member) => (
                <CalendarMemberPill
                  key={member.id}
                  member={member}
                  onRemove={() =>
                    setSelectedMemberIds((currentIds) =>
                      currentIds.filter((memberId) => memberId !== member.id),
                    )
                  }
                />
              ))}
            </div>
          ) : null}

          {calendarMembers.length === 0 ? (
            <span className="text-xs font-medium text-[#777f7a]">
              Add household members in household settings first.
            </span>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {formError ? <p className="w-full text-sm font-semibold text-[#a6543c]">{formError}</p> : null}
          <button
            className="inline-flex h-11 w-full items-center justify-center rounded-md border border-[#c9d7cc] bg-[#eef6ef] px-4 text-sm font-semibold text-[#45614c] transition hover:bg-[#e2f0e4] disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:w-auto"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? "Saving" : isEditing ? "Update event" : "Save event"}
          </button>
          <button
            className="inline-flex h-11 w-full items-center justify-center rounded-md border border-[#d8d2c8] bg-white px-4 text-sm font-semibold text-[#5d635f] transition hover:bg-[#f7f4ec] disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:w-auto"
            disabled={isSaving}
            onClick={closeComposer}
            type="button"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="order-2 lg:order-1" id="home-calendar" ref={calendarSectionRef}>
        <div className="overflow-hidden rounded-md border border-[#dedbd2] bg-[#fffdf8] shadow-[0_12px_28px_rgba(31,35,30,0.07)]">
          <div className="flex flex-col gap-4 border-b border-[#e6e0d7] bg-[#f7f4ec] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <button
                aria-label="Previous month"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#c9d7cc] bg-[#eef6ef] text-[#45614c] transition hover:bg-[#e2f0e4]"
                onClick={() => goToMonth(-1)}
                type="button"
              >
                <ChevronLeft aria-hidden className="h-4 w-4" />
              </button>
              <button
                aria-label="Next month"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#c9d7cc] bg-[#eef6ef] text-[#45614c] transition hover:bg-[#e2f0e4]"
                onClick={() => goToMonth(1)}
                type="button"
              >
                <ChevronRight aria-hidden className="h-4 w-4" />
              </button>
              <div className="min-w-0 pl-1">
                <p className="font-serif text-2xl font-semibold tracking-normal text-[#171a18]">
                  {monthFormatter.format(createDate(visibleMonth.year, visibleMonth.monthIndex, 1))}
                </p>
                <p className="mt-1 text-xs text-[#717874]">Calendar at a glance</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!isCurrentMonthVisible ? (
                <button
                  className="inline-flex h-9 items-center justify-center rounded-md border border-[#ded3a1] bg-[#fbf4cf] px-3 text-sm font-semibold text-[#64571f] transition hover:bg-[#f6eab5]"
                  onClick={goToToday}
                  type="button"
                >
                  Today
                </button>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-[#e6e0d7] bg-[#fbfaf6]">
            {weekdays.map((weekday) => (
              <div
                className="px-1 py-3 text-center text-[11px] font-bold uppercase tracking-normal text-[#626a65] sm:px-2"
                key={weekday}
              >
                {weekday}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {monthDays.map((date, index) => {
              const dateKey = toDateKey(date);
              const counts = calendarCounts[dateKey];
              const isCurrentMonth = date.getUTCMonth() === visibleMonth.monthIndex;
              const isSelectedDate = dateKey === selectedDateKey;
              const isToday = dateKey === todayKey;

              return (
                <div
                  className={cx(
                    "relative min-h-[80px] border-b border-r border-[#e7e1d9] p-2 sm:min-h-[100px] xl:min-h-[130px]",
                    index % 7 === 6 && "border-r-0",
                    index >= monthDays.length - 7 && "border-b-0",
                    isSelectedDate
                      ? "bg-[#e8efe9] shadow-[inset_0_0_0_1px_#6e9274]"
                      : isCurrentMonth
                        ? "bg-[#fffdf8]"
                        : "bg-[#f8f6f1] text-[#9aa19c]",
                  )}
                  key={dateKey}
                >
                  <button
                    aria-label={`Select ${fullDateFormatter.format(date)}`}
                    className="absolute inset-0 z-10"
                    onClick={() => selectDate(dateKey)}
                    type="button"
                  />

                  <div className="pointer-events-none relative z-20 flex h-full flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        aria-current={isToday ? "date" : undefined}
                        aria-pressed={isSelectedDate}
                        className={cx(
                          "pointer-events-auto inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold",
                          isToday
                            ? "bg-[#202321] text-white"
                            : isCurrentMonth
                              ? "text-[#202321]"
                              : "text-[#929995]",
                        )}
                        onClick={() => selectDate(dateKey)}
                        type="button"
                      >
                        {date.getUTCDate()}
                      </button>
                      <div className="flex items-center gap-1">
                        {index % 7 === 0 ? (
                          <span className="hidden pt-1 text-[10px] font-semibold uppercase tracking-normal text-[#a0a7a2] xl:block">
                            W{getIsoWeek(date)}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {counts?.total ? (
                      <>
                        <div className="mt-3 flex items-center gap-1.5">
                          {counts.calendar > 0 ? (
                            <span
                              aria-label={`${counts.calendar} calendar item${counts.calendar === 1 ? "" : "s"}`}
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: sourceDotColor("calendar") }}
                            />
                          ) : null}
                          {counts.chore > 0 ? (
                            <span
                              aria-label={`${counts.chore} chore${counts.chore === 1 ? "" : "s"}`}
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: sourceDotColor("chore") }}
                            />
                          ) : null}
                          {counts.todo > 0 ? (
                            <span
                              aria-label={`${counts.todo} to-do item${counts.todo === 1 ? "" : "s"}`}
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: sourceDotColor("todo") }}
                            />
                          ) : null}
                        </div>
                        {counts.calendar > 0 ? (
                          <div className="mt-2">
                            <span className="rounded-full border border-[#d8d2c8] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#5d635f]">
                              {counts.calendar}
                            </span>
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="order-1 rounded-md border border-[#d8d2c8] bg-[#fffdf8] p-5 shadow-[0_18px_34px_rgba(31,35,30,0.09)] lg:order-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#a6543c]">
              {selectedDateIsToday ? "What's coming up" : weekdayFormatter.format(selectedDate)}
            </p>
            <h2 className="mt-1 font-serif text-xl font-semibold tracking-normal text-[#171a18]">
              {selectedDateIsToday ? "Next 7 days" : fullDateFormatter.format(selectedDate)}
            </h2>
            {!selectedDateIsToday ? (
              <p className="mt-2 text-sm font-medium text-[#858c87]">
                {selectedDayItems.length === 0
                  ? "Nothing scheduled yet."
                  : selectedDayItems.length === 1
                    ? "1 thing on this day"
                    : `${selectedDayItems.length} things on this day`}
              </p>
            ) : null}
          </div>
          {!isComposerOpen ? (
            <button
              className="inline-flex h-10 items-center justify-center rounded-md border border-[#c9d7cc] bg-[#eef6ef] px-4 text-sm font-semibold text-[#45614c] transition hover:bg-[#e2f0e4]"
              onClick={() => setShowCreateMenu(true)}
              type="button"
            >
              Add
            </button>
          ) : null}
        </div>

        {selectedDateIsToday ? (
          agendaDays.length > 0 ? (
            <div className="mt-5 grid gap-4">
              {agendaDays.map((day) => (
                <section
                  className={cx(
                    "rounded-md border bg-[#fbfaf6] transition",
                    day.dateKey === effectiveSelectedAgendaDateKey
                      ? "border-[#c7d7ca] shadow-[0_8px_22px_rgba(31,35,30,0.08)]"
                      : "border-[#e3ded6]",
                  )}
                  key={day.dateKey}
                  ref={(node) => {
                    agendaSectionRefs.current[day.dateKey] = node;
                  }}
                >
                  <div className="border-b border-[#e3ded6] px-4 py-3">
                    <button
                      className="font-serif text-left text-lg font-semibold tracking-normal text-[#202321]"
                      onClick={() => selectDate(day.dateKey)}
                      type="button"
                    >
                      {agendaDateLabel(day.dateKey, todayKey)}
                    </button>
                  </div>
                  <div className="grid divide-y divide-[#e3ded6]">
                    {day.items.map((item) => {
                      const styles = sourceStyles[item.source];
                      const itemContent = (
                        <>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="text-[15px] font-semibold leading-6 text-[#1e201f]">
                                {item.title}
                              </h3>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span
                                  className={cx(
                                    "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-normal",
                                    styles.chip,
                                  )}
                                >
                                  {styles.label}
                                </span>
                                {itemMeta(item) ? (
                                  <span className="text-[11px] font-medium text-[#8a918d]">
                                    {itemMeta(item)}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              {item.member ? (
                                <MemberAvatar
                                  className="flex h-8 w-8 items-center justify-center rounded-md border text-[11px] font-semibold"
                                  color={item.member.color}
                                  email={item.member.email}
                                  emoji={item.member.emoji}
                                  name={item.member.name}
                                  title={item.member.name ?? item.member.email ?? undefined}
                                />
                              ) : null}
                              <ChevronRight aria-hidden className="h-4 w-4 text-[#a9aeaa] transition group-hover:text-[#717874]" />
                            </div>
                          </div>
                        </>
                      );

                      if (item.source === "calendar") {
                        return (
                          <button
                            className="group block cursor-pointer px-4 py-4 text-left transition hover:bg-[#f4f1ea]"
                            key={`${item.source}-${item.id}`}
                            onClick={() => focusCalendarDate(item.dateKey)}
                            type="button"
                          >
                            {itemContent}
                          </button>
                        );
                      }

                      return (
                        <Link
                          className="group block cursor-pointer px-4 py-4 transition hover:bg-[#f4f1ea]"
                          href={item.href}
                          key={`${item.source}-${item.id}`}
                        >
                          {itemContent}
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-md border border-dashed border-[#d8d2c8] bg-[#fbfaf6] p-5">
              <p className="font-serif text-xl font-semibold tracking-normal text-[#202321]">
                No upcoming items
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="inline-flex h-9 items-center justify-center rounded-md border border-[#c9d7cc] bg-[#eef6ef] px-3 text-sm font-medium text-[#45614c] transition hover:bg-[#e2f0e4]"
                  onClick={() => focusCalendarDate(todayKey)}
                  type="button"
                >
                  Calendar
                </button>
                <Link
                  className="inline-flex h-9 items-center justify-center rounded-md border border-[#d8d2c8] bg-white px-3 text-sm font-medium text-[#5d635f] transition hover:bg-[#f4f1ea]"
                  href="/app/chores"
                >
                  Chores
                </Link>
                <Link
                  className="inline-flex h-9 items-center justify-center rounded-md border border-[#d8d2c8] bg-white px-3 text-sm font-medium text-[#5d635f] transition hover:bg-[#f4f1ea]"
                  href="/app/todos"
                >
                  Tasks
                </Link>
              </div>
            </div>
          )
        ) : (
          <div className="mt-5 grid gap-3">
            {selectedDayItems.length > 0 ? (
              selectedDayItems.map((item) => {
                if (item.source === "calendar") {
                  const calendarEvent = selectedEvents.find((event) => event.id === item.id);

                  if (!calendarEvent) {
                    return null;
                  }

                  return (
                    <DashboardCalendarEventCard
                      calendarEvent={calendarEvent}
                      isDeleting={isDeletingEventId === calendarEvent.id}
                      key={calendarEvent.id}
                      membersById={membersById}
                      onDelete={() => deleteEvent(calendarEvent.id)}
                      onEdit={() => openEditor(calendarEvent)}
                    />
                  );
                }

                const styles = sourceStyles[item.source];

                return (
                  <article
                    className="group rounded-md border border-[#e3ded6] bg-[#fbfaf6] p-4 transition hover:bg-[#f4f1ea]"
                    key={`${item.source}-${item.id}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link className="block" href={item.href}>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cx(
                                "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                                styles.chip,
                              )}
                            >
                              {styles.label}
                            </span>
                            {itemMeta(item) ? (
                              <span className="text-[11px] font-medium text-[#7a817d]">
                                {itemMeta(item)}
                              </span>
                            ) : null}
                          </div>
                          <h3 className="mt-2 text-base font-semibold text-[#202321]">{item.title}</h3>
                          {item.member ? (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              <MemberAvatar
                                className="flex h-7 w-7 items-center justify-center rounded-md border text-[11px] font-semibold"
                                color={item.member.color}
                                email={item.member.email}
                                emoji={item.member.emoji}
                                name={item.member.name}
                                title={item.member.name ?? item.member.email ?? undefined}
                              />
                            </div>
                          ) : null}
                        </Link>
                      </div>
                      <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                        {item.source === "todo" ? (
                          <button
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#d8d2c8] bg-white text-[#5d635f] transition hover:bg-[#f7f4ec]"
                            onClick={() => openTodoEditor(item)}
                            title="Edit task"
                            type="button"
                          >
                            <Pencil aria-hidden className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#d8d2c8] bg-white text-[#5d635f] transition hover:bg-[#f7f4ec] disabled:opacity-50"
                            disabled={isDeletingScheduledItemId === item.id}
                            onClick={() => router.push(`/app/chores?edit=${item.id}`)}
                            title="Edit chore"
                            type="button"
                          >
                            <Pencil aria-hidden className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e8cec8] bg-[#fdf2f0] text-[#904035] transition hover:bg-[#f9e0db] disabled:opacity-50"
                          disabled={isDeletingScheduledItemId === item.id}
                          onClick={() => deleteScheduledItem(item)}
                          title={item.source === "todo" ? "Delete task" : "Delete chore"}
                          type="button"
                        >
                          {isDeletingScheduledItemId === item.id ? (
                            <span className="text-[10px] font-bold">…</span>
                          ) : (
                            <Trash2 aria-hidden className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="rounded-md border border-dashed border-[#d8d2c8] bg-[#fbfaf6] p-5">
                <p className="font-serif text-xl font-semibold tracking-normal text-[#202321]">
                  Nothing on the table.
                </p>
                <p className="mt-2 text-sm leading-6 text-[#68706b]">
                  Keep this day open or add an event when something comes up.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {isComposerOpen ? (
        <div
          aria-labelledby="dashboard-calendar-event-dialog-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#202321]/45 p-3 pb-[calc(0.75rem_+_env(safe-area-inset-bottom))] sm:items-center sm:p-4"
          role="dialog"
        >
          <div className="max-h-[calc(100dvh_-_1.5rem_-_env(safe-area-inset-bottom))] w-full max-w-md overflow-y-auto rounded-md border border-[#dedbd2] bg-[#fffdf8] p-4 shadow-[0_22px_55px_rgba(31,35,30,0.22)] sm:max-h-[calc(100dvh-2rem)] sm:p-5">
            <div className="sr-only" id="dashboard-calendar-event-dialog-title">
              {editingEventId ? "Edit event" : "Add event"}
            </div>
            {renderEventForm()}
          </div>
        </div>
      ) : null}

      {showCreateMenu ? (
        <div
          aria-labelledby="dashboard-create-entry-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#202321]/45 p-3 pb-[calc(0.75rem_+_env(safe-area-inset-bottom))] sm:items-center sm:p-4"
          role="dialog"
        >
          <div className="w-full max-w-sm rounded-md border border-[#dedbd2] bg-[#fffdf8] p-5 shadow-[0_22px_55px_rgba(31,35,30,0.22)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#a6543c]">
                  Add something
                </p>
                <h2
                  className="mt-1 font-serif text-2xl font-semibold tracking-normal text-[#171a18]"
                  id="dashboard-create-entry-title"
                >
                  Pick what to add
                </h2>
              </div>
              <button
                aria-label="Close add menu"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#d8d2c8] bg-white text-xl font-semibold leading-none text-[#5d635f] transition hover:bg-[#f7f4ec]"
                onClick={() => setShowCreateMenu(false)}
                type="button"
              >
                <span aria-hidden>&times;</span>
              </button>
            </div>

            <div className="mt-5 grid gap-2">
              <button
                className="flex items-center rounded-md border border-[#c9d7cc] bg-[#eef6ef] px-4 py-3 text-left transition hover:bg-[#e2f0e4]"
                onClick={() => {
                  setShowCreateMenu(false);
                  openComposer(selectedDateKey);
                }}
                type="button"
              >
                <span>
                  <span className="block text-sm font-semibold text-[#2f4e35]">Event</span>
                  <span className="mt-1 block text-xs text-[#5d6d61]">Add something to the calendar</span>
                </span>
              </button>

              <Link
                className="flex items-center rounded-md border border-[#e0dcd4] bg-[#fbfaf6] px-4 py-3 transition hover:bg-[#f4f1ea]"
                href="/app/todos?create=1"
                onClick={() => setShowCreateMenu(false)}
              >
                <span>
                  <span className="block text-sm font-semibold text-[#202321]">Task</span>
                  <span className="mt-1 block text-xs text-[#6a716d]">Open the to-do composer</span>
                </span>
              </Link>

              <Link
                className="flex items-center rounded-md border border-[#e0dcd4] bg-[#fbfaf6] px-4 py-3 transition hover:bg-[#f4f1ea]"
                href="/app/chores?create=1"
                onClick={() => setShowCreateMenu(false)}
              >
                <span>
                  <span className="block text-sm font-semibold text-[#202321]">Chore</span>
                  <span className="mt-1 block text-xs text-[#6a716d]">Open the chore dialog</span>
                </span>
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {editingTodo ? (
        <div
          aria-labelledby="dashboard-todo-editor-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#202321]/45 p-3 pb-[calc(0.75rem_+_env(safe-area-inset-bottom))] sm:items-center sm:p-4"
          role="dialog"
        >
          <div className="max-h-[calc(100dvh_-_1.5rem_-_env(safe-area-inset-bottom))] w-full max-w-md overflow-y-auto rounded-md border border-[#dedbd2] bg-[#fffdf8] p-4 shadow-[0_22px_55px_rgba(31,35,30,0.22)] sm:max-h-[calc(100dvh-2rem)] sm:p-5">
            <form className="grid gap-4" onSubmit={saveTodoEdit}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#a6543c]">
                    To-do
                  </p>
                  <h3
                    className="mt-1 font-serif text-xl font-semibold tracking-normal text-[#171a18]"
                    id="dashboard-todo-editor-title"
                  >
                    Edit task
                  </h3>
                  <p className="mt-1 text-xs text-[#6c726e]">{editingTodo.listName}</p>
                </div>
                <button
                  aria-label="Close task editor"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#d8d2c8] bg-white text-[#5d635f] transition hover:bg-[#f7f4ec]"
                  disabled={isSavingTodo}
                  onClick={closeTodoEditor}
                  type="button"
                >
                  <span aria-hidden>&times;</span>
                </button>
              </div>

              <label className="grid gap-2 text-sm font-semibold text-[#3f4642]">
                Name
                <input
                  className="h-10 rounded-md border border-[#d8d2c8] bg-white px-3 text-sm font-medium text-[#202321] outline-none transition focus:border-[#9bb6a4]"
                  onChange={(event) => setTodoText(event.target.value)}
                  required
                  type="text"
                  value={todoText}
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-[#3f4642]">
                Due date
                <input
                  className="h-10 rounded-md border border-[#d8d2c8] bg-white px-3 text-sm font-medium text-[#202321] outline-none transition focus:border-[#9bb6a4]"
                  onChange={(event) => setTodoDueDate(event.target.value)}
                  required
                  type="date"
                  value={todoDueDate}
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-[#3f4642]">
                Assigned to
                <select
                  className="h-10 rounded-md border border-[#d8d2c8] bg-white px-3 text-sm font-medium text-[#202321] outline-none transition focus:border-[#9bb6a4]"
                  onChange={(event) => setTodoMemberId(event.target.value || null)}
                  value={todoMemberId ?? ""}
                >
                  <option value="">Unassigned</option>
                  {calendarMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {memberLabel(member)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {todoFormError ? (
                  <p className="w-full text-sm font-semibold text-[#a6543c]">{todoFormError}</p>
                ) : null}
                <button
                  className="inline-flex h-11 w-full items-center justify-center rounded-md border border-[#c9d7cc] bg-[#eef6ef] px-4 text-sm font-semibold text-[#45614c] transition hover:bg-[#e2f0e4] disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:w-auto"
                  disabled={isSavingTodo}
                  type="submit"
                >
                  {isSavingTodo ? "Saving" : "Save changes"}
                </button>
                <button
                  className="inline-flex h-11 w-full items-center justify-center rounded-md border border-[#d8d2c8] bg-white px-4 text-sm font-semibold text-[#5d635f] transition hover:bg-[#f7f4ec] disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:w-auto"
                  disabled={isSavingTodo}
                  onClick={closeTodoEditor}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
