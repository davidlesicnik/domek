"use client";

import type { FormEvent, SVGProps } from "react";
import { useMemo, useState } from "react";

import {
  calendarCategoryOptions,
  type CalendarCategory,
  type CalendarEventInput,
  type CalendarEventTime,
  type CalendarEventView,
  type CalendarMemberOption,
} from "@/lib/calendar-types";
import { MemberAvatar } from "@/components/ui/member-avatar";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { getMemberColor } from "@/lib/member-colors";

type CalendarBoardProps = Readonly<{
  initialEvents: CalendarEventView[];
  members: CalendarMemberOption[];
  todayKey: string;
}>;

type MonthCursor = Readonly<{
  year: number;
  monthIndex: number;
}>;

type ComposerMode = "dialog" | "panel";
type CalendarIconProps = SVGProps<SVGSVGElement>;

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const categoryStyles: Record<
  CalendarCategory,
  Readonly<{
    label: string;
    dot: string;
    chip: string;
    text: string;
  }>
> = {
  care: {
    label: "Care",
    dot: "bg-[#6e9274]",
    chip: "border-[#b7c8ba] bg-[#e8f1e9] text-[#385d42]",
    text: "text-[#385d42]",
  },
  guests: {
    label: "Guests",
    dot: "bg-[#8b91b5]",
    chip: "border-[#c7cbdf] bg-[#eceef7] text-[#4e557b]",
    text: "text-[#4e557b]",
  },
  home: {
    label: "Home",
    dot: "bg-[#c7ad32]",
    chip: "border-[#ddd084] bg-[#faf2c9] text-[#67591d]",
    text: "text-[#67591d]",
  },
  school: {
    label: "School",
    dot: "bg-[#c77d78]",
    chip: "border-[#dcb0ac] bg-[#f5e5e3] text-[#804a45]",
    text: "text-[#804a45]",
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

const weekdayFormatter = new Intl.DateTimeFormat("en", {
  timeZone: "UTC",
  weekday: "long",
});

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function PencilIcon(props: CalendarIconProps) {
  return (
    <svg
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      {...props}
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}

function TrashIcon(props: CalendarIconProps) {
  return (
    <svg
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      {...props}
    >
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
    </svg>
  );
}

function ChevronLeftIcon(props: CalendarIconProps) {
  return (
    <svg
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      {...props}
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon(props: CalendarIconProps) {
  return (
    <svg
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      {...props}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
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
    year: nextMonth.getUTCFullYear(),
    monthIndex: nextMonth.getUTCMonth(),
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

function eventTimeLabel(time: CalendarEventTime) {
  return time.kind === "all-day" ? "All day" : time.value;
}

function groupEventsByDate(events: CalendarEventView[]) {
  return events.reduce<Record<string, CalendarEventView[]>>((eventsByDate, calendarEvent) => {
    return {
      ...eventsByDate,
      [calendarEvent.dateKey]: [...(eventsByDate[calendarEvent.dateKey] ?? []), calendarEvent],
    };
  }, {});
}

function CalendarEventCard({
  calendarEvent,
  className = "rounded-md border border-[#e3ded6] bg-[#fbfaf6] p-4",
  isDeleting = false,
  membersById,
  onDelete,
  onEdit,
}: Readonly<{
  calendarEvent: CalendarEventView;
  className?: string;
  isDeleting?: boolean;
  membersById: Map<string, CalendarMemberOption>;
  onDelete?: () => void;
  onEdit?: () => void;
}>) {
  const assignedMembers = calendarEvent.householdMemberIds
    .map((memberId) => membersById.get(memberId))
    .filter((member): member is CalendarMemberOption => Boolean(member));

  return (
    <article className={className}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cx(
              "text-[11px] font-bold uppercase tracking-normal",
              categoryStyles[calendarEvent.category].text,
            )}
          >
            {categoryStyles[calendarEvent.category].label}
          </span>
          <span className="text-[11px] font-semibold text-[#777f7a]">
            {eventTimeLabel(calendarEvent.time)}
          </span>
        </div>
        {(onEdit || onDelete) ? (
          <div className="flex shrink-0 items-center gap-1">
            {onEdit ? (
              <button
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#d8d2c8] bg-white text-[#5d635f] transition hover:bg-[#f7f4ec] disabled:opacity-50"
                disabled={isDeleting}
                onClick={onEdit}
                title="Edit event"
                type="button"
              >
                <PencilIcon aria-hidden className="h-3.5 w-3.5" />
              </button>
            ) : null}
            {onDelete ? (
              <button
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#e8cec8] bg-[#fdf2f0] text-[#904035] transition hover:bg-[#f9e0db] disabled:opacity-50"
                disabled={isDeleting}
                onClick={onDelete}
                title="Delete event"
                type="button"
              >
                {isDeleting ? (
                  <span className="text-[10px] font-bold">…</span>
                ) : (
                  <TrashIcon aria-hidden className="h-3.5 w-3.5" />
                )}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <h3 className="mt-2 text-base font-semibold text-[#202321]">
        {calendarEvent.name}
      </h3>
      {assignedMembers.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {assignedMembers.map((member) => {
            const color = getMemberColor(member.color);

            return (
              <span
                className="inline-flex rounded-md border px-2 py-1 text-[11px] font-semibold"
                key={member.id}
                style={{
                  backgroundColor: color.tint,
                  borderColor: color.border,
                  color: color.avatarText,
                }}
              >
                {memberLabel(member)}
              </span>
            );
          })}
        </div>
      ) : null}
    </article>
  );
}

function memberLabel(member: CalendarMemberOption) {
  return member.name ?? member.email ?? "Household member";
}

function SelectedMemberPill({
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

export function CalendarBoard({ initialEvents, members, todayKey }: CalendarBoardProps) {
  const today = useMemo(() => parseDateKey(todayKey), [todayKey]);
  const [visibleMonth, setVisibleMonth] = useState<MonthCursor>(() => ({
    monthIndex: today.getUTCMonth(),
    year: today.getUTCFullYear(),
  }));
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const [eventsByDate, setEventsByDate] = useState(() => groupEventsByDate(initialEvents));
  const [composerMode, setComposerMode] = useState<ComposerMode | null>(null);
  const [composerDateKey, setComposerDateKey] = useState(todayKey);
  const [eventName, setEventName] = useState("");
  const [eventCategory, setEventCategory] = useState<CalendarCategory>("home");
  const [isAllDay, setIsAllDay] = useState(true);
  const [eventTime, setEventTime] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [isDeletingEventId, setIsDeletingEventId] = useState<string | null>(null);

  const monthDays = useMemo(() => getMonthDays(visibleMonth), [visibleMonth]);
  const currentMonthDays = useMemo(
    () => monthDays.filter((date) => date.getUTCMonth() === visibleMonth.monthIndex),
    [monthDays, visibleMonth.monthIndex],
  );
  const agendaDays = useMemo(
    () =>
      currentMonthDays
        .map((date) => {
          const dateKey = toDateKey(date);

          return {
            date,
            dateKey,
            events: eventsByDate[dateKey] ?? [],
          };
        })
        .filter((day) => day.events.length > 0),
    [currentMonthDays, eventsByDate],
  );
  const selectedDate = useMemo(() => parseDateKey(selectedDateKey), [selectedDateKey]);
  const selectedEvents = eventsByDate[selectedDateKey] ?? [];
  const membersById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);
  const selectedMembers = selectedMemberIds
    .map((memberId) => membersById.get(memberId))
    .filter((member): member is CalendarMemberOption => Boolean(member));
  const isCurrentMonthVisible =
    visibleMonth.monthIndex === today.getUTCMonth() && visibleMonth.year === today.getUTCFullYear();

  function goToMonth(offset: number) {
    const nextMonth = moveMonth(visibleMonth, offset);

    setVisibleMonth(nextMonth);
    setSelectedDateKey(toDateKey(createDate(nextMonth.year, nextMonth.monthIndex, 1)));
  }

  function goToToday() {
    setVisibleMonth({
      monthIndex: today.getUTCMonth(),
      year: today.getUTCFullYear(),
    });
    setSelectedDateKey(todayKey);
  }

  function selectDate(dateKey: string) {
    const date = parseDateKey(dateKey);

    setSelectedDateKey(dateKey);
    setVisibleMonth({
      monthIndex: date.getUTCMonth(),
      year: date.getUTCFullYear(),
    });
  }

  function openComposer(dateKey: string, mode: ComposerMode) {
    setEditingEventId(null);
    resetComposer();
    if (mode === "panel") {
      selectDate(dateKey);
    }

    setComposerDateKey(dateKey);
    setComposerMode(mode);
  }

  function resetComposer() {
    setEventName("");
    setEventCategory("home");
    setIsAllDay(true);
    setEventTime("");
    setSelectedMemberIds([]);
    setFormError(null);
  }

  function closeComposer() {
    setEditingEventId(null);
    resetComposer();
    setComposerMode(null);
  }

  function openEditor(calendarEvent: CalendarEventView) {
    setEditingEventId(calendarEvent.id);
    setComposerDateKey(calendarEvent.dateKey);
    setEventName(calendarEvent.name);
    setEventCategory(calendarEvent.category);
    setIsAllDay(calendarEvent.time.kind === "all-day");
    setEventTime(calendarEvent.time.kind === "time" ? calendarEvent.time.value : "");
    setSelectedMemberIds([...calendarEvent.householdMemberIds]);
    setFormError(null);
    setComposerMode("panel");
    selectDate(calendarEvent.dateKey);
  }

  async function addSubmittedEvent(formEvent: FormEvent<HTMLFormElement>) {
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
        [savedEvent.dateKey]: [...(currentEvents[savedEvent.dateKey] ?? []), savedEvent],
      }));
      setSelectedDateKey(savedEvent.dateKey);
      const savedEventDate = parseDateKey(savedEvent.dateKey);
      setVisibleMonth({
        monthIndex: savedEventDate.getUTCMonth(),
        year: savedEventDate.getUTCFullYear(),
      });
      trackAnalyticsEvent("calendar_plan_added", {
        category: savedEvent.category,
        has_assigned_members: savedEvent.householdMemberIds.length > 0,
        time_kind: savedEvent.time.kind,
      });
      closeComposer();
    } catch {
      setFormError("The event was not saved.");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveEditedEvent(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();

    if (!editingEventId) return;

    const trimmedEventName = eventName.trim();

    if (!trimmedEventName) return;

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
      const idToRemove = editingEventId;

      setEventsByDate((currentEvents) => {
        const result: Record<string, CalendarEventView[]> = {};

        for (const [key, events] of Object.entries(currentEvents)) {
          const filtered = events.filter((e) => e.id !== idToRemove);

          if (filtered.length > 0) result[key] = filtered;
        }

        return {
          ...result,
          [updatedEvent.dateKey]: [...(result[updatedEvent.dateKey] ?? []), updatedEvent],
        };
      });

      closeComposer();
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

      if (!response.ok) return;

      setEventsByDate((currentEvents) => {
        const result: Record<string, CalendarEventView[]> = {};

        for (const [key, events] of Object.entries(currentEvents)) {
          const filtered = events.filter((e) => e.id !== id);

          if (filtered.length > 0) result[key] = filtered;
        }

        return result;
      });

      if (editingEventId === id) closeComposer();
    } finally {
      setIsDeletingEventId(null);
    }
  }

  function renderEventForm(showDateField: boolean, className: string) {
    const isEditing = editingEventId !== null;

    return (
      <form className={className} onSubmit={isEditing ? saveEditedEvent : addSubmittedEvent}>
        {showDateField ? (
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
        ) : null}

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
            disabled={members.length === 0}
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
              {members.length > 0 ? "Add household member" : "No household members yet"}
            </option>
            {members.map((member) => (
              <option
                disabled={selectedMemberIds.includes(member.id)}
                key={member.id}
                value={member.id}
              >
                {memberLabel(member)}
              </option>
            ))}
          </select>
          {selectedMembers.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedMembers.map((member) => (
                <SelectedMemberPill
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
          {members.length === 0 ? (
            <span className="text-xs font-medium text-[#777f7a]">
              Add household members in household settings first.
            </span>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {formError ? (
            <p className="w-full text-sm font-semibold text-[#a6543c]">{formError}</p>
          ) : null}
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
    <section className="grid gap-5">
      <div className="flex flex-col gap-4 rounded-md border border-[#dedbd2] bg-[#fffdf8] p-3 shadow-[0_12px_28px_rgba(31,35,30,0.07)] sm:p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3 sm:gap-5">
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <button
              aria-label="Previous month"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[#c9d7cc] bg-[#eef6ef] text-[#45614c] transition hover:bg-[#e2f0e4] sm:h-9 sm:w-9"
              onClick={() => goToMonth(-1)}
              type="button"
            >
              <ChevronLeftIcon aria-hidden className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1 px-0 text-center sm:min-w-48">
              <p className="font-serif text-xl font-semibold tracking-normal text-[#171a18] sm:text-2xl">
                {monthFormatter.format(createDate(visibleMonth.year, visibleMonth.monthIndex, 1))}
              </p>
            </div>
            <button
              aria-label="Next month"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[#c9d7cc] bg-[#eef6ef] text-[#45614c] transition hover:bg-[#e2f0e4] sm:h-9 sm:w-9"
              onClick={() => goToMonth(1)}
              type="button"
            >
              <ChevronRightIcon aria-hidden className="h-5 w-5" />
            </button>
          </div>
          {!isCurrentMonthVisible ? (
            <button
              className="hidden h-9 items-center justify-center rounded-md border border-[#ded3a1] bg-[#fbf4cf] px-4 text-sm font-semibold text-[#64571f] transition hover:bg-[#f6eab5] sm:inline-flex"
              onClick={goToToday}
              type="button"
            >
              Today
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {calendarCategoryOptions.map((category) => {
            const styles = categoryStyles[category];

            return (
              <span
                className="hidden h-8 items-center gap-2 rounded-md border border-[#e0dcd4] bg-[#fbfaf6] px-3 text-xs font-semibold text-[#555d58] sm:inline-flex"
                key={category}
              >
                <span aria-hidden className={cx("h-2.5 w-2.5 rounded-full", styles.dot)} />
                {styles.label}
              </span>
            );
          })}
          <button
            aria-label="Add event"
            className="hidden h-11 items-center justify-center gap-2 rounded-md border border-[#b85f6b] bg-[#f3dfe2] px-4 text-sm font-bold leading-none text-[#843541] transition hover:bg-[#eccfd4] sm:inline-flex"
            onClick={() => openComposer(selectedDateKey, "dialog")}
            type="button"
          >
            <span aria-hidden className="text-xl leading-none">
              +
            </span>
            Add
          </button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-md border border-[#dedbd2] bg-[#fffdf8] p-4 shadow-[0_12px_28px_rgba(31,35,30,0.07)] sm:hidden">
          <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#a6543c]">
            Agenda
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <h2 className="font-serif text-2xl font-semibold tracking-normal text-[#171a18]">
              {monthFormatter.format(createDate(visibleMonth.year, visibleMonth.monthIndex, 1))}
            </h2>
            {!isCurrentMonthVisible ? (
              <button
                className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-[#ded3a1] bg-[#fbf4cf] px-3 text-sm font-semibold text-[#64571f] transition hover:bg-[#f6eab5]"
                onClick={goToToday}
                type="button"
              >
                Today
              </button>
            ) : null}
          </div>

          <div className="mt-5 grid gap-5">
            {agendaDays.length > 0 ? (
              agendaDays.map((day) => (
                <section className="grid gap-0 rounded-md border border-[#e3ded6] bg-[#fbfaf6]" key={day.dateKey}>
                  <button
                    className="flex items-center justify-between gap-3 rounded-t-md border-b border-[#e3ded6] px-3 py-3 text-left transition hover:bg-[#f4f1ea]"
                    onClick={() => selectDate(day.dateKey)}
                    type="button"
                  >
                    <span>
                      <span className="block font-serif text-lg font-semibold tracking-normal text-[#202321]">
                        {fullDateFormatter.format(day.date)}
                      </span>
                      <span className="block text-xs font-semibold text-[#777f7a]">
                        {weekdayFormatter.format(day.date)}
                      </span>
                    </span>
                    <span className="rounded-full border border-[#c9d7cc] bg-[#eef6ef] px-2 py-1 text-[10px] font-bold text-[#45614c]">
                      {day.events.length}
                    </span>
                  </button>

                  <div className="grid divide-y divide-[#e3ded6]">
                    {day.events.map((calendarEvent) => (
                      <CalendarEventCard
                        calendarEvent={calendarEvent}
                        className="p-4"
                        isDeleting={isDeletingEventId === calendarEvent.id}
                        key={calendarEvent.id}
                        membersById={membersById}
                        onDelete={() => deleteEvent(calendarEvent.id)}
                        onEdit={() => openEditor(calendarEvent)}
                      />
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <div className="rounded-md border border-dashed border-[#d8d2c8] bg-[#fbfaf6] p-5">
                <p className="font-serif text-xl font-semibold tracking-normal text-[#202321]">
                  Nothing on the table.
                </p>
                <p className="mt-2 text-sm leading-6 text-[#68706b]">
                  A quiet month for the house. Add a note when something comes up.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="hidden overflow-hidden rounded-md border border-[#dedbd2] bg-[#fffdf8] shadow-[0_12px_28px_rgba(31,35,30,0.07)] sm:block">
          <div className="grid grid-cols-7 border-b border-[#e6e0d7] bg-[#f7f4ec]">
            {weekdays.map((weekday) => (
              <div
                className="px-2 py-3 text-center text-[11px] font-bold uppercase tracking-normal text-[#626a65]"
                key={weekday}
              >
                {weekday}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthDays.map((date, index) => {
              const dateKey = toDateKey(date);
              const isToday = dateKey === todayKey;
              const isSelected = dateKey === selectedDateKey;
              const isCurrentMonth = date.getUTCMonth() === visibleMonth.monthIndex;
              const dayEvents = eventsByDate[dateKey] ?? [];
              const visibleEvents = dayEvents.slice(0, 2);
              const hiddenEventCount = dayEvents.length - visibleEvents.length;

              return (
                <div
                  className={cx(
                    "relative min-h-[130px] border-b border-r border-[#e7e1d9] p-2 transition",
                    index % 7 === 6 && "border-r-0",
                    index >= monthDays.length - 7 && "border-b-0",
                    isSelected
                      ? "bg-[#e1f0e4] shadow-[inset_0_0_0_2px_#6e9274]"
                      : !isCurrentMonth
                        ? "bg-[#f8f6f1] text-[#969c98]"
                        : "bg-[#fffdf8]",
                  )}
                  key={dateKey}
                >
                  <button
                    aria-label={`Select ${fullDateFormatter.format(date)}`}
                    className="absolute inset-0 z-10 cursor-pointer"
                    onClick={() => selectDate(dateKey)}
                    type="button"
                  />
                  <div className="pointer-events-none relative z-20 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        aria-current={isToday ? "date" : undefined}
                        aria-pressed={isSelected}
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
                      {index % 7 === 0 ? (
                        <span className="pt-1 text-[10px] font-semibold uppercase tracking-normal text-[#a0a7a2]">
                          W{getIsoWeek(date)}
                        </span>
                      ) : null}
                    </div>

                    <div className="grid gap-1">
                      {visibleEvents.map((calendarEvent) => {
                        const eventMembers = calendarEvent.householdMemberIds
                          .map((id) => membersById.get(id))
                          .filter((m): m is CalendarMemberOption => Boolean(m));

                        return (
                          <button
                            className={cx(
                              "pointer-events-auto w-full min-w-0 rounded-md border px-2 py-1 text-left text-[11px] font-semibold leading-4 transition hover:brightness-95",
                              categoryStyles[calendarEvent.category].chip,
                            )}
                            key={calendarEvent.id}
                            onClick={() => selectDate(dateKey)}
                            type="button"
                          >
                            <span className="block truncate">{calendarEvent.name}</span>
                            {eventMembers.length > 0 ? (
                              <span className="mt-1 flex flex-wrap gap-0.5">
                                {eventMembers.map((member) => {
                                  return (
                                    <MemberAvatar
                                      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-md border text-[8px] font-semibold"
                                      color={member.color}
                                      email={member.email}
                                      emoji={member.emoji}
                                      key={member.id}
                                      name={member.name}
                                      title={memberLabel(member)}
                                    />
                                  );
                                })}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                      {hiddenEventCount > 0 ? (
                        <button
                          className="pointer-events-auto text-left text-[11px] font-semibold text-[#68706b] underline decoration-[#b7c8ba] underline-offset-2"
                          onClick={() => selectDate(dateKey)}
                          type="button"
                        >
                          +{hiddenEventCount} more
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="hidden rounded-md border border-[#dedbd2] bg-[#fffdf8] p-4 shadow-[0_12px_28px_rgba(31,35,30,0.07)] sm:block sm:p-5">
          <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#a6543c]">
            {weekdayFormatter.format(selectedDate)}
          </p>
          <h2 className="mt-2 font-serif text-2xl font-semibold tracking-normal text-[#171a18] sm:text-3xl">
            {fullDateFormatter.format(selectedDate)}
          </h2>
          <p className="mt-2 text-sm font-medium text-[#858c87]">
            Week {getIsoWeek(selectedDate)}
          </p>

          <div className="mt-6 grid gap-3">
            {selectedEvents.length > 0 ? (
              selectedEvents.map((calendarEvent) => (
                <CalendarEventCard
                  calendarEvent={calendarEvent}
                  isDeleting={isDeletingEventId === calendarEvent.id}
                  key={calendarEvent.id}
                  membersById={membersById}
                  onDelete={() => deleteEvent(calendarEvent.id)}
                  onEdit={() => openEditor(calendarEvent)}
                />
              ))
            ) : (
              <div className="rounded-md border border-dashed border-[#d8d2c8] bg-[#fbfaf6] p-5">
                <p className="font-serif text-xl font-semibold tracking-normal text-[#202321]">
                  Nothing on the table.
                </p>
                <p className="mt-2 text-sm leading-6 text-[#68706b]">
                  A quiet day for the house. Add a note here when something comes up.
                </p>
              </div>
            )}
          </div>

          {composerMode === "panel" ? (
            renderEventForm(
              false,
              "mt-6 grid gap-4 rounded-md border border-[#e3ded6] bg-[#fbfaf6] p-4",
            )
          ) : (
            <button
              className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-md border border-[#c9d7cc] bg-[#eef6ef] px-4 text-sm font-semibold text-[#45614c] transition hover:bg-[#e2f0e4]"
              onClick={() => openComposer(selectedDateKey, "panel")}
              type="button"
            >
              Add event on this day
            </button>
          )}
        </aside>
      </div>

      <button
        aria-label="Add event"
        className="fixed bottom-[calc(5.5rem_+_env(safe-area-inset-bottom))] right-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-md border border-[#b85f6b] bg-[#f3dfe2] text-3xl font-bold leading-none text-[#843541] shadow-[0_14px_34px_rgba(31,35,30,0.22)] transition hover:bg-[#eccfd4] sm:hidden"
        onClick={() => openComposer(selectedDateKey, "dialog")}
        type="button"
      >
        <span aria-hidden>+</span>
      </button>

      {composerMode === "dialog" ? (
        <div
          aria-labelledby="calendar-event-dialog-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#202321]/45 p-3 pb-[calc(0.75rem_+_env(safe-area-inset-bottom))] sm:items-center sm:p-4"
          role="dialog"
        >
          <div className="max-h-[calc(100dvh_-_1.5rem_-_env(safe-area-inset-bottom))] w-full max-w-md overflow-y-auto rounded-md border border-[#dedbd2] bg-[#fffdf8] p-4 shadow-[0_22px_55px_rgba(31,35,30,0.22)] sm:max-h-[calc(100dvh-2rem)] sm:p-5">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#a6543c]">
                  Calendar
                </p>
                <h2
                  className="mt-1 font-serif text-2xl font-semibold tracking-normal text-[#171a18]"
                  id="calendar-event-dialog-title"
                >
                  {editingEventId ? "Edit event" : "Add event"}
                </h2>
              </div>
              <button
                aria-label="Close add event dialog"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#d8d2c8] bg-white text-xl font-semibold leading-none text-[#5d635f] transition hover:bg-[#f7f4ec]"
                disabled={isSaving}
                onClick={closeComposer}
                type="button"
              >
                <span aria-hidden>&times;</span>
              </button>
            </div>
            {renderEventForm(true, "grid gap-4")}
          </div>
        </div>
      ) : null}
    </section>
  );
}
