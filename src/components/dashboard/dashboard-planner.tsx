"use client";

import type { ComponentProps, FormEvent, ReactNode } from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal, Pencil, Settings, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { createPortal } from "react-dom";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";

import { MemberAvatar } from "@/components/ui/member-avatar";
import { Link, useRouter } from "@/i18n/navigation";
import {
  type CalendarEventInput,
  type CalendarEventView,
  type CalendarGroupView,
  type CalendarMemberOption,
} from "@/lib/calendar-types";
import type {
  DashboardAgendaDay,
  DashboardAgendaItem,
  DashboardMonthCellCounts,
} from "@/lib/dashboard";
import { EXPENSE_CATEGORY_COLOR_GROUPS } from "@/lib/expense-colors";
import { getMemberColor } from "@/lib/member-colors";

type DashboardPlannerProps = Readonly<{
  agendaDays: DashboardAgendaDay[];
  calendarEvents: CalendarEventView[];
  calendarGroups: CalendarGroupView[];
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

type SelectOption = Readonly<{
  color?: string;
  disabled?: boolean;
  label: string;
  value: string;
}>;

type MonthCursor = Readonly<{
  monthIndex: number;
  year: number;
}>;

const agendaSourceOrder: Record<DashboardAgendaItem["source"], number> = {
  calendar: 0,
  chore: 1,
  todo: 2,
};

const sourceStyles: Record<
  DashboardAgendaItem["source"],
  Readonly<{
    chip: string;
    labelKey: "sourceCalendar" | "sourceChore" | "sourceTodo";
  }>
> = {
  calendar: {
    chip: "border-[#cdd1e5] bg-[#f0f2fa] text-[#5b648b]",
    labelKey: "sourceCalendar",
  },
  chore: {
    chip: "border-[#c6d7c9] bg-[#edf4ee] text-[#476950]",
    labelKey: "sourceChore",
  },
  todo: {
    chip: "border-[#e4d99b] bg-[#fbf4d7] text-[#776824]",
    labelKey: "sourceTodo",
  },
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const plannerInputClassName =
  "h-10 rounded-md border border-[var(--input-border)] bg-[var(--input-background)] px-3 text-base font-medium text-[var(--text-primary)] outline-none transition focus:border-[var(--focus-ring)] sm:text-sm";
const plannerPrimaryButtonClassName =
  "inline-flex h-11 w-full items-center justify-center rounded-md border border-[var(--accent-sage-border)] bg-[var(--accent-sage-surface)] px-4 text-sm font-semibold text-[var(--accent-sage-text)] transition hover:bg-[var(--surface-secondary)] disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:w-auto";
const plannerSecondaryButtonClassName =
  "inline-flex h-11 w-full items-center justify-center rounded-md border border-[var(--border-strong)] bg-[var(--surface-primary)] px-4 text-sm font-semibold text-[var(--text-muted)] transition hover:bg-[var(--surface-secondary)] disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:w-auto";
const hexColorPattern = /^#[0-9A-Fa-f]{6}$/;

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

function createUtcFormatter(locale: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: "UTC",
  });
}

type DashboardTranslations = ReturnType<typeof useTranslations>;

function agendaDateLabel(
  dateKey: string,
  todayKey: string,
  t: DashboardTranslations,
  agendaDateFormatter: Intl.DateTimeFormat,
) {
  if (dateKey === todayKey) {
    return t("today");
  }

  const tomorrowKey = toDateKey(addDays(parseDateKey(todayKey), 1));

  if (dateKey === tomorrowKey) {
    return t("tomorrow");
  }

  return agendaDateFormatter.format(parseDateKey(dateKey));
}

function translateSourceDetail(item: DashboardAgendaItem, t: DashboardTranslations) {
  const detail = item.sourceDetail;

  if (!detail) return null;

  if (item.source === "calendar") return detail;

  if (item.source === "chore") {
    if (detail.startsWith("Assigned to ")) {
      return t("choreAssignedTo", { name: detail.replace("Assigned to ", "") });
    }

    if (detail.startsWith("Next: ")) {
      return t("choreNext", { name: detail.replace("Next: ", "") });
    }

    if (detail === "Rotating") return t("choreRotating");
    if (detail === "House chore") return t("houseChore");
  }

  return detail;
}

function translatedTimeLabel(timeLabel: string | null, t: DashboardTranslations) {
  return timeLabel === "All day" ? t("allDay") : timeLabel;
}

function itemMeta(item: DashboardAgendaItem, t: DashboardTranslations) {
  return [translatedTimeLabel(item.timeLabel, t), translateSourceDetail(item, t)].filter(Boolean).join(" · ");
}

function sourceDotColor(source: DashboardAgendaItem["source"]) {
  if (source === "calendar") return "#8b91b5";
  if (source === "chore") return "#6e9274";
  return "#c7ad32";
}

function memberLabel(member: CalendarMemberOption, t: DashboardTranslations) {
  return member.name ?? member.email ?? t("memberFallback");
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
  const timeCompare = (a.time.kind === "time" ? a.time.value : "").localeCompare(
    b.time.kind === "time" ? b.time.value : "",
  );

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
    sourceDetail: calendarEvent.groupName,
    timeLabel: calendarEvent.time.kind === "all-day" ? "All day" : calendarEvent.time.value,
    title: calendarEvent.name,
  };
}

function plannerItemMeta(item: DashboardAgendaItem, t: DashboardTranslations) {
  return itemMeta(item, t);
}

function withoutScheduledItem(
  currentItems: Record<string, DashboardAgendaItem[]>,
  itemId: string,
) {
  const nextItems: Record<string, DashboardAgendaItem[]> = {};

  for (const [dateKey, dayItems] of Object.entries(currentItems)) {
    const filteredItems = dayItems.filter((candidate) => candidate.id !== itemId);

    if (filteredItems.length > 0) {
      nextItems[dateKey] = filteredItems;
    }
  }

  return nextItems;
}

function withoutCalendarEvent(
  currentEvents: Record<string, CalendarEventView[]>,
  eventId: string,
) {
  const nextEvents: Record<string, CalendarEventView[]> = {};

  for (const [dateKey, dayEvents] of Object.entries(currentEvents)) {
    const filteredEvents = dayEvents.filter((calendarEvent) => calendarEvent.id !== eventId);

    if (filteredEvents.length > 0) {
      nextEvents[dateKey] = filteredEvents;
    }
  }

  return nextEvents;
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
  t,
}: Readonly<{
  member: CalendarMemberOption;
  onRemove: () => void;
  t: DashboardTranslations;
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
      {memberLabel(member, t)}
      <span aria-hidden>x</span>
    </button>
  );
}

type GroupFormState = Readonly<{
  color: string;
  id: string;
  name: string;
}>;

const NEW_GROUP_OPTION = "__new__";
const EVENT_NOTIFICATION_OPTION_NONE = "__none__";
const EVENT_NOTIFICATION_OFFSETS = [10, 60, 1440] as const;

function defaultGroupId(groups: CalendarGroupView[]) {
  return groups[0]?.id ?? NEW_GROUP_OPTION;
}

function defaultGroupForm(groups: CalendarGroupView[]): GroupFormState {
  const firstGroup = groups[0];

  return firstGroup
    ? { color: firstGroup.color, id: firstGroup.id, name: firstGroup.name }
    : { color: EXPENSE_CATEGORY_COLOR_GROUPS[0].base, id: NEW_GROUP_OPTION, name: "" };
}

function findColorGroup(color: string) {
  return (
    EXPENSE_CATEGORY_COLOR_GROUPS.find((group) =>
      group.shades.some((shade) => shade.toLowerCase() === color.toLowerCase()),
    ) ?? EXPENSE_CATEGORY_COLOR_GROUPS[0]
  );
}

function colorGroupLabel(name: string) {
  return name;
}

function PlannerField({ children, label }: Readonly<{ children: ReactNode; label: ReactNode }>) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-[var(--text-primary)]">
      {label}
      {children}
    </label>
  );
}

function PlannerInput(props: Readonly<ComponentProps<"input">>) {
  const { className, ...rest } = props;

  return <input {...rest} className={cx(plannerInputClassName, className)} />;
}

function PlannerInputField({
  inputProps,
  label,
}: Readonly<{
  inputProps: ComponentProps<"input">;
  label: ReactNode;
}>) {
  return (
    <PlannerField label={label}>
      <PlannerInput {...inputProps} />
    </PlannerField>
  );
}

function PlannerSelectField({
  label,
  selectProps,
}: Readonly<{
  label: ReactNode;
  selectProps: ComponentProps<typeof PlannerSelect>;
}>) {
  return (
    <PlannerField label={label}>
      <PlannerSelect {...selectProps} />
    </PlannerField>
  );
}

type PlannerFieldDefinition =
  | Readonly<{
      inputProps: ComponentProps<"input">;
      key: string;
      kind: "input";
      label: ReactNode;
    }>
  | Readonly<{
      key: string;
      kind: "select";
      label: ReactNode;
      selectProps: ComponentProps<typeof PlannerSelect>;
    }>;

function PlannerFieldList({ fields }: Readonly<{ fields: PlannerFieldDefinition[] }>) {
  return fields.map((field) =>
    field.kind === "input" ? (
      <PlannerInputField inputProps={field.inputProps} key={field.key} label={field.label} />
    ) : (
      <PlannerSelectField key={field.key} label={field.label} selectProps={field.selectProps} />
    ),
  );
}

function plannerInputFieldDefinition(
  key: string,
  label: ReactNode,
  inputProps: ComponentProps<"input">,
): PlannerFieldDefinition {
  return {
    inputProps,
    key,
    kind: "input",
    label,
  };
}

function plannerSelectFieldDefinition(
  key: string,
  label: ReactNode,
  selectProps: ComponentProps<typeof PlannerSelect>,
): PlannerFieldDefinition {
  return {
    key,
    kind: "select",
    label,
    selectProps,
  };
}

function PlannerEditorHeader({
  closeLabel,
  description,
  disabled,
  eyebrow,
  onClose,
  title,
  titleId,
}: Readonly<{
  closeLabel: string;
  description?: string | null;
  disabled: boolean;
  eyebrow: string;
  onClose: () => void;
  title: string;
  titleId?: string;
}>) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[var(--accent-rose-text)]">
          {eyebrow}
        </p>
        <h3 className="mt-1 font-serif text-xl font-semibold tracking-normal text-[var(--text-strong)]" id={titleId}>
          {title}
        </h3>
        {description ? <p className="mt-1 text-xs text-[var(--text-muted)]">{description}</p> : null}
      </div>
      <button
        aria-label={closeLabel}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--input-border)] bg-[var(--input-background)] text-[var(--text-muted)] transition hover:bg-[var(--surface-secondary)]"
        disabled={disabled}
        onClick={onClose}
        type="button"
      >
        <span aria-hidden>&times;</span>
      </button>
    </div>
  );
}

function PlannerFormActions({
  disabled,
  error,
  onCancel,
  primaryButtonProps,
  primaryLabel,
  secondaryLabel,
}: Readonly<{
  disabled: boolean;
  error: string | null;
  onCancel: () => void;
  primaryButtonProps?: ComponentProps<"button">;
  primaryLabel: string;
  secondaryLabel: string;
}>) {
  const { className: primaryButtonClassName, ...primaryButtonRest } = primaryButtonProps ?? {};

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      {error ? <p className="w-full text-sm font-semibold text-[var(--accent-rose-text)]">{error}</p> : null}
      <button
        className={cx(plannerPrimaryButtonClassName, primaryButtonClassName)}
        disabled={disabled}
        type="submit"
        {...primaryButtonRest}
      >
        {primaryLabel}
      </button>
      <button
        className={plannerSecondaryButtonClassName}
        disabled={disabled}
        onClick={onCancel}
        type="button"
      >
        {secondaryLabel}
      </button>
    </div>
  );
}

function PlannerDialog({
  children,
  labelledBy,
}: Readonly<{
  children: ReactNode;
  labelledBy: string;
}>) {
  return (
    <div
      aria-labelledby={labelledBy}
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 pb-[calc(0.75rem_+_env(safe-area-inset-bottom))] sm:items-center sm:p-4"
      role="dialog"
    >
      <div className="max-h-[calc(100dvh_-_1.5rem_-_env(safe-area-inset-bottom))] w-full max-w-md overflow-y-auto rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-[var(--shadow-float)] sm:max-h-[calc(100dvh-2rem)] sm:p-5">
        {children}
      </div>
    </div>
  );
}

function PlannerIconButton({
  children,
  className,
  disabled = false,
  onClick,
  title,
}: Readonly<{
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick: () => void;
  title: string;
}>) {
  return (
    <button
      className={cx(
        "inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--input-border)] bg-[var(--input-background)] text-[var(--text-muted)] transition hover:bg-[var(--surface-secondary)] disabled:opacity-50",
        className,
      )}
      disabled={disabled}
      onClick={onClick}
      title={title}
      type="button"
    >
      {children}
    </button>
  );
}

function PlannerDeleteButton({
  disabled = false,
  isDeleting = false,
  onClick,
  title,
}: Readonly<{
  disabled?: boolean;
  isDeleting?: boolean;
  onClick: () => void;
  title: string;
}>) {
  return (
    <button
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--accent-rose-border)] bg-[var(--accent-rose-soft)] text-[var(--accent-rose-text)] transition hover:bg-[var(--accent-rose-surface)] disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
      title={title}
      type="button"
    >
      {isDeleting ? <span className="text-[10px] font-bold">…</span> : <Trash2 aria-hidden className="h-3.5 w-3.5" />}
    </button>
  );
}

function PlannerItemBadge({
  chipClassName,
  label,
  meta,
  uppercase = false,
}: Readonly<{
  chipClassName: string;
  label: string;
  meta: string | null;
  uppercase?: boolean;
}>) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={cx(
          "inline-flex items-center rounded-full border px-2 py-0.5 font-semibold",
          uppercase ? "text-[10px] uppercase tracking-normal" : "text-[11px]",
          chipClassName,
        )}
      >
        {label}
      </span>
      {meta ? <span className="text-[11px] font-medium text-[var(--text-subtle)]">{meta}</span> : null}
    </div>
  );
}

function PlannerMemberAvatar({
  member,
  sizeClassName,
}: Readonly<{
  member: NonNullable<DashboardAgendaItem["member"]> | CalendarMemberOption;
  sizeClassName: string;
}>) {
  const title = "name" in member ? member.name ?? member.email ?? undefined : undefined;

  return (
    <MemberAvatar
      className={sizeClassName}
      color={member.color}
      email={member.email}
      emoji={member.emoji}
      name={member.name}
      title={title}
    />
  );
}

function PlannerQuickActionLink({
  description,
  href,
  label,
  onClick,
}: Readonly<{
  description: string;
  href: string;
  label: string;
  onClick: () => void;
}>) {
  return (
    <Link
      className="flex items-center rounded-md border border-[var(--border-default)] bg-[var(--surface-muted)] px-4 py-3 transition hover:bg-[var(--surface-secondary)]"
      href={href}
      onClick={onClick}
    >
      <span>
        <span className="block text-sm font-semibold text-[var(--text-primary)]">{label}</span>
        <span className="mt-1 block text-xs text-[var(--text-muted)]">{description}</span>
      </span>
    </Link>
  );
}

function PlannerSelect({
  id,
  onChange,
  options,
  placeholder,
  value,
}: Readonly<{
  id: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder: string;
  value: string;
}>) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{
    left: number;
    top: number;
    width: number;
  } | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const selectedOption = options.find((option) => option.value === value);
  const listboxId = `${id}-listbox`;

  useEffect(() => {
    if (!isOpen) return;

    function updateMenuPosition() {
      const triggerRect = rootRef.current?.getBoundingClientRect();
      if (!triggerRect) return;

      setMenuStyle({
        left: triggerRect.left,
        top: triggerRect.bottom + 4,
        width: triggerRect.width,
      });
    }

    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) return;
      if (menuRef.current?.contains(event.target as Node)) return;
      setIsOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    updateMenuPosition();
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [isOpen]);

  return (
    <div className="relative w-full" ref={rootRef}>
      <button
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="flex h-10 w-full items-center justify-between gap-2 rounded-md border border-[var(--input-border)] bg-[var(--input-background)] px-3 text-left text-base font-medium text-[var(--text-primary)] outline-none transition hover:border-[var(--border-strong)] focus:border-[var(--focus-ring)] sm:text-sm"
        id={id}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setIsOpen(true);
          }
        }}
        role="combobox"
        type="button"
      >
        <span className="flex min-w-0 items-center gap-2">
          {selectedOption?.color ? (
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: selectedOption.color }}
            />
          ) : null}
          <span className={selectedOption ? "truncate" : "truncate text-[var(--input-placeholder)]"}>
            {selectedOption?.label ?? placeholder}
          </span>
        </span>
        <ChevronRight
          aria-hidden
          className={`h-4 w-4 shrink-0 text-[var(--text-subtle)] transition-transform ${isOpen ? "-rotate-90" : "rotate-90"}`}
        />
      </button>
      {isOpen && menuStyle
        ? createPortal(
            <div
              className="fixed z-[90] max-h-60 overflow-y-auto rounded-md border border-[var(--input-border)] bg-[var(--surface-primary)] p-1 shadow-[var(--shadow-float)]"
              id={listboxId}
              ref={menuRef}
              role="listbox"
              style={{
                left: menuStyle.left,
                top: menuStyle.top,
                width: menuStyle.width,
              }}
            >
              {options.map((option) => {
                const isSelected = option.value === value;

                return (
                  <button
                    aria-selected={isSelected}
                    className={`flex w-full items-center gap-2 rounded-[6px] px-2.5 py-2 text-left text-sm transition ${
                      option.disabled
                        ? "cursor-not-allowed text-[var(--text-subtle)]"
                        : isSelected
                          ? "bg-[var(--accent-sage-surface)] text-[var(--accent-sage-text)]"
                          : "text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]"
                    }`}
                    disabled={option.disabled}
                    key={`${id}-${option.value}`}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    role="option"
                    type="button"
                  >
                    {option.color ? (
                      <span
                        aria-hidden
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: option.color }}
                      />
                    ) : null}
                    <span className="truncate">{option.label}</span>
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function DashboardCalendarEventCard({
  calendarEvent,
  isDeleting,
  membersById,
  onDelete,
  onEdit,
  t,
}: Readonly<{
  calendarEvent: CalendarEventView;
  isDeleting: boolean;
  membersById: Map<string, CalendarMemberOption>;
  onDelete: () => void;
  onEdit: () => void;
  t: DashboardTranslations;
}>) {
  const agendaItem = calendarEventAgendaItem(calendarEvent, membersById);
  const styles = sourceStyles.calendar;
  const meta = plannerItemMeta(agendaItem, t);
  const assignedMembers = calendarEvent.householdMemberIds
    .map((memberId) => membersById.get(memberId))
    .filter((member): member is CalendarMemberOption => Boolean(member));

  return (
    <article className="group rounded-md border border-[#e3ded6] bg-[#fbfaf6] p-4 transition hover:bg-[#f4f1ea]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <PlannerItemBadge chipClassName={styles.chip} label={t(styles.labelKey)} meta={meta} />
          <h3 className="mt-2 text-base font-semibold text-[#202321]">{calendarEvent.name}</h3>
        </div>
        <div className="relative shrink-0">
          <DashboardCalendarEventMobileMenu
            isDeleting={isDeleting}
            onDelete={onDelete}
            onEdit={onEdit}
            t={t}
          />
          <div className="hidden items-center gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100 sm:flex">
            <PlannerIconButton disabled={isDeleting} onClick={onEdit} title={t("editEvent")}>
              <Pencil aria-hidden className="h-3.5 w-3.5" />
            </PlannerIconButton>
            <PlannerDeleteButton
              disabled={isDeleting}
              isDeleting={isDeleting}
              onClick={onDelete}
              title={t("deleteEvent")}
            />
          </div>
        </div>
      </div>

      {assignedMembers.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {assignedMembers.map((member) => (
            <PlannerMemberAvatar
              key={member.id}
              member={member}
              sizeClassName="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-[11px] font-semibold"
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}

function DashboardCalendarEventMobileMenu({
  isDeleting,
  onDelete,
  onEdit,
  t,
}: Readonly<{
  isDeleting: boolean;
  onDelete: () => void;
  onEdit: () => void;
  t: DashboardTranslations;
}>) {
  const [showMobileActions, setShowMobileActions] = useState(false);
  const mobileActionsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showMobileActions) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!mobileActionsRef.current?.contains(event.target as Node)) {
        setShowMobileActions(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowMobileActions(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showMobileActions]);

  return (
    <div className="relative sm:hidden" ref={mobileActionsRef}>
      <button
        aria-expanded={showMobileActions}
        aria-haspopup="menu"
        aria-label={t("openEventActions")}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#9da39f] transition hover:bg-[#f4f1ea] focus:bg-[#f4f1ea] focus:outline-none"
        disabled={isDeleting}
        onClick={(event) => {
          event.stopPropagation();
          setShowMobileActions((current) => !current);
        }}
        type="button"
      >
        <MoreHorizontal aria-hidden className="h-4 w-4" />
      </button>

      {showMobileActions ? (
        <div
          aria-label={t("eventActions")}
          className="absolute right-0 top-[calc(100%+0.35rem)] z-20 min-w-36 rounded-md border border-[#ddd7cd] bg-[#fffdf8] p-1 shadow-[0_16px_34px_rgba(31,35,30,0.18)]"
          role="menu"
        >
          <button
            className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left text-sm font-medium text-[#4d5451] transition hover:bg-[#f4f1ea]"
            onClick={(event) => {
              event.stopPropagation();
              setShowMobileActions(false);
              onEdit();
            }}
            role="menuitem"
            type="button"
          >
            <Pencil aria-hidden className="h-4 w-4" />
            <span>{t("editEvent")}</span>
          </button>
          <button
            className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left text-sm font-medium text-[#a6543c] transition hover:bg-[#f7ecea]"
            onClick={(event) => {
              event.stopPropagation();
              setShowMobileActions(false);
              onDelete();
            }}
            role="menuitem"
            type="button"
          >
            <Trash2 aria-hidden className="h-4 w-4" />
            <span>{t("deleteEvent")}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function DashboardPlanner({
  agendaDays,
  calendarEvents,
  calendarGroups,
  calendarMembers,
  monthItemCountsByDate,
  nonCalendarItemsByDate,
  todayKey,
}: DashboardPlannerProps) {
  const locale = useLocale();
  const t = useTranslations("dashboardPage");
  const router = useRouter();
  const today = useMemo(() => parseDateKey(todayKey), [todayKey]);
  const monthFormatter = useMemo(
    () => createUtcFormatter(locale, { month: "long", year: "numeric" }),
    [locale],
  );
  const fullDateFormatter = useMemo(
    () => createUtcFormatter(locale, { day: "numeric", month: "long", year: "numeric" }),
    [locale],
  );
  const agendaDateFormatter = useMemo(
    () => createUtcFormatter(locale, { day: "numeric", month: "short", weekday: "long" }),
    [locale],
  );
  const weekdayFormatter = useMemo(
    () => createUtcFormatter(locale, { weekday: "long" }),
    [locale],
  );
  const shortWeekdayFormatter = useMemo(
    () => createUtcFormatter(locale, { weekday: "short" }),
    [locale],
  );
  const [visibleMonth, setVisibleMonth] = useState<MonthCursor>({
    monthIndex: today.getUTCMonth(),
    year: today.getUTCFullYear(),
  });
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const [eventsByDate, setEventsByDate] = useState(() => groupEventsByDate(calendarEvents));
  const [groups, setGroups] = useState(calendarGroups);
  const [calendarCounts, setCalendarCounts] = useState(monthItemCountsByDate);
  const [composerDateKey, setComposerDateKey] = useState(todayKey);
  const [eventName, setEventName] = useState("");
  const [eventGroupId, setEventGroupId] = useState(() => defaultGroupId(calendarGroups));
  const [newGroupName, setNewGroupName] = useState("");
  const [isAllDay, setIsAllDay] = useState(true);
  const [eventTime, setEventTime] = useState("");
  const [eventNotificationOffsetMinutes, setEventNotificationOffsetMinutes] = useState<10 | 60 | 1440 | null>(null);
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
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [groupForm, setGroupForm] = useState<GroupFormState>(() => defaultGroupForm(calendarGroups));
  const [selectedColorGroupName, setSelectedColorGroupName] = useState<string>(findColorGroup(defaultGroupForm(calendarGroups).color).name);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [isSavingGroup, setIsSavingGroup] = useState(false);

  useEffect(() => {
    setEventsByDate(groupEventsByDate(calendarEvents));
  }, [calendarEvents]);

  useEffect(() => {
    setGroups(calendarGroups);
    setGroupForm(defaultGroupForm(calendarGroups));
    setSelectedColorGroupName(findColorGroup(defaultGroupForm(calendarGroups).color).name);
    setEventGroupId((currentGroupId) =>
      currentGroupId === NEW_GROUP_OPTION || calendarGroups.some((group) => group.id === currentGroupId)
        ? currentGroupId
        : defaultGroupId(calendarGroups),
    );
  }, [calendarGroups]);

  useEffect(() => {
    setCalendarCounts(monthItemCountsByDate);
  }, [monthItemCountsByDate]);

  useEffect(() => {
    setScheduledItemsByDate(nonCalendarItemsByDate);
  }, [nonCalendarItemsByDate]);

  useEffect(() => {
    if (!isAllDay) {
      return;
    }

    setEventNotificationOffsetMinutes((currentOffset) =>
      currentOffset === 10 || currentOffset === 60 ? null : currentOffset,
    );
  }, [isAllDay]);

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

  useEffect(() => {
    if (!selectedDateIsToday || !effectiveSelectedAgendaDateKey) return;

    const section = agendaSectionRefs.current[effectiveSelectedAgendaDateKey];

    section?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [effectiveSelectedAgendaDateKey, selectedDateIsToday]);

  function resetComposer(defaultDateKey = selectedDateKey) {
    setComposerDateKey(defaultDateKey);
    setEventName("");
    setEventGroupId(defaultGroupId(groups));
    setNewGroupName("");
    setIsAllDay(true);
    setEventTime("");
    setEventNotificationOffsetMinutes(null);
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
    setEventGroupId(calendarEvent.groupId);
    setNewGroupName("");
    setIsAllDay(calendarEvent.time.kind === "all-day");
    setEventTime(calendarEvent.time.kind === "time" ? calendarEvent.time.value : "");
    setEventNotificationOffsetMinutes(calendarEvent.notificationOffsetMinutes);
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

  function openGroupDialog() {
    setGroupForm(defaultGroupForm(groups));
    setSelectedColorGroupName(findColorGroup(defaultGroupForm(groups).color).name);
    setGroupError(null);
    setShowGroupDialog(true);
  }

  function closeGroupDialog() {
    if (isSavingGroup) {
      return;
    }

    setShowGroupDialog(false);
    setGroupError(null);
  }

  function selectGroupForEdit(groupId: string) {
    if (groupId === NEW_GROUP_OPTION) {
      const defaultColor = EXPENSE_CATEGORY_COLOR_GROUPS[0].base;

      setGroupForm({ color: defaultColor, id: NEW_GROUP_OPTION, name: "" });
      setSelectedColorGroupName(findColorGroup(defaultColor).name);
      setGroupError(null);
      return;
    }

    const group = groups.find((candidate) => candidate.id === groupId);

    if (!group) {
      return;
    }

    setGroupForm({ color: group.color, id: group.id, name: group.name });
    setSelectedColorGroupName(findColorGroup(group.color).name);
    setGroupError(null);
  }

  async function ensureCalendarGroupId() {
    if (eventGroupId !== NEW_GROUP_OPTION) {
      return eventGroupId;
    }

    const trimmedGroupName = newGroupName.trim();

    if (!trimmedGroupName) {
      setFormError(t("groupNameRequired"));
      return null;
    }

    const response = await fetch("/api/calendar/groups", {
      body: JSON.stringify({ name: trimmedGroupName }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    if (!response.ok) {
      setFormError(t("groupCreateError"));
      return null;
    }

    const { group } = (await response.json()) as { group: CalendarGroupView };

    setGroups((currentGroups) => [...currentGroups, group].sort((a, b) => a.name.localeCompare(b.name)));
    setEventGroupId(group.id);
    setNewGroupName("");

    return group.id;
  }

  async function persistCalendarEvent(url: string, method: "PATCH" | "POST", input: CalendarEventInput) {
    const response = await fetch(url, {
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
      method,
    });

    if (!response.ok) {
      setFormError(t("eventSaveError"));
      return null;
    }

    const { event } = (await response.json()) as { event: CalendarEventView };
    return event;
  }

  async function saveEvent(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();

    const nativeSubmitEvent = formEvent.nativeEvent as Event & { submitter?: HTMLButtonElement | null };

    if (
      !(nativeSubmitEvent.submitter instanceof HTMLButtonElement) ||
      nativeSubmitEvent.submitter.name !== "intent" ||
      nativeSubmitEvent.submitter.value !== "save-event"
    ) {
      return;
    }

    const trimmedEventName = eventName.trim();

    if (!trimmedEventName) {
      return;
    }

    if (!isAllDay && !eventTime) {
      setFormError(t("eventTimeRequired"));

      return;
    }

    const ensuredGroupId = await ensureCalendarGroupId();

    if (!ensuredGroupId) {
      return;
    }

    const input: CalendarEventInput = {
      dateKey: composerDateKey,
      groupId: ensuredGroupId,
      householdMemberIds: selectedMemberIds,
      name: trimmedEventName,
      notificationOffsetMinutes: eventNotificationOffsetMinutes,
      time: isAllDay ? { kind: "all-day" } : { kind: "time", value: eventTime },
    };

    setFormError(null);
    setIsSaving(true);

    try {
      if (editingEventId) {
        const updatedEvent = await persistCalendarEvent(
          `/api/calendar/events/${editingEventId}`,
          "PATCH",
          input,
        );

        if (!updatedEvent) {
          return;
        }
        const previousEvent = Object.values(eventsByDate)
          .flat()
          .find((calendarEvent) => calendarEvent.id === editingEventId);

        setEventsByDate((currentEvents) => {
          const nextEvents = withoutCalendarEvent(currentEvents, editingEventId);

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
        const savedEvent = await persistCalendarEvent("/api/calendar/events", "POST", input);

        if (!savedEvent) {
          return;
        }

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
      setFormError(t("eventSaveError"));
    } finally {
      setIsSaving(false);
    }
  }

  async function saveGroup(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();

    const trimmedGroupName = groupForm.name.trim();

    if (!trimmedGroupName) {
      setGroupError(t("groupNameRequired"));
      return;
    }

    if (!hexColorPattern.test(groupForm.color)) {
      setGroupError(t("groupColorInvalid"));
      return;
    }

    setGroupError(null);
    setIsSavingGroup(true);

    try {
      const response = await fetch(
        groupForm.id === NEW_GROUP_OPTION ? "/api/calendar/groups" : `/api/calendar/groups/${groupForm.id}`,
        {
          body: JSON.stringify({ color: groupForm.color, name: trimmedGroupName }),
          headers: { "Content-Type": "application/json" },
          method: groupForm.id === NEW_GROUP_OPTION ? "POST" : "PATCH",
        },
      );

      if (!response.ok) {
        setGroupError(groupForm.id === NEW_GROUP_OPTION ? t("groupCreateError") : t("groupSaveError"));
        return;
      }

      const { group } = (await response.json()) as { group: CalendarGroupView };

      setGroups((currentGroups) => {
        const nextGroups = currentGroups
          .filter((currentGroup) => currentGroup.id !== group.id)
          .concat(group)
          .sort((a, b) => a.name.localeCompare(b.name));

        if (groupForm.id === NEW_GROUP_OPTION && eventGroupId === NEW_GROUP_OPTION) {
          setEventGroupId(group.id);
          setNewGroupName("");
        }

        return nextGroups;
      });

      setEventsByDate((currentEvents) =>
        Object.fromEntries(
          Object.entries(currentEvents).map(([dateKey, dayEvents]) => [
            dateKey,
            dayEvents.map((calendarEvent) =>
              calendarEvent.groupId === group.id
                ? { ...calendarEvent, groupColor: group.color, groupName: group.name }
                : calendarEvent,
            ),
          ]),
        ),
      );

      setGroupForm({ color: group.color, id: group.id, name: group.name });
      setSelectedColorGroupName(findColorGroup(group.color).name);
      setShowGroupDialog(false);
      refreshDashboard();
    } finally {
      setIsSavingGroup(false);
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

      setEventsByDate((currentEvents) => withoutCalendarEvent(currentEvents, id));

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
      listName: translateSourceDetail(item, t) ?? t("sourceTodo"),
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
      setTodoFormError(t("taskNameRequired"));
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
        setTodoFormError(t("taskSaveError"));
        return;
      }

      setScheduledItemsByDate((currentItems) => {
        const nextItems = withoutScheduledItem(currentItems, editingTodo.id);

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
      setTodoFormError(t("taskSaveError"));
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

      setScheduledItemsByDate((currentItems) => withoutScheduledItem(currentItems, item.id));

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
    const eventGroupOptions: SelectOption[] = [
      ...groups.map((group) => ({
        color: group.color,
        label: group.name,
        value: group.id,
      })),
      { label: t("newGroupOption"), value: NEW_GROUP_OPTION },
    ];
    const involvedMemberOptions: SelectOption[] = calendarMembers.map((member) => ({
      disabled: selectedMemberIds.includes(member.id),
      label: memberLabel(member, t),
      value: member.id,
    }));
    const eventNotificationOptions: SelectOption[] = [
      { label: t("notificationWhenNone"), value: EVENT_NOTIFICATION_OPTION_NONE },
      ...EVENT_NOTIFICATION_OFFSETS.map((offsetMinutes) => ({
        label: t(`notificationWhen${offsetMinutes}` as "notificationWhen10" | "notificationWhen60" | "notificationWhen1440"),
        value: String(offsetMinutes),
      })),
    ].filter((option) => !isAllDay || option.value === EVENT_NOTIFICATION_OPTION_NONE || option.value === "1440");
    const eventFields: PlannerFieldDefinition[] = [
      plannerInputFieldDefinition("date", t("dateLabel"), {
          onChange: (changeEvent) => setComposerDateKey(changeEvent.target.value),
          required: true,
          type: "date",
          value: composerDateKey,
        }),
      plannerInputFieldDefinition("name", t("nameLabel"), {
          onChange: (changeEvent) => setEventName(changeEvent.target.value),
          required: true,
          type: "text",
          value: eventName,
        }),
    ];

    return (
      <form className="grid gap-4" onSubmit={saveEvent}>
        <PlannerEditorHeader
          closeLabel={t("closeEventEditor")}
          disabled={isSaving}
          eyebrow={t("calendarLabel")}
          onClose={closeComposer}
          title={isEditing ? t("editEvent") : t("addEvent")}
        />

        <PlannerFieldList fields={eventFields} />

        <PlannerField label={t("groupLabel")}>
          {eventGroupId === NEW_GROUP_OPTION ? (
            <div className="flex w-full gap-2">
              <PlannerInput
                autoFocus
                className="flex-1"
                enterKeyHint="done"
                maxLength={60}
                onChange={(changeEvent) => setNewGroupName(changeEvent.target.value)}
                onKeyDown={(keyboardEvent) => {
                  if (keyboardEvent.key !== "Enter") {
                    return;
                  }

                  keyboardEvent.preventDefault();
                  keyboardEvent.currentTarget.blur();
                }}
                placeholder={t("newGroupNamePlaceholder")}
                required
                type="text"
                value={newGroupName}
              />
              <button
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-md border border-[var(--input-border)] bg-[var(--input-background)] px-3 text-sm font-semibold text-[var(--text-muted)] transition hover:bg-[var(--surface-secondary)]"
                onClick={() => {
                  setEventGroupId(groups[0]?.id ?? "");
                  setNewGroupName("");
                }}
                type="button"
              >
                {t("cancel")}
              </button>
            </div>
          ) : (
            <PlannerSelect
              id="dashboard-event-group"
              onChange={(nextValue) => {
                setEventGroupId(nextValue);
                setNewGroupName("");
              }}
              options={eventGroupOptions}
              placeholder={t("groupLabel")}
              value={eventGroupId}
            />
          )}
        </PlannerField>

        <div className="grid gap-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <input
              checked={isAllDay}
              className="h-4 w-4 accent-[var(--focus-ring)]"
              onChange={(changeEvent) => setIsAllDay(changeEvent.target.checked)}
              type="checkbox"
            />
            {t("allDay")}
          </label>
          {!isAllDay ? (
            <PlannerFieldList
              fields={[
                plannerInputFieldDefinition("time", t("timeLabel"), {
                    onChange: (changeEvent) => setEventTime(changeEvent.target.value),
                    required: true,
                    type: "time",
                    value: eventTime,
                  }),
              ]}
            />
          ) : null}
        </div>

        <PlannerField label={t("notificationWhenLabel")}>
          <PlannerSelect
            id="dashboard-event-notification-offset"
            onChange={(value) => {
              if (value === EVENT_NOTIFICATION_OPTION_NONE) {
                setEventNotificationOffsetMinutes(null);
                return;
              }

              const nextOffset = Number(value);
              setEventNotificationOffsetMinutes(
                nextOffset === 10 || nextOffset === 60 || nextOffset === 1440 ? nextOffset : null,
              );
            }}
            options={eventNotificationOptions}
            placeholder={t("notificationWhenPlaceholder")}
            value={
              eventNotificationOffsetMinutes === null
                ? EVENT_NOTIFICATION_OPTION_NONE
                : String(eventNotificationOffsetMinutes)
            }
          />
        </PlannerField>

        <div className="grid gap-2 text-sm font-semibold text-[var(--text-primary)]">
          {t("whoInvolved")}
          <PlannerSelect
            id="dashboard-event-members"
            onChange={(memberId) => {
              setSelectedMemberIds((currentIds) =>
                currentIds.includes(memberId) ? currentIds : [...currentIds, memberId],
              );
            }}
            options={
              calendarMembers.length > 0
                ? involvedMemberOptions
                : [{ disabled: true, label: t("noHouseholdMembers"), value: "__none__" }]
            }
            placeholder={
              calendarMembers.length > 0 ? t("addHouseholdMember") : t("noHouseholdMembers")
            }
            value=""
          />

          {selectedMembers.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedMembers.map((member) => (
                <CalendarMemberPill
                  key={member.id}
                  member={member}
                  t={t}
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
            <span className="text-xs font-medium text-[var(--text-subtle)]">
              {t("addMembersFirst")}
            </span>
          ) : null}
        </div>

        <PlannerFormActions
          disabled={isSaving}
          error={formError}
          onCancel={closeComposer}
          primaryButtonProps={{ name: "intent", value: "save-event" }}
          primaryLabel={isSaving ? t("saving") : isEditing ? t("updateEvent") : t("saveEvent")}
          secondaryLabel={t("cancel")}
        />
      </form>
    );
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]">
      {showGroupDialog ? (
        <PlannerDialog labelledBy="dashboard-group-dialog-title">
          <form className="grid gap-4" onSubmit={saveGroup}>
            <PlannerEditorHeader
              closeLabel={t("closeGroupEditor")}
              disabled={isSavingGroup}
              eyebrow={t("groupsLabel")}
              onClose={closeGroupDialog}
              title={groupForm.id === NEW_GROUP_OPTION ? t("addGroup") : t("editGroup")}
              titleId="dashboard-group-dialog-title"
            />

            {groupError ? <p className="text-sm font-semibold text-[var(--accent-rose-text)]">{groupError}</p> : null}

            <PlannerField label={t("groupLabel")}>
              <PlannerSelect
                id="dashboard-group-select"
                onChange={selectGroupForEdit}
                options={[
                  ...groups.map((group) => ({
                    color: group.color,
                    label: group.name,
                    value: group.id,
                  })),
                  { label: t("newGroupOption"), value: NEW_GROUP_OPTION },
                ]}
                placeholder={t("groupLabel")}
                value={groupForm.id}
              />
            </PlannerField>

            <PlannerField label={t("nameLabel")}>
              <PlannerInput
                maxLength={60}
                onChange={(changeEvent) => setGroupForm((currentGroup) => ({ ...currentGroup, name: changeEvent.target.value }))}
                required
                type="text"
                value={groupForm.name}
              />
            </PlannerField>

            <PlannerField label={t("groupColorLabel")}>
              <div className="grid gap-3 rounded-md border border-[var(--input-border)] bg-[var(--input-background)] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  {EXPENSE_CATEGORY_COLOR_GROUPS.map((group) => (
                    <button
                      aria-label={t("chooseGroupColorFamily", { color: colorGroupLabel(group.name) })}
                      className={cx(
                        "h-8 w-8 rounded-md border transition",
                        selectedColorGroupName === group.name
                          ? "border-[var(--text-strong)] ring-2 ring-black/10 dark:ring-white/10"
                          : "border-[var(--input-border)] hover:border-[var(--border-strong)]",
                      )}
                      key={group.name}
                      onClick={() => {
                        setSelectedColorGroupName(group.name);
                        setGroupForm((currentGroup) => ({ ...currentGroup, color: group.base }));
                      }}
                      style={{ backgroundColor: group.base }}
                      type="button"
                    />
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border-muted)] pt-3">
                  {(EXPENSE_CATEGORY_COLOR_GROUPS.find((group) => group.name === selectedColorGroupName) ??
                    findColorGroup(groupForm.color)
                  ).shades.map((color) => (
                    <button
                      aria-label={t("chooseGroupColorShade", { value: color })}
                      className={cx(
                        "h-8 w-8 rounded-md border transition",
                        groupForm.color.toLowerCase() === color.toLowerCase()
                          ? "border-[var(--text-strong)] ring-2 ring-black/10 dark:ring-white/10"
                          : "border-[var(--input-border)] hover:border-[var(--border-strong)]",
                      )}
                      key={color}
                      onClick={() => setGroupForm((currentGroup) => ({ ...currentGroup, color }))}
                      style={{ backgroundColor: color }}
                      type="button"
                    />
                  ))}
                </div>

                <label className="flex items-center gap-2 border-t border-[var(--border-muted)] pt-3 text-xs text-[var(--text-muted)]">
                  <span>{t("customColor")}</span>
                  <input
                    className="h-8 w-12 rounded-md border border-[var(--input-border)] bg-[var(--input-background)] p-1 focus:border-[var(--focus-ring)] focus:outline-none"
                    onChange={(changeEvent) => {
                      const nextColor = changeEvent.target.value;

                      setGroupForm((currentGroup) => ({ ...currentGroup, color: nextColor }));
                      setSelectedColorGroupName(findColorGroup(nextColor).name);
                    }}
                    type="color"
                    value={groupForm.color}
                  />
                  <span className="font-mono uppercase">{groupForm.color}</span>
                </label>
              </div>
            </PlannerField>

            <PlannerFormActions
              disabled={isSavingGroup}
              error={null}
              onCancel={closeGroupDialog}
              primaryLabel={isSavingGroup ? t("saving") : groupForm.id === NEW_GROUP_OPTION ? t("saveGroup") : t("saveChanges")}
              secondaryLabel={t("cancel")}
            />
          </form>
        </PlannerDialog>
      ) : null}

      <div className="order-2 lg:order-1" id="home-calendar" ref={calendarSectionRef}>
        <div className="overflow-hidden rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] shadow-[var(--shadow-soft)]">
          <div className="flex flex-col gap-3 border-b border-[var(--border-muted)] bg-[var(--surface-secondary)] px-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    aria-label={t("previousMonth")}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-[var(--accent-sage-border)] bg-[var(--accent-sage-surface)] text-[var(--accent-sage-text)] transition hover:bg-[var(--surface-muted)] sm:h-9 sm:w-9"
                    onClick={() => goToMonth(-1)}
                    type="button"
                  >
                    <ChevronLeft aria-hidden className="h-4 w-4" />
                  </button>
                  <button
                    aria-label={t("nextMonth")}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-[var(--accent-sage-border)] bg-[var(--accent-sage-surface)] text-[var(--accent-sage-text)] transition hover:bg-[var(--surface-muted)] sm:h-9 sm:w-9"
                    onClick={() => goToMonth(1)}
                    type="button"
                  >
                    <ChevronRight aria-hidden className="h-4 w-4" />
                  </button>
                </div>
                <div className="min-w-0">
                  <p className="font-serif text-2xl font-semibold tracking-normal text-[var(--text-strong)]">
                    {monthFormatter.format(createDate(visibleMonth.year, visibleMonth.monthIndex, 1))}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-subtle)]">{t("calendarAtGlance")}</p>
                </div>
              </div>
              <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
                <button
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[var(--border-strong)] bg-[var(--surface-primary)] px-3 text-sm font-semibold text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] sm:h-9 sm:w-auto sm:shrink-0"
                  onClick={openGroupDialog}
                  type="button"
                >
                  <Settings aria-hidden className="h-4 w-4" />
                  {t("groupsLabel")}
                </button>
                {!selectedDateIsToday ? (
                  <button
                    className="inline-flex h-10 w-full items-center justify-center rounded-md border border-[var(--accent-sun-border)] bg-[var(--accent-sun-surface)] px-3 text-sm font-semibold text-[var(--accent-sun-text)] transition hover:brightness-105 sm:h-9 sm:w-auto sm:shrink-0"
                    onClick={goToToday}
                    type="button"
                  >
                    {t("today")}
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-[var(--border-muted)] bg-[var(--surface-muted)]">
            {Array.from({ length: 7 }, (_, index) => addDays(createDate(2024, 0, 1), index)).map((weekday) => (
              <div
                className="px-1 py-2.5 text-center text-[10px] font-bold uppercase tracking-normal text-[var(--text-muted)] sm:px-2 sm:py-3 sm:text-[11px]"
                key={weekday.toISOString()}
              >
                {shortWeekdayFormatter.format(weekday)}
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
                    "relative min-h-[68px] border-b border-r border-[var(--border-muted)] p-1.5 sm:min-h-[100px] sm:p-2 xl:min-h-[130px]",
                    index % 7 === 6 && "border-r-0",
                    index >= monthDays.length - 7 && "border-b-0",
                    isSelectedDate
                      ? "bg-[var(--accent-sage-surface)] shadow-[inset_0_0_0_1px_var(--accent-sage-strong)]"
                      : isCurrentMonth
                        ? "bg-[var(--surface-primary)]"
                        : "bg-[var(--page-background)] text-[var(--text-subtle)]",
                  )}
                  key={dateKey}
                >
                  <button
                    aria-label={t("selectDate", { date: fullDateFormatter.format(date) })}
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
                          "pointer-events-auto inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold sm:h-7 sm:w-7 sm:text-sm",
                          isToday
                            ? "bg-[var(--surface-strong)] text-[var(--text-on-strong)]"
                            : isCurrentMonth
                              ? "text-[var(--text-primary)]"
                              : "text-[var(--text-subtle)]",
                        )}
                        onClick={() => selectDate(dateKey)}
                        type="button"
                      >
                        {date.getUTCDate()}
                      </button>
                      <div className="flex items-center gap-1">
                        {index % 7 === 0 ? (
                          <span className="hidden pt-1 text-[10px] font-semibold uppercase tracking-normal text-[var(--text-subtle)] xl:block">
                            {t("weekNumber", { week: getIsoWeek(date) })}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {counts?.total ? (
                      <>
                        <div className="mt-2 flex items-center gap-1 sm:mt-3 sm:gap-1.5">
                          {counts.calendar > 0 ? (
                            <span
                              aria-label={t("calendarItemCount", { count: counts.calendar })}
                              className="h-2 w-2 rounded-full sm:h-2.5 sm:w-2.5"
                              style={{ backgroundColor: sourceDotColor("calendar") }}
                            />
                          ) : null}
                          {counts.chore > 0 ? (
                            <span
                              aria-label={t("choreCount", { count: counts.chore })}
                              className="h-2 w-2 rounded-full sm:h-2.5 sm:w-2.5"
                              style={{ backgroundColor: sourceDotColor("chore") }}
                            />
                          ) : null}
                          {counts.todo > 0 ? (
                            <span
                              aria-label={t("todoItemCount", { count: counts.todo })}
                              className="h-2 w-2 rounded-full sm:h-2.5 sm:w-2.5"
                              style={{ backgroundColor: sourceDotColor("todo") }}
                            />
                          ) : null}
                        </div>
                        {counts.calendar > 0 ? (
                          <div className="mt-2">
                            <span className="rounded-full border border-[var(--border-strong)] bg-[var(--surface-primary)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
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

      <div className="order-1 rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 shadow-[var(--shadow-soft)] lg:order-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[var(--accent-rose-text)]">
              {selectedDateIsToday ? t("whatsComingUp") : weekdayFormatter.format(selectedDate)}
            </p>
            <h2 className="mt-1 font-serif text-xl font-semibold tracking-normal text-[var(--text-strong)]">
              {selectedDateIsToday ? t("nextSevenDays") : fullDateFormatter.format(selectedDate)}
            </h2>
            {!selectedDateIsToday ? (
              <p className="mt-2 text-sm font-medium text-[var(--text-subtle)]">
                {selectedDayItems.length === 0
                  ? t("nothingScheduledYet")
                  : t("thingsOnDay", { count: selectedDayItems.length })}
              </p>
            ) : null}
          </div>
          {!isComposerOpen ? (
            <button
              className="inline-flex h-10 items-center justify-center rounded-md border border-[var(--accent-sage-border)] bg-[var(--accent-sage-surface)] px-4 text-sm font-semibold text-[var(--accent-sage-text)] transition hover:bg-[var(--surface-secondary)]"
              onClick={() => setShowCreateMenu(true)}
              type="button"
            >
              {t("addButton")}
            </button>
          ) : null}
        </div>

        {selectedDateIsToday ? (
          agendaDays.length > 0 ? (
            <div className="mt-5 grid gap-4">
              {agendaDays.map((day) => (
                <section
                  className={cx(
                    "rounded-md border bg-[var(--surface-muted)] transition",
                    day.dateKey === effectiveSelectedAgendaDateKey
                      ? "border-[var(--accent-sage-border)] shadow-[var(--shadow-soft)]"
                      : "border-[var(--border-muted)]",
                  )}
                  key={day.dateKey}
                  ref={(node) => {
                    agendaSectionRefs.current[day.dateKey] = node;
                  }}
                >
                  <div className="border-b border-[var(--border-muted)] px-4 py-3">
                    <button
                      className="font-serif text-left text-lg font-semibold tracking-normal text-[var(--text-primary)]"
                      onClick={() => selectDate(day.dateKey)}
                      type="button"
                    >
                      {agendaDateLabel(day.dateKey, todayKey, t, agendaDateFormatter)}
                    </button>
                  </div>
                  <div className="grid divide-y divide-[#e3ded6]">
                    {day.items.map((item) => {
                      const styles = sourceStyles[item.source];
                      const meta = plannerItemMeta(item, t);
                      const calendarEvent =
                        item.source === "calendar"
                          ? (eventsByDate[item.dateKey] ?? []).find((event) => event.id === item.id) ?? null
                          : null;
                      const itemContent = (
                        <>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="text-[15px] font-semibold leading-6 text-[var(--text-primary)]">
                                {item.title}
                              </h3>
                              <div className="mt-2">
                                <PlannerItemBadge
                                  chipClassName={styles.chip}
                                  label={t(styles.labelKey)}
                                  meta={meta}
                                  uppercase
                                />
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              {calendarEvent ? (
                                <DashboardCalendarEventMobileMenu
                                  isDeleting={isDeletingEventId === calendarEvent.id}
                                  onDelete={() => deleteEvent(calendarEvent.id)}
                                  onEdit={() => openEditor(calendarEvent)}
                                  t={t}
                                />
                              ) : null}
                              {item.member ? (
                                <PlannerMemberAvatar
                                  member={item.member}
                                  sizeClassName="flex h-8 w-8 items-center justify-center rounded-md border text-[11px] font-semibold"
                                />
                              ) : null}
                            </div>
                          </div>
                        </>
                      );

                      if (item.source === "calendar") {
                        return (
                          <div
                            className="group flex items-start gap-3 px-4 py-4 transition hover:bg-[var(--surface-secondary)]"
                            key={`${item.source}-${item.id}`}
                          >
                            <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                              <button
                                className="min-w-0 flex-1 text-left"
                                onClick={() => focusCalendarDate(item.dateKey)}
                                type="button"
                              >
                                <div className="min-w-0">
                                  <h3 className="text-[15px] font-semibold leading-6 text-[var(--text-primary)]">
                                    {item.title}
                                  </h3>
                                  <div className="mt-2">
                                    <PlannerItemBadge
                                      chipClassName={styles.chip}
                                      label={t(styles.labelKey)}
                                      meta={meta}
                                      uppercase
                                    />
                                  </div>
                                </div>
                              </button>
                              <div className="flex shrink-0 items-center gap-2">
                                {calendarEvent ? (
                                  <DashboardCalendarEventMobileMenu
                                    isDeleting={isDeletingEventId === calendarEvent.id}
                                    onDelete={() => deleteEvent(calendarEvent.id)}
                                    onEdit={() => openEditor(calendarEvent)}
                                    t={t}
                                  />
                                ) : null}
                                {item.member ? (
                                  <PlannerMemberAvatar
                                    member={item.member}
                                    sizeClassName="flex h-8 w-8 items-center justify-center rounded-md border text-[11px] font-semibold"
                                  />
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <Link
                          className="group block cursor-pointer px-4 py-4 transition hover:bg-[var(--surface-secondary)]"
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
            <div className="mt-5 rounded-md border border-dashed border-[var(--border-strong)] bg-[var(--surface-muted)] p-5">
              <p className="font-serif text-xl font-semibold tracking-normal text-[var(--text-primary)]">
                {t("noUpcomingItems")}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--accent-sage-border)] bg-[var(--accent-sage-surface)] px-3 text-sm font-medium text-[var(--accent-sage-text)] transition hover:bg-[var(--surface-secondary)]"
                  onClick={() => focusCalendarDate(todayKey)}
                  type="button"
                >
                  {t("calendarLabel")}
                </button>
                <Link
                  className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--border-strong)] bg-[var(--surface-primary)] px-3 text-sm font-medium text-[var(--text-muted)] transition hover:bg-[var(--surface-secondary)]"
                  href="/app/chores"
                >
                  {t("chores")}
                </Link>
                <Link
                  className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--border-strong)] bg-[var(--surface-primary)] px-3 text-sm font-medium text-[var(--text-muted)] transition hover:bg-[var(--surface-secondary)]"
                  href="/app/todos"
                >
                  {t("tasks")}
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
                      t={t}
                    />
                  );
                }

                const styles = sourceStyles[item.source];
                const meta = plannerItemMeta(item, t);

                return (
                  <article
                    className="group rounded-md border border-[#e3ded6] bg-[#fbfaf6] p-4 transition hover:bg-[#f4f1ea]"
                    key={`${item.source}-${item.id}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link className="block" href={item.href}>
                          <PlannerItemBadge chipClassName={styles.chip} label={t(styles.labelKey)} meta={meta} />
                          <h3 className="mt-2 text-base font-semibold text-[#202321]">{item.title}</h3>
                          {item.member ? (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              <PlannerMemberAvatar
                                member={item.member}
                                sizeClassName="flex h-7 w-7 items-center justify-center rounded-md border text-[11px] font-semibold"
                              />
                            </div>
                          ) : null}
                        </Link>
                      </div>
                      <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                        {item.source === "todo" ? (
                          <PlannerIconButton onClick={() => openTodoEditor(item)} title={t("editTask")}>
                            <Pencil aria-hidden className="h-3.5 w-3.5" />
                          </PlannerIconButton>
                        ) : (
                          <PlannerIconButton
                            disabled={isDeletingScheduledItemId === item.id}
                            onClick={() => router.push(`/app/chores?edit=${item.id}`)}
                            title={t("editChore")}
                          >
                            <Pencil aria-hidden className="h-3.5 w-3.5" />
                          </PlannerIconButton>
                        )}
                        <PlannerDeleteButton
                          disabled={isDeletingScheduledItemId === item.id}
                          isDeleting={isDeletingScheduledItemId === item.id}
                          onClick={() => deleteScheduledItem(item)}
                          title={item.source === "todo" ? t("deleteTask") : t("deleteChore")}
                        />
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="rounded-md border border-dashed border-[var(--input-border)] bg-[var(--surface-muted)] p-5">
                <p className="font-serif text-xl font-semibold tracking-normal text-[var(--text-strong)]">
                  {t("nothingOnTable")}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                  {t("openDaySummary")}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {isComposerOpen ? (
        <PlannerDialog labelledBy="dashboard-calendar-event-dialog-title">
          <div className="sr-only" id="dashboard-calendar-event-dialog-title">
            {editingEventId ? t("editEvent") : t("addEvent")}
          </div>
          {renderEventForm()}
        </PlannerDialog>
      ) : null}

      {showCreateMenu ? (
        <PlannerDialog labelledBy="dashboard-create-entry-title">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[var(--accent-rose-text)]">
                {t("addSomething")}
              </p>
              <h2
                className="mt-1 font-serif text-2xl font-semibold tracking-normal text-[var(--text-strong)]"
                id="dashboard-create-entry-title"
              >
                {t("pickWhatToAdd")}
              </h2>
            </div>
            <button
              aria-label={t("closeAddMenu")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--input-border)] bg-[var(--input-background)] text-xl font-semibold leading-none text-[var(--text-muted)] transition hover:bg-[var(--surface-secondary)]"
              onClick={() => setShowCreateMenu(false)}
              type="button"
            >
              <span aria-hidden>&times;</span>
            </button>
          </div>

          <div className="mt-5 grid gap-2">
            <button
              className="flex items-center rounded-md border border-[var(--accent-sage-border)] bg-[var(--accent-sage-surface)] px-4 py-3 text-left transition hover:bg-[var(--surface-secondary)]"
              onClick={() => {
                setShowCreateMenu(false);
                openComposer(selectedDateKey);
              }}
              type="button"
            >
              <span>
                <span className="block text-sm font-semibold text-[var(--accent-sage-text)]">{t("eventLabel")}</span>
                <span className="mt-1 block text-xs text-[var(--text-muted)]">{t("eventDescription")}</span>
              </span>
            </button>

            <PlannerQuickActionLink
              description={t("taskDescription")}
              href="/app/todos?create=1"
              label={t("taskLabel")}
              onClick={() => setShowCreateMenu(false)}
            />

            <PlannerQuickActionLink
              description={t("choreDescription")}
              href="/app/chores?create=1"
              label={t("choreLabel")}
              onClick={() => setShowCreateMenu(false)}
            />
          </div>
        </PlannerDialog>
      ) : null}

      {editingTodo ? (
        <PlannerDialog labelledBy="dashboard-todo-editor-title">
          {(() => {
            const todoFields: PlannerFieldDefinition[] = [
              plannerInputFieldDefinition("name", t("nameLabel"), {
                  onChange: (event) => setTodoText(event.target.value),
                  required: true,
                  type: "text",
                  value: todoText,
                }),
              plannerInputFieldDefinition("dueDate", t("dueDateLabel"), {
                  onChange: (event) => setTodoDueDate(event.target.value),
                  required: true,
                  type: "date",
                  value: todoDueDate,
                }),
              plannerSelectFieldDefinition("assigned", t("assignedToLabel"), {
                  id: "dashboard-todo-member",
                  onChange: (nextValue) => setTodoMemberId(nextValue || null),
                  options: [
                    { label: t("unassigned"), value: "" },
                    ...calendarMembers.map((member) => ({
                      label: memberLabel(member, t),
                      value: member.id,
                    })),
                  ],
                  placeholder: t("unassigned"),
                  value: todoMemberId ?? "",
                }),
            ];

            return (
          <form className="grid gap-4" onSubmit={saveTodoEdit}>
            <PlannerEditorHeader
              closeLabel={t("closeTaskEditor")}
              description={editingTodo.listName}
              disabled={isSavingTodo}
              eyebrow={t("todoLabel")}
              onClose={closeTodoEditor}
              title={t("editTask")}
              titleId="dashboard-todo-editor-title"
            />

            <PlannerFieldList fields={todoFields} />

            <PlannerFormActions
              disabled={isSavingTodo}
              error={todoFormError}
              onCancel={closeTodoEditor}
              primaryLabel={isSavingTodo ? t("saving") : t("saveChanges")}
              secondaryLabel={t("cancel")}
            />
          </form>
            );
          })()}
        </PlannerDialog>
      ) : null}
    </section>
  );
}
