"use client";

import type { ChoreAssignmentType, ChoreIntervalUnit, ChoreRecurrenceType } from "@prisma/client";
import { Check, ChevronRight, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from "react";

import type { ChoreCategoryView, ChoreMemberView, ChoreView } from "@/lib/chores";
import { getMemberColor } from "@/lib/member-colors";

type ChoreBoardProps = Readonly<{
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

const WEEKDAY_OPTIONS = [
  { value: 0, short: "Sun", long: "Sunday" },
  { value: 1, short: "Mon", long: "Monday" },
  { value: 2, short: "Tue", long: "Tuesday" },
  { value: 3, short: "Wed", long: "Wednesday" },
  { value: 4, short: "Thu", long: "Thursday" },
  { value: 5, short: "Fri", long: "Friday" },
  { value: 6, short: "Sat", long: "Saturday" },
] as const;

const DEFAULT_CUSTOM_INTERVAL_UNIT: ChoreIntervalUnit = "WEEKS";

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

function initialForMember(member: ChoreMemberView): string {
  return (member.name ?? member.email ?? "?").slice(0, 1).toUpperCase();
}

function displayNameForMember(member: ChoreMemberView): string {
  return member.name ?? member.email ?? "Household member";
}

function firstNameForMember(member: ChoreMemberView): string {
  const label = displayNameForMember(member).trim();
  const [firstToken] = label.split(/\s+/);
  return firstToken || label;
}

function joinNatural(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function formatWeekdays(weekdays: number[]): string {
  const labels: string[] = [];

  [...new Set(weekdays)]
    .sort((a, b) => a - b)
    .forEach((day) => {
      const label = WEEKDAY_OPTIONS.find((option) => option.value === day)?.long;
      if (label) labels.push(label);
    });

  return joinNatural(labels);
}

function formatIntervalLabel(chore: Pick<ChoreView, "recurrenceType" | "weeklyDays" | "intervalValue" | "intervalUnit">) {
  if (chore.recurrenceType === "DAILY") return "Daily";
  if (chore.recurrenceType === "MONTHLY") return "Monthly";
  if (chore.recurrenceType === "WEEKLY") return `Every ${formatWeekdays(chore.weeklyDays)}`;

  const singular = chore.intervalUnit === "DAYS" ? "day" : chore.intervalUnit === "WEEKS" ? "week" : "month";
  return `Every ${chore.intervalValue} ${chore.intervalValue === 1 ? singular : `${singular}s`}`;
}

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function startOfDayUtc(dateIso: string): Date {
  const dueDate = new Date(dateIso);
  return new Date(Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate()));
}

function dueDateLabel(dateIso: string) {
  const dueDate = startOfDayUtc(dateIso);
  const daysDiff = Math.floor((dueDate.getTime() - startOfTodayUtc().getTime()) / (24 * 60 * 60 * 1000));

  if (daysDiff < 0) {
    return `${Math.abs(daysDiff)} ${Math.abs(daysDiff) === 1 ? "day" : "days"} overdue`;
  }

  if (daysDiff === 0) {
    return "Due today";
  }

  if (daysDiff === 1) {
    return "Due tomorrow";
  }

  return `Due in ${daysDiff} days`;
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
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function previewDueDate(form: CreateChoreFormState): Date | null {
  return parseDateInput(form.startsAt);
}

function formatPreviewDate(date: Date | null): string {
  if (!date) return "when you choose a schedule";

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
  }).format(date);
}

function previewAssignment(form: CreateChoreFormState, membersById: Map<string, ChoreMemberView>): string {
  if (form.assignmentType === "UNASSIGNED") {
    return "Unassigned";
  }

  if (form.assignmentType === "FIXED") {
    const member = form.assignedHouseholdMemberId ? membersById.get(form.assignedHouseholdMemberId) : null;
    if (!member) return "Choose who will do this";
    return `${firstNameForMember(member)} does this`;
  }

  const names = form.rotationMemberIds
    .map((memberId) => membersById.get(memberId))
    .filter((member): member is ChoreMemberView => Boolean(member))
    .map(firstNameForMember);

  if (names.length === 0) return "Choose who this rotates between";
  return `Rotates between ${joinNatural(names)}`;
}

function previewSchedule(form: CreateChoreFormState): string {
  if (form.recurrenceType === "DAILY") return "Every day";
  if (form.recurrenceType === "MONTHLY") return "Every month";
  if (form.recurrenceType === "WEEKLY") {
    return form.weeklyDays.length > 0 ? `Every ${formatWeekdays(form.weeklyDays)}` : "Every chosen weekday";
  }

  const intervalValue = Number(form.intervalValue);
  if (!Number.isInteger(intervalValue) || intervalValue < 1) return "On your custom cadence";

  const singular = form.intervalUnit === "DAYS" ? "day" : form.intervalUnit === "WEEKS" ? "week" : "month";
  return `Every ${intervalValue} ${intervalValue === 1 ? singular : `${singular}s`}`;
}

function validateName(value: string): string | null {
  return value.trim() ? null : "Add a chore name.";
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

function assignmentSummary(chore: ChoreView, membersById: Map<string, ChoreMemberView>): string {
  if (chore.assignmentType === "UNASSIGNED") return "Unassigned";
  if (chore.assignmentType === "FIXED") return chore.assignedHouseholdMemberName ?? "Assigned";

  const names = chore.rotationMemberIds
    .map((memberId) => membersById.get(memberId))
    .filter((member): member is ChoreMemberView => Boolean(member))
    .map(displayNameForMember);

  if (names.length === 0) return "Rotating";
  return `Rotates between ${joinNatural(names)}`;
}

export function ChoreBoard({ categories: initialCategories, initialChores, members }: ChoreBoardProps) {
  const [chores, setChores] = useState<ChoreView[]>(initialChores);
  const [categories, setCategories] = useState<ChoreCategoryView[]>(initialCategories);
  const [form, setForm] = useState<CreateChoreFormState>(() => defaultForm());
  const [touched, setTouched] = useState<TouchedState>({ name: false });
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreating, startCreateTransition] = useTransition();
  const [isCompleting, startCompleteTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  const orderedChores = useMemo(() => [...chores].sort(compareChores), [chores]);
  const membersById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);
  const categoryOptions = useMemo<SelectOption[]>(
    () => [
      { label: "No category", value: "" },
      ...categories.map((category) => ({ label: category.name, value: category.name })),
      { label: "+ New category...", value: "__new__" },
    ],
    [categories],
  );
  const previewAssignmentText = previewAssignment(form, membersById);
  const nameError = touched.name ? validateName(form.name) : null;
  const createDisabled = isCreating || !form.name.trim();

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
    setForm(defaultForm());
    setTouched({ name: false });
    setShowCreateDialog(true);
  }

  function closeCreateDialog() {
    if (isCreating) return;
    setShowCreateDialog(false);
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
    setForm((current) => ({
      ...current,
      weeklyDays: current.weeklyDays.includes(day)
        ? current.weeklyDays.filter((value) => value !== day)
        : [...current.weeklyDays, day].sort((a, b) => a - b),
    }));
  }

  function onCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const intervalValue = Number(form.intervalValue);

    const nextNameError = validateName(form.name);
    if (nextNameError) {
      setTouched((current) => ({ ...current, name: true }));
      setError(nextNameError);
      return;
    }

    if (form.assignmentType === "FIXED" && !form.assignedHouseholdMemberId) {
      setError("Choose who this belongs to, or leave it unassigned.");
      return;
    }

    if (form.assignmentType === "ROTATING" && form.rotationMemberIds.length === 0) {
      setError("Choose at least one person for rotation.");
      return;
    }

    if (form.recurrenceType === "WEEKLY" && form.weeklyDays.length === 0) {
      setError("Choose at least one day of the week.");
      return;
    }

    if (form.recurrenceType === "CUSTOM" && (!Number.isInteger(intervalValue) || intervalValue < 1)) {
      setError("Set a repeat interval of at least 1.");
      return;
    }

    startCreateTransition(async () => {
      const startsAt = parseDateInput(form.startsAt);
      if (!startsAt) {
        setError("Choose when this starts.");
        return;
      }

      const categoryName =
        form.categoryId === "__new__" ? form.newCategoryName.trim() || null : (form.categoryId || null);

      if (form.categoryId === "__new__" && !categoryName) {
        setError("Enter a name for the new category.");
        return;
      }

      const response = await fetch("/api/chores", {
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
        method: "POST",
      });

      if (!response.ok) {
        setError("Could not create chore. Please try again.");
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
      setForm(defaultForm());
    });
  }

  function markComplete(choreId: string) {
    setError(null);

    startCompleteTransition(async () => {
      const response = await fetch(`/api/chores/${choreId}/completions`, {
        method: "POST",
      });

      if (!response.ok) {
        setError("Could not mark chore complete. Please try again.");
        return;
      }

      const payload = (await response.json()) as { chore: ChoreView };
      applyChoreUpdate(payload.chore);
    });
  }

  function removeChore(choreId: string) {
    setError(null);

    startDeleteTransition(async () => {
      const response = await fetch(`/api/chores/${choreId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setError("Could not delete chore. Please try again.");
        return;
      }

      setChores((current) => current.filter((chore) => chore.id !== choreId));
    });
  }

  const boardBusy = isCreating || isCompleting || isDeleting;

  return (
    <div className="grid gap-6">
      <section className="rounded-md border border-[#dedbd2] bg-[#fffdf8] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#a6543c]">
              Chores
            </p>
            <h1 className="mt-2 font-serif text-3xl font-semibold tracking-normal text-[#171a18]">
              Keep the home rhythm steady
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#686e6a]">
              Track repeating jobs in one shared list. Overdue chores rise to the top, then slide back
              into their next due spot when checked off.
            </p>
          </div>

          <button
            className="inline-flex h-10 items-center justify-center rounded-md bg-[#232323] px-4 text-sm font-semibold text-white transition hover:bg-[#3c413e] disabled:opacity-50"
            disabled={boardBusy}
            onClick={openCreateDialog}
            type="button"
          >
            Add chore
          </button>
        </div>

        {members.length === 0 ? (
          <p className="mt-4 text-xs text-[#686e6a]">
            No people added yet. You can still add chores now and leave them unassigned.
          </p>
        ) : null}

        {error ? <p className="mt-3 text-xs font-medium text-[#a6543c]">{error}</p> : null}
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
                  Chores
                </p>
                <h2
                  className="mt-1 font-serif text-2xl font-semibold tracking-normal text-[#171a18]"
                  id="chore-create-dialog-title"
                >
                  Add a chore
                </h2>
              </div>
              <button
                aria-label="Close add chore dialog"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#d8d2c8] bg-white text-xl font-semibold leading-none text-[#5d635f] transition hover:bg-[#f7f4ec]"
                disabled={isCreating}
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
                  Name
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
                  placeholder="Unload the dishwasher"
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
                    Category
                  </label>
                  {form.categoryId === "__new__" ? (
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        className="min-w-0 flex-1 rounded-md border border-[#dfe6e0] bg-[#f8fbf7] px-3 py-2 text-sm text-[#202321] placeholder:text-[#9da39f] focus:border-[#6e9274] focus:bg-white focus:outline-none"
                        id="chore-category"
                        onChange={(event) => setForm((current) => ({ ...current, newCategoryName: event.target.value }))}
                        placeholder="New category name"
                        required
                        type="text"
                        value={form.newCategoryName}
                      />
                      <button
                        aria-label="Cancel new category"
                        className="shrink-0 rounded-md border border-[#dfe6e0] bg-white px-3 text-sm font-medium text-[#5d635f] transition hover:bg-[#f4f1ea]"
                        onClick={() => setForm((current) => ({ ...current, categoryId: "", newCategoryName: "" }))}
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <CustomSelect
                      id="chore-category"
                      onChange={(value) => setForm((current) => ({ ...current, categoryId: value, newCategoryName: "" }))}
                      options={categoryOptions}
                      placeholder="No category"
                      value={form.categoryId}
                    />
                  )}
                </div>
              </section>

              <section className="border-t border-[#ece6db] pt-5">
                <h3 className="text-sm font-semibold text-[#202321]">Who does it?</h3>
                <div className="mt-3 grid grid-cols-1 gap-1 rounded-md border border-[#e6e0d6] bg-[#f7f4ed] p-1 sm:grid-cols-3">
                  {[
                    { value: "UNASSIGNED", label: "Unassigned" },
                    { value: "FIXED", label: "Fixed person" },
                    { value: "ROTATING", label: "Rotate between people" },
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
                    No one is assigned yet. You can assign it later.
                  </p>
                ) : null}

                {form.assignmentType === "FIXED" ? (
                  <div className="mt-4">
                    <label className="mb-1 block text-xs font-semibold text-[#3c413e]" htmlFor="chore-person">
                      Who
                    </label>
                    <select
                      className="h-10 w-full rounded-md border border-[#dfe6e0] bg-[#f8fbf7] px-3 text-sm text-[#202321] outline-none transition focus:border-[#6e9274] focus:bg-white"
                      id="chore-person"
                      onChange={(event) =>
                        setForm((current) => ({ ...current, assignedHouseholdMemberId: event.target.value }))
                      }
                      value={form.assignedHouseholdMemberId}
                    >
                      <option value="">Choose someone</option>
                      {members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {displayNameForMember(member)}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                {form.assignmentType === "ROTATING" ? (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold text-[#3c413e]">People</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {members.map((member) => {
                        const selected = form.rotationMemberIds.includes(member.id);
                        const palette = getMemberColor(member.color);

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
                            <span
                              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border font-serif text-xs font-semibold"
                              style={{
                                backgroundColor: palette.avatarBg,
                                borderColor: palette.border,
                                color: palette.avatarText,
                              }}
                            >
                              {initialForMember(member)}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#202321]">
                              {displayNameForMember(member)}
                            </span>
                            {selected ? <Check aria-hidden className="h-4 w-4 shrink-0 text-[#45614c]" /> : null}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-xs text-[#7b817d]">The first selected person starts the rotation.</p>
                  </div>
                ) : null}

                {members.length === 0 ? (
                  <p className="mt-3 text-xs text-[#7b817d]">
                    Add household members later if you want fixed or rotating chores.
                  </p>
                ) : null}
              </section>

              <section className="border-t border-[#ece6db] pt-5">
                <h3 className="text-sm font-semibold text-[#202321]">When?</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-4">
                  {[
                    { value: "DAILY", label: "Daily" },
                    { value: "WEEKLY", label: "Weekly" },
                    { value: "MONTHLY", label: "Monthly" },
                    { value: "CUSTOM", label: "Custom" },
                  ].map((option) => (
                    <button
                      className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
                        form.recurrenceType === option.value
                          ? "border-[#6e9274] bg-[#eef7ef] text-[#2f4e35]"
                          : "border-[#d8d2c8] bg-white text-[#4b514d] hover:border-[#b9c5b9]"
                      }`}
                      key={option.value}
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          recurrenceType: option.value as ChoreRecurrenceType,
                        }))
                      }
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {form.recurrenceType === "WEEKLY" ? (
                  <div className="mt-3">
                    <p className="mb-2 text-xs font-semibold text-[#3c413e]">Day(s)</p>
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
                            {day.short}
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
                      : "sm:grid-cols-[minmax(0,160px)]"
                  }`}
                >
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#3c413e]" htmlFor="chore-starts-at">
                      Starts
                    </label>
                    <input
                      className="h-10 w-full rounded-md border border-[#dfe6e0] bg-[#f8fbf7] px-3 text-sm text-[#202321] outline-none transition focus:border-[#6e9274] focus:bg-white"
                      id="chore-starts-at"
                      onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))}
                      required
                      type="date"
                      value={form.startsAt}
                    />
                  </div>

                  {form.recurrenceType === "CUSTOM" ? (
                    <>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[#3c413e]" htmlFor="chore-interval-value">
                        Every
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
                        Unit
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
                        <option value="DAYS">Days</option>
                        <option value="WEEKS">Weeks</option>
                        <option value="MONTHS">Months</option>
                      </select>
                    </div>
                    </>
                  ) : null}
                </div>
              </section>

              <section className="border-t border-[#dce7dd] pt-5">
                <h3 className="text-sm font-semibold text-[#202321]">Preview</h3>
                <div className="mt-3 rounded-md bg-[#f3f8f2] px-4 py-3 text-sm text-[#314236]">
                  <p className="font-medium text-[#2f4e35]">
                    {previewAssignmentText} · {previewSchedule(form)}
                  </p>
                  <p className="mt-1 leading-6">Starts {formatPreviewDate(previewDueDate(form))}</p>
                </div>
              </section>
            </div>

            <div className="mt-9 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                className="h-10 rounded-md border border-[#d8d2c8] bg-white px-4 text-sm font-semibold text-[#4b514d] transition hover:bg-[#f7f4ec]"
                disabled={isCreating}
                onClick={closeCreateDialog}
                type="button"
              >
                Cancel
              </button>
              <button
                className="h-10 rounded-md bg-[#232323] px-4 text-sm font-semibold text-white transition hover:bg-[#3c413e] disabled:opacity-50"
                disabled={createDisabled}
                type="submit"
              >
                Create chore
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <section className="rounded-md border border-[#dedbd2] bg-[#fffdf8]">
        {orderedChores.length === 0 ? (
          <p className="p-5 text-sm text-[#686e6a]">
            No chores yet. Add your first repeating task to start the home board rhythm.
          </p>
        ) : (
          <ul className="divide-y divide-[#eee9df]">
            {orderedChores.map((chore) => {
              const member = chore.assignedHouseholdMemberId
                ? membersById.get(chore.assignedHouseholdMemberId)
                : null;
              const memberColor = getMemberColor(member?.color ?? chore.assignedHouseholdMemberColor ?? "sage");
              const memberName = member
                ? displayNameForMember(member)
                : (chore.assignedHouseholdMemberName ?? "Unassigned");
              const choreIsOverdue = isOverdue(chore.nextDueAt);
              const avatarLabel = chore.assignmentType === "UNASSIGNED" ? "?" : memberName.slice(0, 1).toUpperCase();

              return (
                <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between" key={chore.id}>
                  <div className="min-w-0">
                    <p className="font-medium text-[#171a18]">{chore.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#646b67]">
                      {chore.categoryName ? (
                        <>
                          <span className="rounded-md border border-[#ddd7cd] bg-[#f7f4ed] px-2 py-1 font-medium text-[#5b655f]">
                            {chore.categoryName}
                          </span>
                          <span className="text-[#a9ada9]">•</span>
                        </>
                      ) : null}
                      <span
                        className="inline-flex h-6 w-6 items-center justify-center rounded-md border font-serif text-[11px] font-semibold"
                        style={{
                          backgroundColor: memberColor.avatarBg,
                          borderColor: memberColor.border,
                          color: memberColor.avatarText,
                        }}
                        title={memberName}
                      >
                        {avatarLabel}
                      </span>
                      <span>{assignmentSummary(chore, membersById)}</span>
                      <span className="text-[#a9ada9]">•</span>
                      <span>{formatIntervalLabel(chore)}</span>
                      <span className="text-[#a9ada9]">•</span>
                      <span className={choreIsOverdue ? "font-semibold text-[#a6543c]" : ""}>
                        {dueDateLabel(chore.nextDueAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      className="inline-flex h-9 items-center gap-1 rounded-md border border-[#cfd9cf] bg-[#f8fbf7] px-3 text-xs font-semibold text-[#3c413e] transition hover:border-[#9ab59d] hover:bg-[#eef7ef] disabled:opacity-50"
                      disabled={isCompleting || isDeleting}
                      onClick={() => markComplete(chore.id)}
                      type="button"
                    >
                      <Check aria-hidden className="h-3.5 w-3.5" />
                      Done
                    </button>
                    <button
                      aria-label={`Delete ${chore.name}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#e2cbc2] bg-[#fff5f2] text-[#a6543c] transition hover:bg-[#ffe9e3] disabled:opacity-50"
                      disabled={isCompleting || isDeleting}
                      onClick={() => removeChore(chore.id)}
                      type="button"
                    >
                      <Trash2 aria-hidden className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
