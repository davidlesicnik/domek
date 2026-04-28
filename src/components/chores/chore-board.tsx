"use client";

import type { ChoreAssignmentType, ChoreIntervalUnit, ChoreRecurrenceType } from "@prisma/client";
import { Check, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from "react";

import { MemberAvatar } from "@/components/ui/member-avatar";
import type { ChoreCategoryView, ChoreMemberView, ChoreView } from "@/lib/chores";

type ChoreBoardProps = Readonly<{
  autoOpenCreate?: boolean;
  autoOpenEditId?: string | null;
  categories: ChoreCategoryView[];
  initialChores: ChoreView[];
  members: ChoreMemberView[];
}>;

type CreateChoreFormState = {
  name: string;
  categoryId: string;
  newCategoryName: string;
  assignmentType: ChoreAssignmentType;
  assignedHouseholdMemberId: string;
  rotationMemberIds: string[];
  recurrenceType: ChoreRecurrenceType;
  startsAt: string;
  weeklyDays: number[];
  intervalValue: string;
  intervalUnit: ChoreIntervalUnit;
};

type TouchedState = {
  name: boolean;
};

type ChoreDueGroup = "overdue" | "today" | "upcoming";

const WEEKDAY_OPTIONS = [
  { key: "sunday", value: 0 },
  { key: "monday", value: 1 },
  { key: "tuesday", value: 2 },
  { key: "wednesday", value: 3 },
  { key: "thursday", value: 4 },
  { key: "friday", value: 5 },
  { key: "saturday", value: 6 },
] as const;

const DEFAULT_CUSTOM_INTERVAL_UNIT: ChoreIntervalUnit = "WEEKS";
type WeekdayKey = (typeof WEEKDAY_OPTIONS)[number]["key"];
type WeekdayLabels = Record<WeekdayKey, { long: string; short: string }>;
type ChoresTranslator = ReturnType<typeof useTranslations>;

function todayDateInputValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function defaultForm(): CreateChoreFormState {
  return {
    name: "",
    categoryId: "",
    newCategoryName: "",
    assignmentType: "UNASSIGNED",
    assignedHouseholdMemberId: "",
    rotationMemberIds: [],
    recurrenceType: "WEEKLY",
    startsAt: todayDateInputValue(),
    weeklyDays: [new Date().getDay()],
    intervalValue: "1",
    intervalUnit: DEFAULT_CUSTOM_INTERVAL_UNIT,
  };
}

function displayNameForMember(member: ChoreMemberView, fallback: string): string {
  return member.name ?? member.email ?? fallback;
}

function firstNameForMember(member: ChoreMemberView, fallback: string): string {
  const label = displayNameForMember(member, fallback).trim();
  const [firstToken] = label.split(/\s+/);
  return firstToken || label;
}

function joinNatural(items: string[], locale: string): string {
  if (items.length === 0) return "";
  return new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(items);
}

function formatWeekdays(weekdays: number[], locale: string, weekdayLabels: WeekdayLabels): string {
  const labels: string[] = [];

  [...new Set(weekdays)]
    .sort((a, b) => a - b)
    .forEach((day) => {
      const key = WEEKDAY_OPTIONS.find((option) => option.value === day)?.key;
      const label = key ? weekdayLabels[key].long : null;
      if (label) labels.push(label);
    });

  return joinNatural(labels, locale);
}

function formatCompactIntervalLabel(
  chore: Pick<ChoreView, "recurrenceType" | "weeklyDays" | "intervalValue" | "intervalUnit">,
  t: ChoresTranslator,
  weekdayLabels: WeekdayLabels,
) {
  if (chore.recurrenceType === "DAILY") return t("recurrenceDaily");
  if (chore.recurrenceType === "MONTHLY") return t("recurrenceMonthly");
  if (chore.recurrenceType === "WEEKLY") {
    const labels = [...new Set(chore.weeklyDays)]
      .sort((a, b) => a - b)
      .map((day) => {
        const key = WEEKDAY_OPTIONS.find((option) => option.value === day)?.key;
        return key ? weekdayLabels[key].short : undefined;
      })
      .filter((label): label is string => label !== undefined);

    return labels.join(" · ");
  }

  if (chore.intervalUnit === "DAYS") return t("customIntervalDays", { count: chore.intervalValue });
  if (chore.intervalUnit === "MONTHS") return t("customIntervalMonths", { count: chore.intervalValue });
  return t("customIntervalWeeks", { count: chore.intervalValue });
}

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function startOfDayUtc(dateIso: string): Date {
  const dueDate = new Date(dateIso);
  return new Date(Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate()));
}

function dueDateLabel(dateIso: string, t: ChoresTranslator) {
  const dueDate = startOfDayUtc(dateIso);
  const daysDiff = Math.floor((dueDate.getTime() - startOfTodayUtc().getTime()) / (24 * 60 * 60 * 1000));

  if (daysDiff < 0) {
    return t("daysOverdue", { count: Math.abs(daysDiff) });
  }

  if (daysDiff === 0) {
    return t("dueToday");
  }

  if (daysDiff === 1) {
    return t("dueTomorrow");
  }

  return t("dueInDays", { count: daysDiff });
}

function dueGroup(dateIso: string): ChoreDueGroup {
  const dueDate = startOfDayUtc(dateIso);
  const daysDiff = Math.floor((dueDate.getTime() - startOfTodayUtc().getTime()) / (24 * 60 * 60 * 1000));
  if (daysDiff < 0) return "overdue";
  if (daysDiff === 0) return "today";
  return "upcoming";
}

function dueDateTone(dateIso: string, t: ChoresTranslator) {
  const dueDate = startOfDayUtc(dateIso);
  const daysDiff = Math.floor((dueDate.getTime() - startOfTodayUtc().getTime()) / (24 * 60 * 60 * 1000));

  if (daysDiff < 0) {
    const overdueLabel = t("daysOverdue", { count: Math.abs(daysDiff) });
    return {
      emphasis: "strong" as const,
      badge: "border-[#e7c9c2] bg-[#fbefeb] text-[#8d3028]",
      label: overdueLabel,
      text: overdueLabel,
      row: "bg-[#fffaf8]",
    };
  }

  if (daysDiff === 0) {
    return {
      emphasis: "strong" as const,
      badge: "border-[#e5dcc5] bg-[#fbf7ea] text-[#735316]",
      label: t("dueToday"),
      text: t("dueToday"),
      row: "bg-[#fffdf7]",
    };
  }

  const label = dueDateLabel(dateIso, t);
  return {
    emphasis: "soft" as const,
    badge: "border-[#dde2dc] bg-[#f7f9f6] text-[#6b736d]",
    label,
    text: label,
    row: "",
  };
}

function isOverdue(dateIso: string): boolean {
  return startOfDayUtc(dateIso).getTime() < startOfTodayUtc().getTime();
}

function compareChores(a: ChoreView, b: ChoreView): number {
  const aOverdue = isOverdue(a.nextDueAt);
  const bOverdue = isOverdue(b.nextDueAt);

  if (aOverdue !== bOverdue) {
    return aOverdue ? -1 : 1;
  }

  const dueCompare = new Date(a.nextDueAt).getTime() - new Date(b.nextDueAt).getTime();
  if (dueCompare !== 0) return dueCompare;

  return a.name.localeCompare(b.name);
}

function parseDateInput(value: string): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return Number.isNaN(date.getTime()) ? null : date;
}

function weekdayForDateInput(value: string): number | null {
  const date = parseDateInput(value);
  return date ? date.getUTCDay() : null;
}

function alignDateInputToWeeklyDays(value: string, weeklyDays: number[]): string {
  const date = parseDateInput(value);
  const allowedDays = [...new Set(weeklyDays)].sort((a, b) => a - b);

  if (!date || allowedDays.length === 0) return value;
  if (allowedDays.includes(date.getUTCDay())) return value;

  for (let offset = 1; offset <= 7; offset += 1) {
    const candidate = new Date(date.getTime());
    candidate.setUTCDate(candidate.getUTCDate() + offset);

    if (allowedDays.includes(candidate.getUTCDay())) {
      const year = candidate.getUTCFullYear();
      const month = `${candidate.getUTCMonth() + 1}`.padStart(2, "0");
      const day = `${candidate.getUTCDate()}`.padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  }

  return value;
}

function formatDateInputForMessage(value: string, locale: string): string {
  const date = parseDateInput(value);
  if (!date) return value;

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function previewDueDate(form: CreateChoreFormState): Date | null {
  return parseDateInput(form.startsAt);
}

function formatPreviewDate(date: Date | null, locale: string, t: ChoresTranslator): string {
  if (!date) return t("previewDateFallback");

  return new Intl.DateTimeFormat(locale, {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function previewAssignment(
  form: CreateChoreFormState,
  membersById: Map<string, ChoreMemberView>,
  memberFallback: string,
  locale: string,
  t: ChoresTranslator,
): string {
  if (form.assignmentType === "UNASSIGNED") {
    return t("unassigned");
  }

  if (form.assignmentType === "FIXED") {
    const member = form.assignedHouseholdMemberId ? membersById.get(form.assignedHouseholdMemberId) : null;
    if (!member) return t("previewChooseFixed");
    return t("previewFixed", { name: firstNameForMember(member, memberFallback) });
  }

  const names = form.rotationMemberIds
    .map((memberId) => membersById.get(memberId))
    .filter((member): member is ChoreMemberView => Boolean(member))
    .map((member) => firstNameForMember(member, memberFallback));

  if (names.length === 0) return t("previewChooseRotation");
  return t("previewRotating", { names: joinNatural(names, locale) });
}

function previewSchedule(form: CreateChoreFormState, locale: string, t: ChoresTranslator, weekdayLabels: WeekdayLabels): string {
  if (form.recurrenceType === "DAILY") return t("previewDaily");
  if (form.recurrenceType === "MONTHLY") return t("previewMonthly");
  if (form.recurrenceType === "WEEKLY") {
    return form.weeklyDays.length > 0
      ? t("previewWeekly", { weekdays: formatWeekdays(form.weeklyDays, locale, weekdayLabels) })
      : t("previewWeeklyFallback");
  }

  const intervalValue = Number(form.intervalValue);
  if (!Number.isInteger(intervalValue) || intervalValue < 1) return t("previewCustomFallback");

  if (form.intervalUnit === "DAYS") return t("customIntervalDays", { count: intervalValue });
  if (form.intervalUnit === "MONTHS") return t("customIntervalMonths", { count: intervalValue });
  return t("customIntervalWeeks", { count: intervalValue });
}

function validateName(value: string, t: ChoresTranslator): string | null {
  return value.trim() ? null : t("errorNameRequired");
}

function formFromChore(chore: ChoreView): CreateChoreFormState {
  return {
    name: chore.name,
    categoryId: chore.categoryName ?? "",
    newCategoryName: "",
    assignmentType: chore.assignmentType,
    assignedHouseholdMemberId: chore.assignedHouseholdMemberId ?? "",
    rotationMemberIds: chore.rotationMemberIds,
    recurrenceType: chore.recurrenceType,
    startsAt: chore.startsAt.slice(0, 10),
    weeklyDays: chore.weeklyDays,
    intervalValue: String(chore.intervalValue),
    intervalUnit: chore.intervalUnit,
  };
}

type SelectOption = {
  label: string;
  value: string;
};

function CustomSelect({
  id,
  onChange,
  options,
  placeholder = "Select",
  value,
}: {
  id: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  value: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectedOption = options.find((option) => option.value === value);
  const listboxId = `${id}-listbox`;

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) return;
      setIsOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div
      className="relative w-full [--select-bg:#f8f6f1] [--select-border:#e6e1d8] [--select-hover-border:#d3cec4] [--select-panel:#fffdf8] [--select-text:#4d5451]"
      ref={rootRef}
    >
      <button
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="flex w-full items-center justify-between gap-2 rounded-md border border-[var(--select-border)] bg-[var(--select-bg)] px-3 py-2 text-left text-sm text-[var(--select-text)] transition hover:border-[var(--select-hover-border)] focus:border-[#6e9274] focus:outline-none"
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
        <span className={selectedOption ? "truncate" : "truncate text-[#9da39f]"}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronRight
          aria-hidden
          className={`h-4 w-4 shrink-0 text-[#8e948f] transition-transform ${isOpen ? "-rotate-90" : "rotate-90"}`}
        />
      </button>
      {isOpen ? (
        <div
          className="absolute left-0 right-0 top-[calc(100%+0.25rem)] z-[70] max-h-60 overflow-y-auto rounded-md border border-[var(--select-border)] bg-[var(--select-panel)] p-1 shadow-[0_16px_34px_rgba(31,35,30,0.18)]"
          id={listboxId}
          role="listbox"
        >
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                aria-selected={isSelected}
                className={`flex w-full items-center rounded-[6px] px-2.5 py-2 text-left text-sm transition ${
                  isSelected ? "bg-[#eef6ef] text-[#2f4e35]" : "text-[#4d5451] hover:bg-[#f4f1ea]"
                }`}
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                role="option"
                type="button"
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function compactAssignmentLabel(
  chore: ChoreView,
  membersById: Map<string, ChoreMemberView>,
  memberFallback: string,
  t: ChoresTranslator,
): string {
  if (chore.assignmentType === "UNASSIGNED") return t("unassigned");

  if (chore.assignmentType === "FIXED") {
    const member = chore.assignedHouseholdMemberId ? membersById.get(chore.assignedHouseholdMemberId) : null;
    if (member) return firstNameForMember(member, memberFallback);

    const fallback = chore.assignedHouseholdMemberName?.trim() ?? t("assigned");
    return fallback.split(/\s+/)[0] ?? fallback;
  }

  const member = chore.assignedHouseholdMemberId ? membersById.get(chore.assignedHouseholdMemberId) : null;
  if (member) return t("nextAssignee", { name: firstNameForMember(member, memberFallback) });

  const fallback = chore.assignedHouseholdMemberName?.trim();
  if (fallback) return t("nextAssignee", { name: fallback.split(/\s+/)[0] ?? fallback });

  return t("rotating");
}

export function ChoreBoard({
  autoOpenCreate = false,
  autoOpenEditId = null,
  categories: initialCategories,
  initialChores,
  members,
}: ChoreBoardProps) {
  const t = useTranslations("choresPage");
  const locale = useLocale();
  const [chores, setChores] = useState<ChoreView[]>(initialChores);
  const [categories, setCategories] = useState<ChoreCategoryView[]>(initialCategories);
  const [form, setForm] = useState<CreateChoreFormState>(() => defaultForm());
  const [touched, setTouched] = useState<TouchedState>({ name: false });
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(autoOpenCreate);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [completingChoreIds, setCompletingChoreIds] = useState<string[]>([]);
  const [weeklyDateAdjustmentMessage, setWeeklyDateAdjustmentMessage] = useState<string | null>(null);
  const [isSubmitting, startSubmitTransition] = useTransition();
  const [isCompleting, startCompleteTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const consumedAutoOpenEditIdRef = useRef<string | null>(null);

  const orderedChores = useMemo(() => [...chores].sort(compareChores), [chores]);
  const groupedChores = useMemo(
    () => ({
      overdue: orderedChores.filter((chore) => dueGroup(chore.nextDueAt) === "overdue"),
      today: orderedChores.filter((chore) => dueGroup(chore.nextDueAt) === "today"),
      upcoming: orderedChores.filter((chore) => dueGroup(chore.nextDueAt) === "upcoming"),
    }),
    [orderedChores],
  );
  const membersById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);
  const memberFallback = t("memberFallback");
  const weekdayLabels = useMemo<WeekdayLabels>(
    () => ({
      friday: { long: t("weekdayFridayLong"), short: t("weekdayFridayShort") },
      monday: { long: t("weekdayMondayLong"), short: t("weekdayMondayShort") },
      saturday: { long: t("weekdaySaturdayLong"), short: t("weekdaySaturdayShort") },
      sunday: { long: t("weekdaySundayLong"), short: t("weekdaySundayShort") },
      thursday: { long: t("weekdayThursdayLong"), short: t("weekdayThursdayShort") },
      tuesday: { long: t("weekdayTuesdayLong"), short: t("weekdayTuesdayShort") },
      wednesday: { long: t("weekdayWednesdayLong"), short: t("weekdayWednesdayShort") },
    }),
    [t],
  );
  const categoryOptions = useMemo<SelectOption[]>(
    () => [
      { label: t("noCategory"), value: "" },
      ...categories.map((category) => ({ label: category.name, value: category.name })),
      { label: t("newCategoryOption"), value: "__new__" },
    ],
    [categories, t],
  );
  const previewAssignmentText = previewAssignment(form, membersById, memberFallback, locale, t);
  const nameError = touched.name ? validateName(form.name, t) : null;
  const submitDisabled = isSubmitting || !form.name.trim();
  const headerSummary =
    groupedChores.today.length === 0
      ? t("headerSummaryNoneToday", { count: groupedChores.upcoming.length })
      : t("headerSummaryDueToday", { today: groupedChores.today.length, upcoming: groupedChores.upcoming.length });

  useEffect(() => {
    if (!autoOpenEditId || consumedAutoOpenEditIdRef.current === autoOpenEditId) {
      return;
    }

    const matchingChore = chores.find((chore) => chore.id === autoOpenEditId);

    if (matchingChore) {
      openEditDialog(matchingChore);
    }

    consumedAutoOpenEditIdRef.current = autoOpenEditId;
  }, [autoOpenEditId, chores]);

  function applyChoreUpdate(updatedChore: ChoreView) {
    setChores((current) => {
      const existingIndex = current.findIndex((chore) => chore.id === updatedChore.id);
      if (existingIndex === -1) {
        return [...current, updatedChore].sort(compareChores);
      }

      const next = [...current];
      next[existingIndex] = updatedChore;
      return next.sort(compareChores);
    });
  }

  function openCreateDialog() {
    setError(null);
    setEditingId(null);
    setConfirmDeleteId(null);
    setWeeklyDateAdjustmentMessage(null);
    setForm(defaultForm());
    setTouched({ name: false });
    setShowCreateDialog(true);
  }

  function openEditDialog(chore: ChoreView) {
    setError(null);
    setEditingId(chore.id);
    setConfirmDeleteId(null);
    setWeeklyDateAdjustmentMessage(null);
    setForm(formFromChore(chore));
    setTouched({ name: false });
    setShowCreateDialog(true);
  }

  function closeCreateDialog() {
    if (isSubmitting) return;
    setShowCreateDialog(false);
    setEditingId(null);
    setWeeklyDateAdjustmentMessage(null);
    setError(null);
  }

  function toggleRotationMember(memberId: string) {
    setForm((current) => ({
      ...current,
      rotationMemberIds: current.rotationMemberIds.includes(memberId)
        ? current.rotationMemberIds.filter((value) => value !== memberId)
        : [...current.rotationMemberIds, memberId],
    }));
  }

  function toggleWeeklyDay(day: number) {
    setForm((current) => {
      const weeklyDays = current.weeklyDays.includes(day)
        ? current.weeklyDays.filter((value) => value !== day)
        : [...current.weeklyDays, day].sort((a, b) => a - b);
      const startsAt =
        current.recurrenceType === "WEEKLY" && weeklyDays.length > 0
          ? alignDateInputToWeeklyDays(current.startsAt, weeklyDays)
          : current.startsAt;

      setWeeklyDateAdjustmentMessage(
        startsAt !== current.startsAt
          ? t("weeklyDateAdjusted", { date: formatDateInputForMessage(startsAt, locale) })
          : null,
      );

      return {
        ...current,
        startsAt,
        weeklyDays,
      };
    });
  }

  function onCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const intervalValue = Number(form.intervalValue);

    const nextNameError = validateName(form.name, t);
    if (nextNameError) {
      setTouched((current) => ({ ...current, name: true }));
      setError(nextNameError);
      return;
    }

    if (form.assignmentType === "FIXED" && !form.assignedHouseholdMemberId) {
      setError(t("errorFixedAssignee"));
      return;
    }

    if (form.assignmentType === "ROTATING" && form.rotationMemberIds.length === 0) {
      setError(t("errorRotationMembers"));
      return;
    }

    if (form.recurrenceType === "WEEKLY" && form.weeklyDays.length === 0) {
      setError(t("errorWeeklyDays"));
      return;
    }

    if (
      form.recurrenceType === "WEEKLY" &&
      form.weeklyDays.length > 0 &&
      !form.weeklyDays.includes(weekdayForDateInput(form.startsAt) ?? -1)
    ) {
      setError(t("errorWeeklyStartDate"));
      return;
    }

    if (form.recurrenceType === "CUSTOM" && (!Number.isInteger(intervalValue) || intervalValue < 1)) {
      setError(t("errorInterval"));
      return;
    }

    startSubmitTransition(async () => {
      const startsAt = parseDateInput(form.startsAt);
      if (!startsAt) {
        setError(t("errorStartsAt"));
        return;
      }

      const categoryName =
        form.categoryId === "__new__" ? form.newCategoryName.trim() || null : (form.categoryId || null);

      if (form.categoryId === "__new__" && !categoryName) {
        setError(t("errorNewCategory"));
        return;
      }

      const response = await fetch(editingId ? `/api/chores/${editingId}` : "/api/chores", {
        body: JSON.stringify({
          name: form.name.trim(),
          categoryName,
          assignmentType: form.assignmentType,
          assignedHouseholdMemberId: form.assignmentType === "FIXED" ? form.assignedHouseholdMemberId : null,
          rotationMemberIds: form.assignmentType === "ROTATING" ? form.rotationMemberIds : [],
          recurrenceType: form.recurrenceType,
          startsAt: startsAt.toISOString(),
          weeklyDays: form.recurrenceType === "WEEKLY" ? form.weeklyDays : [],
          intervalValue: form.recurrenceType === "CUSTOM" ? intervalValue : undefined,
          intervalUnit: form.recurrenceType === "CUSTOM" ? form.intervalUnit : undefined,
        }),
        headers: { "Content-Type": "application/json" },
        method: editingId ? "PATCH" : "POST",
      });

      if (!response.ok) {
        setError(editingId ? t("errorUpdate") : t("errorCreate"));
        return;
      }

      const payload = (await response.json()) as { chore: ChoreView };
      applyChoreUpdate(payload.chore);
      if (
        payload.chore.categoryId &&
        payload.chore.categoryName &&
        !categories.some((category) => category.id === payload.chore.categoryId)
      ) {
        setCategories((current) => [...current, { id: payload.chore.categoryId!, name: payload.chore.categoryName! }].sort((a, b) =>
          a.name.localeCompare(b.name),
        ));
      }
      setShowCreateDialog(false);
      setEditingId(null);
      setWeeklyDateAdjustmentMessage(null);
      setForm(defaultForm());
    });
  }

  function markComplete(choreId: string) {
    setError(null);
    setCompletingChoreIds((current) => (current.includes(choreId) ? current : [...current, choreId]));

    startCompleteTransition(async () => {
      try {
        const response = await fetch(`/api/chores/${choreId}/completions`, {
          method: "POST",
        });

        if (!response.ok) {
          setError(t("errorComplete"));
          return;
        }

        const payload = (await response.json()) as { chore: ChoreView };
        await new Promise((resolve) => window.setTimeout(resolve, 220));
        applyChoreUpdate(payload.chore);
      } finally {
        setCompletingChoreIds((current) => current.filter((id) => id !== choreId));
      }
    });
  }

  function removeChore(choreId: string) {
    setError(null);

    startDeleteTransition(async () => {
      const response = await fetch(`/api/chores/${choreId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setError(t("errorDelete"));
        return;
      }

      setChores((current) => current.filter((chore) => chore.id !== choreId));
      setConfirmDeleteId(null);
    });
  }

  const boardBusy = isSubmitting || isCompleting || isDeleting;

  return (
    <div className="grid gap-4">
      <section>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-serif text-2xl font-semibold tracking-normal text-[#171a18]">{t("title")}</h1>
            <p className="mt-0.5 text-sm text-[#6d746f]">{headerSummary}</p>
          </div>

          <button
            className="inline-flex h-9 items-center justify-center rounded-md bg-[#343734] px-3 text-sm font-semibold text-white transition hover:bg-[#454944] disabled:opacity-50"
            disabled={boardBusy}
            onClick={openCreateDialog}
            type="button"
          >
            {t("addChore")}
          </button>
        </div>

        {members.length === 0 ? (
          <p className="mt-2 text-xs text-[#686e6a]">
            {t("noPeopleNote")}
          </p>
        ) : null}

        {error ? <p className="mt-2 text-xs font-medium text-[#a6543c]">{error}</p> : null}
      </section>

      {showCreateDialog ? (
        <div
          aria-labelledby="chore-create-dialog-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#202321]/45 p-3 pb-[calc(0.75rem_+_env(safe-area-inset-bottom))] sm:items-center sm:p-4"
          role="dialog"
        >
          <form
            className="max-h-[calc(100dvh_-_1.5rem_-_env(safe-area-inset-bottom))] w-full max-w-2xl overflow-y-auto rounded-md border border-[#dedbd2] bg-[#fffdf8] p-4 shadow-[0_22px_55px_rgba(31,35,30,0.22)] sm:max-h-[calc(100dvh-2rem)] sm:p-5"
            onSubmit={onCreateSubmit}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#a6543c]">
                  {t("label")}
                </p>
                <h2
                  className="mt-1 font-serif text-2xl font-semibold tracking-normal text-[#171a18]"
                  id="chore-create-dialog-title"
                >
                  {editingId ? t("editTitle") : t("addTitle")}
                </h2>
              </div>
              <button
                aria-label={t("closeDialog")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#d8d2c8] bg-white text-xl font-semibold leading-none text-[#5d635f] transition hover:bg-[#f7f4ec]"
                disabled={isSubmitting}
                onClick={closeCreateDialog}
                type="button"
              >
                <span aria-hidden>&times;</span>
              </button>
            </div>

            {error ? (
              <p className="mb-4 rounded-md bg-[#f8e7e3] px-3 py-2 text-sm text-[#8d3028]">{error}</p>
            ) : null}

            <div className="grid gap-6">
              <section>
                <label className="mb-1 block text-xs font-semibold text-[#3c413e]" htmlFor="chore-name">
                  {t("nameLabel")}
                </label>
                <input
                  aria-describedby={nameError ? "chore-name-error" : undefined}
                  aria-invalid={nameError ? "true" : "false"}
                  className={`h-10 w-full rounded-md px-3 text-sm text-[#202321] outline-none transition focus:bg-white ${
                    nameError
                      ? "border border-[#d38171] bg-[#fff7f5] focus:border-[#c85b45]"
                      : "border border-[#cfd9cf] bg-white focus:border-[#6e9274]"
                  }`}
                  id="chore-name"
                  maxLength={200}
                  onBlur={() => setTouched((current) => ({ ...current, name: true }))}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder={t("namePlaceholder")}
                  required
                  value={form.name}
                />
                {nameError ? (
                  <p className="mt-2 text-xs text-[#a6543c]" id="chore-name-error">
                    {nameError}
                  </p>
                ) : null}
                <div className="mt-3">
                  <label className="mb-1 block text-xs font-semibold text-[#3c413e]" htmlFor="chore-category">
                    {t("categoryLabel")}
                  </label>
                  {form.categoryId === "__new__" ? (
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        className="min-w-0 flex-1 rounded-md border border-[#dfe6e0] bg-[#f8fbf7] px-3 py-2 text-sm text-[#202321] placeholder:text-[#9da39f] focus:border-[#6e9274] focus:bg-white focus:outline-none"
                        id="chore-category"
                        onChange={(event) => setForm((current) => ({ ...current, newCategoryName: event.target.value }))}
                        placeholder={t("newCategoryPlaceholder")}
                        required
                        type="text"
                        value={form.newCategoryName}
                      />
                      <button
                        aria-label={t("cancelNewCategory")}
                        className="shrink-0 rounded-md border border-[#dfe6e0] bg-white px-3 text-sm font-medium text-[#5d635f] transition hover:bg-[#f4f1ea]"
                        onClick={() => setForm((current) => ({ ...current, categoryId: "", newCategoryName: "" }))}
                        type="button"
                      >
                        {t("cancel")}
                      </button>
                    </div>
                  ) : (
                    <CustomSelect
                      id="chore-category"
                      onChange={(value) => setForm((current) => ({ ...current, categoryId: value, newCategoryName: "" }))}
                      options={categoryOptions}
                      placeholder={t("noCategory")}
                      value={form.categoryId}
                    />
                  )}
                </div>
              </section>

              <section className="border-t border-[#ece6db] pt-5">
                <h3 className="text-sm font-semibold text-[#202321]">{t("assignmentHeading")}</h3>
                <div className="mt-3 grid grid-cols-1 gap-1 rounded-md border border-[#e6e0d6] bg-[#f7f4ed] p-1 sm:grid-cols-3">
                  {[
                    { value: "UNASSIGNED", label: t("assignmentUnassigned") },
                    { value: "FIXED", label: t("assignmentFixed") },
                    { value: "ROTATING", label: t("assignmentRotating") },
                  ].map((option) => {
                    const disabled = members.length === 0 && option.value !== "UNASSIGNED";

                    return (
                      <button
                        className={`min-h-9 rounded-[6px] px-4 py-1.5 text-xs font-semibold transition ${
                          form.assignmentType === option.value
                            ? "bg-[#eaf4ea] text-[#45614c]"
                            : "bg-transparent text-[#4b514d] hover:bg-[#f1ede5]"
                        } disabled:cursor-not-allowed disabled:opacity-45`}
                        disabled={disabled}
                        key={option.value}
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            assignmentType: option.value as ChoreAssignmentType,
                            assignedHouseholdMemberId:
                              option.value === "FIXED" ? current.assignedHouseholdMemberId : "",
                            rotationMemberIds: option.value === "ROTATING" ? current.rotationMemberIds : [],
                          }))
                        }
                        type="button"
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                {form.assignmentType === "UNASSIGNED" ? (
                  <p className="mt-3 text-xs text-[#7b817d]">
                    {t("unassignedHelp")}
                  </p>
                ) : null}

                {form.assignmentType === "FIXED" ? (
                  <div className="mt-4">
                    <label className="mb-1 block text-xs font-semibold text-[#3c413e]" htmlFor="chore-person">
                      {t("whoLabel")}
                    </label>
                    <select
                      className="h-10 w-full rounded-md border border-[#dfe6e0] bg-[#f8fbf7] px-3 text-sm text-[#202321] outline-none transition focus:border-[#6e9274] focus:bg-white"
                      id="chore-person"
                      onChange={(event) =>
                        setForm((current) => ({ ...current, assignedHouseholdMemberId: event.target.value }))
                      }
                      value={form.assignedHouseholdMemberId}
                    >
                      <option value="">{t("chooseSomeone")}</option>
                      {members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {displayNameForMember(member, memberFallback)}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                {form.assignmentType === "ROTATING" ? (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold text-[#3c413e]">{t("peopleLabel")}</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {members.map((member) => {
                        const selected = form.rotationMemberIds.includes(member.id);
                        return (
                          <button
                            className={`flex items-center gap-3 rounded-md border px-3 py-2 text-left transition ${
                              selected
                                ? "border-[#6e9274] bg-[#eef7ef]"
                                : "border-[#d8d2c8] bg-white hover:border-[#b9c5b9]"
                            }`}
                            key={member.id}
                            onClick={() => toggleRotationMember(member.id)}
                            type="button"
                          >
                            <MemberAvatar
                              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-xs font-semibold"
                              color={member.color}
                              email={member.email}
                              emoji={member.emoji}
                              name={member.name}
                            />
                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#202321]">
                              {displayNameForMember(member, memberFallback)}
                            </span>
                            {selected ? <Check aria-hidden className="h-4 w-4 shrink-0 text-[#45614c]" /> : null}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-xs text-[#7b817d]">{t("rotationHelp")}</p>
                  </div>
                ) : null}

                {members.length === 0 ? (
                  <p className="mt-3 text-xs text-[#7b817d]">
                    {t("addMembersLater")}
                  </p>
                ) : null}
              </section>

              <section className="border-t border-[#ece6db] pt-5">
                <h3 className="text-sm font-semibold text-[#202321]">{t("scheduleHeading")}</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-4">
                  {[
                    { value: "DAILY", label: t("recurrenceDaily") },
                    { value: "WEEKLY", label: t("recurrenceWeekly") },
                    { value: "MONTHLY", label: t("recurrenceMonthly") },
                    { value: "CUSTOM", label: t("recurrenceCustom") },
                  ].map((option) => (
                    <button
                      className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
                        form.recurrenceType === option.value
                          ? "border-[#6e9274] bg-[#eef7ef] text-[#2f4e35]"
                          : "border-[#d8d2c8] bg-white text-[#4b514d] hover:border-[#b9c5b9]"
                      }`}
                      key={option.value}
                      onClick={() => {
                        setForm((current) => ({
                          ...current,
                          recurrenceType: option.value as ChoreRecurrenceType,
                        }));
                        setWeeklyDateAdjustmentMessage(null);
                      }}
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {form.recurrenceType === "WEEKLY" ? (
                  <div className="mt-3">
                    <p className="mb-2 text-xs font-semibold text-[#3c413e]">{t("daysLabel")}</p>
                    <div className="flex flex-wrap gap-2">
                      {WEEKDAY_OPTIONS.map((day) => {
                        const selected = form.weeklyDays.includes(day.value);

                        return (
                          <button
                            className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${
                              selected
                                ? "border-[#5f8666] bg-[#dcecdc] text-[#1f3523]"
                                : "border-[#d8d2c8] bg-white text-[#4b514d] hover:border-[#b9c5b9]"
                            }`}
                            key={day.value}
                            onClick={() => toggleWeeklyDay(day.value)}
                            type="button"
                          >
                            {weekdayLabels[day.key].short}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                <div
                  className={`mt-4 grid gap-3 ${
                    form.recurrenceType === "CUSTOM"
                      ? "sm:grid-cols-[minmax(0,140px)_minmax(0,120px)_minmax(0,1fr)]"
                      : form.recurrenceType === "WEEKLY" && weeklyDateAdjustmentMessage
                        ? "sm:grid-cols-[minmax(0,160px)_minmax(0,1fr)]"
                        : "sm:grid-cols-[minmax(0,160px)]"
                  }`}
                >
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#3c413e]" htmlFor="chore-starts-at">
                      {t("startsLabel")}
                    </label>
                    <input
                      className="h-10 w-full rounded-md border border-[#dfe6e0] bg-[#f8fbf7] px-3 text-sm text-[#202321] outline-none transition focus:border-[#6e9274] focus:bg-white"
                      id="chore-starts-at"
                      onChange={(event) =>
                        setForm((current) => {
                          const startsAt =
                            current.recurrenceType === "WEEKLY" && current.weeklyDays.length > 0
                              ? alignDateInputToWeeklyDays(event.target.value, current.weeklyDays)
                              : event.target.value;

                          setWeeklyDateAdjustmentMessage(
                            startsAt !== event.target.value
                              ? t("weeklyDateAdjusted", { date: formatDateInputForMessage(startsAt, locale) })
                              : null,
                          );

                          return {
                            ...current,
                            startsAt,
                          };
                        })
                      }
                      required
                      type="date"
                      value={form.startsAt}
                    />
                  </div>
                  {form.recurrenceType === "WEEKLY" && weeklyDateAdjustmentMessage ? (
                    <p className="self-end pb-2 text-xs text-[#7b817d]">{weeklyDateAdjustmentMessage}</p>
                  ) : null}

                  {form.recurrenceType === "CUSTOM" ? (
                    <>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[#3c413e]" htmlFor="chore-interval-value">
                        {t("everyLabel")}
                      </label>
                      <input
                        className="h-10 w-full rounded-md border border-[#cfd9cf] bg-white px-3 text-sm text-[#202321] outline-none transition focus:border-[#6e9274]"
                        id="chore-interval-value"
                        inputMode="numeric"
                        min={1}
                        onChange={(event) => setForm((current) => ({ ...current, intervalValue: event.target.value }))}
                        required
                        type="number"
                        value={form.intervalValue}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[#3c413e]" htmlFor="chore-interval-unit">
                        {t("unitLabel")}
                      </label>
                      <select
                        className="h-10 w-full rounded-md border border-[#cfd9cf] bg-white px-3 text-sm text-[#202321] outline-none transition focus:border-[#6e9274]"
                        id="chore-interval-unit"
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            intervalUnit: event.target.value as ChoreIntervalUnit,
                          }))
                        }
                        value={form.intervalUnit}
                      >
                        <option value="DAYS">{t("unitDays")}</option>
                        <option value="WEEKS">{t("unitWeeks")}</option>
                        <option value="MONTHS">{t("unitMonths")}</option>
                      </select>
                    </div>
                    </>
                  ) : null}
                </div>
              </section>

              <section className="border-t border-[#dce7dd] pt-5">
                <h3 className="text-sm font-semibold text-[#202321]">{t("previewHeading")}</h3>
                <div className="mt-3 rounded-md bg-[#f3f8f2] px-4 py-3 text-sm text-[#314236]">
                  <p className="font-medium text-[#2f4e35]">
                    {previewAssignmentText} · {previewSchedule(form, locale, t, weekdayLabels)}
                  </p>
                  <p className="mt-1 leading-6">{t("previewStarts", { date: formatPreviewDate(previewDueDate(form), locale, t) })}</p>
                </div>
              </section>
            </div>

            <div className="mt-9 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                className="h-10 rounded-md border border-[#d8d2c8] bg-white px-4 text-sm font-semibold text-[#4b514d] transition hover:bg-[#f7f4ec]"
                disabled={isSubmitting}
                onClick={closeCreateDialog}
                type="button"
              >
                {t("cancel")}
              </button>
              <button
                className="h-10 rounded-md bg-[#232323] px-4 text-sm font-semibold text-white transition hover:bg-[#3c413e] disabled:opacity-50"
                disabled={submitDisabled}
                type="submit"
              >
                {editingId ? t("saveChanges") : t("createChore")}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <section className="rounded-md border border-[#dedbd2] bg-[#fffdf8]">
        {orderedChores.length === 0 ? (
          <p className="p-5 text-sm text-[#686e6a]">
            {t("emptyState")}
          </p>
        ) : (
          <div className="divide-y divide-[#eee9df]">
            {[
              { key: "overdue" as const, label: t("sectionOverdue"), chores: groupedChores.overdue },
              { key: "today" as const, label: t("sectionToday"), chores: groupedChores.today },
              { key: "upcoming" as const, label: t("sectionUpcoming"), chores: groupedChores.upcoming },
            ].map((section) => {
              const isTodayEmpty = section.key === "today" && section.chores.length === 0;

              return section.chores.length > 0 || section.key === "today" ? (
                <section
                  className={`p-4 ${
                    section.key === "today" && !isTodayEmpty ? "bg-[#fffaf1]" : ""
                  } ${
                    section.key === "upcoming" ? "mt-2" : ""
                  }`}
                  key={section.key}
                >
                  <h2
                    className={`text-xs font-semibold uppercase tracking-[0.08em] ${
                      isTodayEmpty ? "mb-1" : "mb-3"
                    } ${
                      section.key === "today" ? "text-[#6f5a1b]" : "text-[#7f857f]"
                    }`}
                  >
                    {section.label}
                  </h2>
                  {isTodayEmpty ? (
                    <p className="text-sm font-medium text-[#5f4e1d]">{t("nothingDueToday")}</p>
                  ) : (
                    <ul className="grid gap-2">
                      {section.chores.map((chore) => {
                        const member = chore.assignedHouseholdMemberId
                          ? membersById.get(chore.assignedHouseholdMemberId)
                          : null;
                        const memberName = member
                          ? displayNameForMember(member, memberFallback)
                          : (chore.assignedHouseholdMemberName ?? t("unassigned"));
                        const dueTone = dueDateTone(chore.nextDueAt, t);
                        const assignmentLabel = compactAssignmentLabel(chore, membersById, memberFallback, t);
                        const isCompletingChore = completingChoreIds.includes(chore.id);
                        const showAssignmentText = chore.assignmentType === "UNASSIGNED";
                        const avatarLabel =
                          chore.assignmentType === "ROTATING" && chore.assignedHouseholdMemberName
                            ? chore.assignedHouseholdMemberName
                            : assignmentLabel;

                        return (
                          <li
                            className={`group flex flex-col gap-2 rounded-md border border-[#ebe6da] p-3 transition-all duration-300 sm:flex-row sm:items-start sm:justify-between ${
                              dueTone.row
                            } ${isCompletingChore ? "scale-[0.985] border-[#bfd4c2] bg-[#f3f8f2] opacity-45" : ""}`}
                            key={chore.id}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <p className="min-w-0 truncate font-medium text-[#171a18] sm:text-[15px]">{chore.name}</p>
                              </div>

                              <div className="mt-1.5 flex flex-wrap items-center gap-2 sm:gap-3">
                                <div className="flex min-w-0 items-center gap-2">
                                  {chore.assignmentType !== "UNASSIGNED" ? (
                                    <MemberAvatar
                                      className="inline-flex h-6 w-6 items-center justify-center rounded-md border text-[11px] font-semibold"
                                      color={member?.color ?? chore.assignedHouseholdMemberColor ?? "sage"}
                                      email={member?.email}
                                      emoji={member?.emoji ?? chore.assignedHouseholdMemberEmoji}
                                      fallbackLabel={memberName}
                                      name={member?.name ?? avatarLabel}
                                      title={memberName}
                                    />
                                  ) : null}
                                  {showAssignmentText ? (
                                    <span className="truncate text-sm font-medium text-[#343936]">{assignmentLabel}</span>
                                  ) : null}
                                </div>
                                {dueTone.emphasis === "strong" ? (
                                  <span
                                    className={`inline-flex rounded-md border px-2 py-1 text-[11px] font-semibold tracking-[0.02em] ${dueTone.badge}`}
                                  >
                                    {dueTone.label}
                                  </span>
                                ) : (
                                  <span
                                    className={`inline-flex rounded-md border px-2 py-1 text-[11px] font-medium ${dueTone.badge}`}
                                  >
                                    {dueTone.text}
                                  </span>
                                )}
                              </div>

                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#6d746f]">
                                <span>{formatCompactIntervalLabel(chore, t, weekdayLabels)}</span>
                                {chore.categoryName ? <span className="text-[#b3b7b2]">•</span> : null}
                                {chore.categoryName ? (
                                  <span
                                    className="inline-flex max-w-full truncate rounded-md border border-[#ddd7cd] bg-[#f7f4ed] px-2 py-1 text-[11px] font-medium text-[#5b655f]"
                                    title={chore.categoryName}
                                  >
                                    {chore.categoryName}
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-start">
                              {confirmDeleteId === chore.id ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-[#5d635f]">{t("deleteConfirm")}</span>
                                  <button
                                    className="h-7 rounded bg-[#f7ecea] px-1.5 text-xs font-medium text-[#a6543c] transition hover:bg-[#f0d4cf]"
                                    disabled={isDeleting}
                                    onClick={() => removeChore(chore.id)}
                                    type="button"
                                  >
                                    {t("confirmDelete")}
                                  </button>
                                  <button
                                    className="h-7 rounded bg-[#ebe8de] px-1.5 text-xs font-medium text-[#5d635f] transition hover:bg-[#dedad0]"
                                    disabled={isDeleting}
                                    onClick={() => setConfirmDeleteId(null)}
                                    type="button"
                                  >
                                    {t("cancelDelete")}
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <button
                                    aria-label={t("editChoreAria", { name: chore.name })}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#9da39f] transition hover:bg-[#e8efe9] hover:text-[#526c56] focus:bg-[#e8efe9] focus:text-[#526c56] focus:outline-none sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 disabled:opacity-40"
                                    disabled={boardBusy}
                                    onClick={() => openEditDialog(chore)}
                                    type="button"
                                  >
                                    <Pencil aria-hidden className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    aria-label={t("deleteChoreAria", { name: chore.name })}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#9da39f] transition hover:bg-[#f3e4e2] hover:text-[#b94e3f] focus:bg-[#f3e4e2] focus:text-[#b94e3f] focus:outline-none sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 disabled:opacity-40"
                                    disabled={isCompleting || isDeleting}
                                    onClick={() => setConfirmDeleteId(chore.id)}
                                    type="button"
                                  >
                                    <Trash2 aria-hidden className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              )}
                              <button
                                className={`inline-flex h-9 items-center gap-1 rounded-md border px-3 text-xs font-semibold transition disabled:opacity-50 ${
                                  isCompletingChore
                                    ? "border-[#9ab59d] bg-[#e5f1e5] text-[#2f5a36]"
                                    : "border-[#cfd9cf] bg-[#f8fbf7] text-[#3c413e] hover:border-[#9ab59d] hover:bg-[#eef7ef]"
                                }`}
                                disabled={isCompleting || isDeleting}
                                onClick={() => markComplete(chore.id)}
                                type="button"
                              >
                                <Check
                                  aria-hidden
                                  className={`h-3.5 w-3.5 transition-transform duration-300 ${isCompletingChore ? "scale-110" : ""}`}
                                />
                                {t("done")}
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              ) : null;
            })}
          </div>
        )}
      </section>
    </div>
  );
}
