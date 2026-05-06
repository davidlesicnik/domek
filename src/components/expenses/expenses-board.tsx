"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Pencil, Plus, Settings, Trash2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { MemberAvatar } from "@/components/ui/member-avatar";
import { useCoarsePointer } from "@/components/ui/use-coarse-pointer";
import { EXPENSE_CATEGORY_COLOR_GROUPS } from "@/lib/expense-colors";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { getMemberColor } from "@/lib/member-colors";

type ExpenseView = {
  id: string;
  name: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  date: string;
  notes: string | null;
  memberName: string | null;
  categoryId: string | null;
  categoryColor: string | null;
  categoryName: string | null;
  householdMemberId: string | null;
  householdMemberName: string | null;
  householdMemberColor: string | null;
  householdMemberEmoji: string | null;
  splits: ExpenseSplitView[];
};

type ExpenseSplitView = {
  id: string;
  householdMemberId: string | null;
  householdMemberName: string | null;
  householdMemberColor: string | null;
  householdMemberEmoji: string | null;
};

type CategoryView = { id: string; color: string; name: string };
type MemberView = { id: string; color: string; emoji: string | null; name: string | null; email: string | null };
type MonthStats = { carryover: number; income: number; expenses: number; net: number };
type NetPointEntry = { amount: number; id: string; memberColor: string | null; memberEmoji: string | null; memberName: string | null; name: string; type: "INCOME" | "EXPENSE" };
type NetPoint = { day: number; entries: NetPointEntry[]; value: number; x: number; y: number };
type NetChart = {
  end: number;
  max: number;
  min: number;
  path: string;
  points: NetPoint[];
  start: number;
  zeroY: number;
};
type CategorySlice = {
  amount: number;
  color: string;
  dash: string;
  key: string;
  label: string;
  offset: number;
  percent: number;
};
type ExpenseMixView = "category" | "payee";
type SettleUpTransfer = {
  amount: number;
  from: SettlementMember;
  to: SettlementMember;
};
type SettlementMember = {
  id: string;
  name: string;
  color: string | null;
  emoji: string | null;
};
type SettlementBalance = {
  cents: number;
  member: SettlementMember;
};

type Props = {
  initialExpenses: ExpenseView[];
  initialStats: MonthStats;
  initialCategories: CategoryView[];
  members: MemberView[];
  initialYear: number;
  initialMonth: number;
};

type ExpensesTranslator = ReturnType<typeof useTranslations>;
const UNCATEGORIZED_COLOR = "#c8c4bb";
const DONUT_CIRCUMFERENCE = 2 * Math.PI * 42;
const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

function formatAmount(n: number, locale: string): string {
  return n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatMonthLabel(year: number, month: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function formatMonthName(year: number, month: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function formatShortMonthDay(year: number, month: number, day: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatExpenseDate(date: string, locale: string): string {
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return date;
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthValue(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function currentYearMonth() {
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function findCategoryColorGroup(color: string) {
  return (
    EXPENSE_CATEGORY_COLOR_GROUPS.find((group) =>
      group.shades.some((shade) => shade.toLowerCase() === color.toLowerCase()),
    ) ?? EXPENSE_CATEGORY_COLOR_GROUPS[0]
  );
}

function colorGroupLabel(name: string, t: ExpensesTranslator): string {
  switch (name) {
    case "Rose":
      return t("colorRose");
    case "Clay":
      return t("colorClay");
    case "Gold":
      return t("colorGold");
    case "Green":
      return t("colorGreen");
    case "Teal":
      return t("colorTeal");
    case "Blue":
      return t("colorBlue");
    case "Violet":
      return t("colorViolet");
    case "Mauve":
      return t("colorMauve");
    case "Stone":
      return t("colorStone");
    default:
      return name;
  }
}

function buildNetChart(expenses: ExpenseView[], year: number, month: number, carryover: number): NetChart {
  const days = daysInMonth(year, month);
  const dailyDeltas = Array.from({ length: days }, () => 0);
  const dailyEntries = Array.from({ length: days }, () => [] as NetPointEntry[]);

  for (const expense of expenses) {
    const day = Number(expense.date.slice(8, 10));
    if (!Number.isInteger(day) || day < 1 || day > days) continue;
    dailyDeltas[day - 1] += expense.type === "INCOME" ? expense.amount : -expense.amount;
    dailyEntries[day - 1].push({
      amount: expense.amount,
      id: expense.id,
      memberColor: expense.householdMemberColor ?? null,
      memberEmoji: expense.householdMemberEmoji ?? null,
      memberName: expense.householdMemberName ?? null,
      name: expense.name,
      type: expense.type,
    });
  }

  let running = carryover;
  const values = dailyDeltas.map((delta) => {
    running += delta;
    return running;
  });
  const min = Math.min(0, carryover, ...values);
  const max = Math.max(0, carryover, ...values);
  const range = max - min || 1;
  const chartWidth = 320;
  const chartHeight = 130;
  const left = 20;
  const top = 10;

  const points = values.map((value, index) => {
    const x = left + (index / Math.max(days - 1, 1)) * chartWidth;
    const y = top + ((max - value) / range) * chartHeight;
    return { day: index + 1, entries: dailyEntries[index], value, x, y };
  });
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const zeroY = top + ((max - 0) / range) * chartHeight;

  return {
    end: values[values.length - 1] ?? carryover,
    max,
    min,
    path,
    points,
    start: carryover,
    zeroY,
  };
}

function buildCategorySlices(expenses: ExpenseView[], t: ExpensesTranslator): CategorySlice[] {
  const totals = new Map<string, { amount: number; color: string; label: string }>();

  for (const expense of expenses) {
    if (expense.type !== "EXPENSE") continue;
    const key = expense.categoryId ?? "__unsorted__";
    const previous = totals.get(key);
    totals.set(key, {
      amount: (previous?.amount ?? 0) + expense.amount,
      color: expense.categoryColor ?? UNCATEGORIZED_COLOR,
      label: expense.categoryName ?? t("uncategorized"),
    });
  }

  return toSlices(Array.from(totals.entries()).sort((a, b) => b[1].amount - a[1].amount));
}

function toSlices(entries: [string, { amount: number; color: string; label: string }][]): CategorySlice[] {
  const total = entries.reduce((sum, [, entry]) => sum + entry.amount, 0);
  let offset = 0;

  return entries.map(([key, entry]) => {
    const { amount, color, label } = entry;
    const length = total > 0 ? (amount / total) * DONUT_CIRCUMFERENCE : 0;
    const slice = {
      amount,
      color,
      dash: `${length} ${DONUT_CIRCUMFERENCE - length}`,
      key,
      label,
      offset,
      percent: total > 0 ? (amount / total) * 100 : 0,
    };
    offset += length;
    return slice;
  });
}

function buildPayeeSlices(expenses: ExpenseView[], t: ExpensesTranslator): CategorySlice[] {
  const totals = new Map<string, { amount: number; color: string; label: string }>();

  for (const expense of expenses) {
    if (expense.type !== "EXPENSE") continue;
    const key = expense.householdMemberId ?? "__unspecified__";
    const previous = totals.get(key);
    totals.set(key, {
      amount: (previous?.amount ?? 0) + expense.amount,
      color: expense.householdMemberColor ? getMemberColor(expense.householdMemberColor).hex : UNCATEGORIZED_COLOR,
      label: expense.householdMemberName ?? t("unspecified"),
    });
  }

  return toSlices(Array.from(totals.entries()).sort((a, b) => b[1].amount - a[1].amount));
}

function amountToCents(amount: number): number {
  return Math.round(amount * 100);
}

function centsToAmount(cents: number): number {
  return cents / 100;
}

function splitAmountCents(totalCents: number, shares: number): number[] {
  const baseShare = Math.trunc(totalCents / shares);
  const remainder = totalCents - baseShare * shares;

  return Array.from({ length: shares }, (_value, index) => baseShare + (index < remainder ? 1 : 0));
}

function buildSettleUpTransfers(expenses: ExpenseView[]): SettleUpTransfer[] {
  const balances = new Map<string, number>();
  const memberById = new Map<string, SettlementMember>();

  function rememberMember(member: SettlementMember) {
    if (!memberById.has(member.id)) memberById.set(member.id, member);
  }

  for (const expense of expenses) {
    if (expense.type !== "EXPENSE" || !expense.householdMemberId || expense.splits.length < 2) continue;

    const payer: SettlementMember = {
      id: expense.householdMemberId,
      name: expense.householdMemberName ?? "",
      color: expense.householdMemberColor,
      emoji: expense.householdMemberEmoji,
    };

    const splitMembers = expense.splits.filter(
      (split): split is ExpenseSplitView & { householdMemberId: string } => Boolean(split.householdMemberId),
    );
    if (splitMembers.length < 2) continue;

    rememberMember(payer);
    const totalCents = amountToCents(expense.amount);
    balances.set(payer.id, (balances.get(payer.id) ?? 0) + totalCents);

    const shares = splitAmountCents(totalCents, splitMembers.length);
    splitMembers.forEach((split, index) => {
      rememberMember({
        id: split.householdMemberId,
        name: split.householdMemberName ?? "",
        color: split.householdMemberColor,
        emoji: split.householdMemberEmoji,
      });
      balances.set(split.householdMemberId, (balances.get(split.householdMemberId) ?? 0) - shares[index]);
    });
  }

  const creditors = Array.from(balances.entries())
    .filter(([, cents]) => cents > 0)
    .map(([id, cents]) => ({ cents, member: memberById.get(id) }))
    .filter((entry): entry is SettlementBalance => Boolean(entry.member))
    .sort((a, b) => b.cents - a.cents);
  const debtors = Array.from(balances.entries())
    .filter(([, cents]) => cents < 0)
    .map(([id, cents]) => ({ cents: -cents, member: memberById.get(id) }))
    .filter((entry): entry is SettlementBalance => Boolean(entry.member))
    .sort((a, b) => b.cents - a.cents);
  const transfers: SettleUpTransfer[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const cents = Math.min(debtor.cents, creditor.cents);

    if (cents > 0) {
      transfers.push({
        amount: centsToAmount(cents),
        from: debtor.member,
        to: creditor.member,
      });
    }

    debtor.cents -= cents;
    creditor.cents -= cents;
    if (debtor.cents <= 0) debtorIndex += 1;
    if (creditor.cents <= 0) creditorIndex += 1;
  }

  return transfers;
}

function calculateStats(expenses: ExpenseView[], carryover: number): MonthStats {
  const monthStats = expenses.reduce(
    (totals, expense) => {
      const income = expense.type === "INCOME" ? totals.income + expense.amount : totals.income;
      const spending = expense.type === "EXPENSE" ? totals.expenses + expense.amount : totals.expenses;
      return { income, expenses: spending };
    },
    { income: 0, expenses: 0 },
  );

  return {
    carryover,
    income: monthStats.income,
    expenses: monthStats.expenses,
    net: carryover + monthStats.income - monthStats.expenses,
  };
}

function compareExpensesByDateDesc(a: ExpenseView, b: ExpenseView): number {
  const dateCompare = b.date.localeCompare(a.date);
  return dateCompare === 0 ? b.id.localeCompare(a.id) : dateCompare;
}

function formFromExpense(expense: ExpenseView): FormState {
  const splitHouseholdMemberIds = expense.splits
    .map((split) => split.householdMemberId)
    .filter((id): id is string => Boolean(id));

  return {
    name: expense.name,
    amount: String(expense.amount),
    type: expense.type,
    date: expense.date.slice(0, 10),
    categoryId: expense.categoryId ?? "",
    newCategoryName: "",
    householdMemberId: expense.householdMemberId ?? "",
    memberName: expense.memberName ?? (!expense.householdMemberId ? expense.householdMemberName ?? "" : ""),
    notes: expense.notes ?? "",
    splitEnabled: splitHouseholdMemberIds.length > 0,
    splitHouseholdMemberIds,
  };
}

type FormState = {
  name: string;
  amount: string;
  type: "INCOME" | "EXPENSE";
  date: string;
  categoryId: string;
  newCategoryName: string;
  householdMemberId: string;
  memberName: string;
  notes: string;
  splitEnabled: boolean;
  splitHouseholdMemberIds: string[];
};

type CategoryFormState = {
  id: string;
  name: string;
  color: string;
};

type SelectOption = {
  label: string;
  value: string;
  color?: string;
};

const defaultForm: FormState = {
  name: "",
  amount: "",
  type: "EXPENSE",
  date: todayISO(),
  categoryId: "",
  newCategoryName: "",
  householdMemberId: "",
  memberName: "",
  notes: "",
  splitEnabled: false,
  splitHouseholdMemberIds: [],
};

function defaultFormForMonth(year: number, month: number): FormState {
  const selectedMonth = monthValue(year, month);
  const today = todayISO();

  return {
    ...defaultForm,
    date: today.startsWith(selectedMonth) ? today : `${selectedMonth}-01`,
  };
}

const defaultCategoryForm: CategoryFormState = {
  id: "",
  name: "",
  color: EXPENSE_CATEGORY_COLOR_GROUPS[0].base,
};

function CustomSelect({
  buttonClassName = "",
  className = "w-full",
  id,
  onChange,
  options,
  placeholder = "Select",
  value,
}: {
  buttonClassName?: string;
  className?: string;
  id: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  value: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const isCoarsePointer = useCoarsePointer();
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

  if (isCoarsePointer) {
    return (
      <label className={className}>
        <span className="sr-only">{placeholder}</span>
        <select
          className={`w-full rounded-md border border-[var(--select-border)] bg-[var(--select-bg)] px-3 py-2 text-base text-[var(--select-text)] focus:border-[color:var(--focus-ring)] focus:outline-none sm:text-sm ${buttonClassName}`}
          id={id}
          onChange={(event) => onChange(event.target.value)}
          value={value}
        >
          {!options.some((option) => option.value === "") ? (
            <option value="">{placeholder}</option>
          ) : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div
      className={`relative [--select-bg:var(--surface-primary)] [--select-border:var(--input-border)] [--select-hover-border:var(--border-strong)] [--select-panel:var(--surface-primary)] [--select-text:var(--text-primary)] ${className}`}
      ref={rootRef}
    >
      <button
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`flex w-full items-center justify-between gap-2 rounded-md border border-[var(--select-border)] bg-[var(--select-bg)] px-3 py-2 text-left text-base text-[var(--select-text)] transition hover:border-[var(--select-hover-border)] focus:border-[color:var(--focus-ring)] focus:outline-none sm:text-sm ${buttonClassName}`}
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
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: selectedOption.color }}
            />
          ) : null}
          <span className={selectedOption ? "truncate" : "truncate text-[color:var(--input-placeholder)]"}>
            {selectedOption?.label ?? placeholder}
          </span>
        </span>
        <ChevronRight
          aria-hidden
          className={`h-4 w-4 shrink-0 text-[color:var(--text-subtle)] transition-transform ${isOpen ? "-rotate-90" : "rotate-90"}`}
        />
      </button>
      {isOpen ? (
        <div
          className="absolute left-0 right-0 top-[calc(100%+0.25rem)] z-[70] max-h-60 overflow-y-auto rounded-md border border-[var(--select-border)] bg-[var(--select-panel)] p-1 shadow-[var(--shadow-float)]"
          id={listboxId}
          role="listbox"
        >
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                aria-selected={isSelected}
                className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition ${
                  isSelected
                    ? "bg-[color:var(--accent-sage-surface)] text-[color:var(--accent-sage-text)]"
                    : "text-[color:var(--text-primary)] hover:bg-[color:var(--surface-secondary)]"
                }`}
                key={option.value}
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
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: option.color }}
                  />
                ) : null}
                <span className="min-w-0 truncate">{option.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function ExpensesBoard({
  initialExpenses,
  initialStats,
  initialCategories,
  members,
  initialYear,
  initialMonth,
}: Props) {
  const t = useTranslations("expensesPage");
  const locale = useLocale();
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [allExpenses, setAllExpenses] = useState(initialExpenses);
  const [stats, setStats] = useState(initialStats);
  const [categories, setCategories] = useState(initialCategories);
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [hoveredCategoryKey, setHoveredCategoryKey] = useState<string | null>(null);
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(null);
  const [expenseMixView, setExpenseMixView] = useState<ExpenseMixView>("category");
  const activeCategoryKey = hoveredCategoryKey ?? selectedCategoryKey;
  const donutRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!selectedCategoryKey) return;
    function handleOutsideClick(e: MouseEvent) {
      if (donutRef.current && !donutRef.current.contains(e.target as Node)) {
        setSelectedCategoryKey(null);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [selectedCategoryKey]);
  const [hoveredNetPoint, setHoveredNetPoint] = useState<NetPoint | null>(null);
  const [memberTooltip, setMemberTooltip] = useState<{ name: string; x: number; y: number } | null>(null);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(defaultCategoryForm);
  const [selectedColorGroupName, setSelectedColorGroupName] = useState<string>(EXPENSE_CATEGORY_COLOR_GROUPS[0].name);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  const isFirstRender = useRef(true);
  const fetchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    void fetchMonth(year, month);
  }, [year, month]);

  async function fetchMonth(y: number, m: number) {
    fetchAbortRef.current?.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/expenses?year=${y}&month=${m}`, { signal: controller.signal });
      if (!res.ok) return;
      const data = (await res.json()) as { expenses: ExpenseView[]; stats: MonthStats };
      setAllExpenses(data.expenses);
      setStats(data.stats);
    } catch (e) {
      if ((e as DOMException).name !== "AbortError") throw e;
    } finally {
      if (fetchAbortRef.current === controller) setIsLoading(false);
    }
  }

  function prevMonth() {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  function setMonthFromPicker(value: string) {
    const [pickedYear, pickedMonth] = value.split("-").map(Number);

    if (!Number.isInteger(pickedYear) || !Number.isInteger(pickedMonth)) return;
    setYear(pickedYear);
    setMonth(pickedMonth);
  }

  function jumpToCurrentMonth() {
    const current = currentYearMonth();
    setYear(current.year);
    setMonth(current.month);
  }

  function updateForm(patch: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function memberDisplayName(member: MemberView): string {
    return member.name ?? member.email ?? t("memberFallback");
  }

  function toggleSplitEnabled() {
    setForm((prev) => {
      const nextEnabled = !prev.splitEnabled;
      return {
        ...prev,
        splitEnabled: nextEnabled,
        splitHouseholdMemberIds: nextEnabled
          ? prev.splitHouseholdMemberIds.length > 0
            ? prev.splitHouseholdMemberIds
            : prev.householdMemberId
              ? [prev.householdMemberId]
              : []
          : [],
      };
    });
  }

  function toggleSplitMember(memberId: string) {
    setForm((prev) => {
      const selected = new Set(prev.splitHouseholdMemberIds);
      if (selected.has(memberId)) {
        selected.delete(memberId);
      } else {
        selected.add(memberId);
      }
      return { ...prev, splitHouseholdMemberIds: Array.from(selected) };
    });
  }

  function selectHouseholdMember(value: string) {
    setForm((prev) => ({
      ...prev,
      householdMemberId: value,
      splitHouseholdMemberIds:
        prev.splitEnabled && (prev.splitHouseholdMemberIds.length === 0 ||
          (prev.splitHouseholdMemberIds.length === 1 && prev.splitHouseholdMemberIds[0] === prev.householdMemberId))
          ? value
            ? [value]
            : []
          : prev.splitHouseholdMemberIds,
    }));
  }

  function selectExpenseType(entryType: "INCOME" | "EXPENSE") {
    setForm((prev) => ({
      ...prev,
      type: entryType,
      splitEnabled: entryType === "EXPENSE" ? prev.splitEnabled : false,
      splitHouseholdMemberIds: entryType === "EXPENSE" ? prev.splitHouseholdMemberIds : [],
    }));
  }

  function resetForm() {
    setShowForm(false);
    setForm(defaultForm);
    setFormError(null);
    setEditingId(null);
  }

  function openCreateForm() {
    const nextForm = defaultFormForMonth(year, month);

    setShowForm((visible) => {
      const nextVisible = editingId ? true : !visible;
      if (!nextVisible) {
        setForm(nextForm);
      }
      return nextVisible;
    });
    setEditingId(null);
    setFormError(null);
    if (!showForm || editingId) setForm(nextForm);
  }

  function openEditForm(expense: ExpenseView) {
    setEditingId(expense.id);
    setForm(formFromExpense(expense));
    setFormError(null);
    setConfirmDeleteId(null);
    setShowForm(true);
  }

  function openCategoryDialog() {
    const category = categories.find((cat) => cat.id === categoryForm.id) ?? categories[0];
    const color = category?.color ?? defaultCategoryForm.color;

    setCategoryForm(
      category
        ? { id: category.id, name: category.name, color }
        : defaultCategoryForm,
    );
    setSelectedColorGroupName(findCategoryColorGroup(color).name);
    setCategoryError(null);
    setShowCategoryDialog(true);
  }

  function closeCategoryDialog() {
    setShowCategoryDialog(false);
    setCategoryError(null);
  }

  function selectCategoryForEdit(categoryId: string) {
    const category = categories.find((cat) => cat.id === categoryId);
    const color = category?.color ?? defaultCategoryForm.color;

    setCategoryForm(
      category
        ? { id: category.id, name: category.name, color }
        : defaultCategoryForm,
    );
    setSelectedColorGroupName(findCategoryColorGroup(color).name);
    setCategoryError(null);
  }

  function applyExpenseChange(expense: ExpenseView) {
    const expenseYM = expense.date.slice(0, 7);
    const currentYM = monthValue(year, month);

    setAllExpenses((prev) => {
      const withoutExisting = prev.filter((item) => item.id !== expense.id);
      const nextExpenses =
        expenseYM === currentYM ? [...withoutExisting, expense].sort(compareExpensesByDateDesc) : withoutExisting;
      setStats((prevStats) => calculateStats(nextExpenses, prevStats.carryover));
      return nextExpenses;
    });

    if (expenseYM !== currentYM) {
      void fetchMonth(year, month);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const amount = parseFloat(form.amount);
      if (!isFinite(amount) || amount <= 0) {
        setFormError(t("errorPositiveAmount"));
        return;
      }
      const splitHouseholdMemberIds = form.type === "EXPENSE" && form.splitEnabled ? form.splitHouseholdMemberIds : [];
      if (form.splitEnabled && form.type === "EXPENSE" && splitHouseholdMemberIds.length < 2) {
        setFormError(t("errorSplitMembers"));
        return;
      }
      if (splitHouseholdMemberIds.length > 0 && !form.householdMemberId) {
        setFormError(t("errorSplitPayer"));
        return;
      }

      let categoryId: string | null = form.categoryId === "__new__" ? null : (form.categoryId || null);

      if (form.categoryId === "__new__") {
        const trimmed = form.newCategoryName.trim();
        if (!trimmed) {
          setFormError(t("errorNewCategoryName"));
          return;
        }
        const catRes = await fetch("/api/expenses/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed }),
        });
        if (!catRes.ok) {
          setFormError(t("errorCreateCategory"));
          return;
        }
        const catData = (await catRes.json()) as { category: CategoryView };
        const newCat = catData.category;
        setCategories((prev) =>
          [...prev, newCat].sort((a, b) => a.name.localeCompare(b.name)),
        );
        categoryId = newCat.id;
      }

      const res = await fetch(editingId ? `/api/expenses/${editingId}` : "/api/expenses", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          amount,
          type: form.type,
          date: form.date,
          notes: form.notes.trim() || null,
          categoryId,
          householdMemberId: form.householdMemberId || null,
          memberName: null,
          splitHouseholdMemberIds,
        }),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as Record<string, string>;
        setFormError(err.error ?? t("errorSaveEntry"));
        return;
      }

      const data = (await res.json()) as { expense: ExpenseView };
      applyExpenseChange(data.expense);
      if (!editingId) {
        trackAnalyticsEvent("expense_added", {
          has_category: Boolean(data.expense.categoryId),
          has_member: Boolean(data.expense.householdMemberId),
          has_split: data.expense.splits.length > 0,
          type: data.expense.type.toLowerCase(),
        });
      }
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setConfirmDeleteId(null);
    setDeletingId(id);
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (!res.ok) return;
      setAllExpenses((prev) => {
        const nextExpenses = prev.filter((e) => e.id !== id);
        setStats((prevStats) => calculateStats(nextExpenses, prevStats.carryover));
        return nextExpenses;
      });
      if (editingId === id) resetForm();
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCategorySave(e: React.FormEvent) {
    e.preventDefault();
    setCategoryError(null);

    const name = categoryForm.name.trim();
    if (!categoryForm.id) {
      setCategoryError(t("errorChooseCategory"));
      return;
    }
    if (!name) {
      setCategoryError(t("errorCategoryName"));
      return;
    }
    if (!HEX_COLOR_PATTERN.test(categoryForm.color)) {
      setCategoryError(t("errorCategoryColor"));
      return;
    }

    setIsSavingCategory(true);
    try {
      const res = await fetch(`/api/expenses/categories/${categoryForm.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color: categoryForm.color }),
      });

      if (!res.ok) {
        setCategoryError(t("errorUpdateCategory"));
        return;
      }

      const data = (await res.json()) as { category: CategoryView };
      const category = data.category;

      setCategories((prev) =>
        prev
          .map((item) => (item.id === category.id ? category : item))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      setAllExpenses((prev) =>
        prev.map((expense) =>
          expense.categoryId === category.id
            ? { ...expense, categoryColor: category.color, categoryName: category.name }
            : expense,
        ),
      );
      setCategoryForm({ id: category.id, name: category.name, color: category.color });
      setSelectedColorGroupName(findCategoryColorGroup(category.color).name);
      closeCategoryDialog();
    } finally {
      setIsSavingCategory(false);
    }
  }

  function handleNetChartPointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const pointerX = ((event.clientX - rect.left) / rect.width) * 360;
    const nearestPoint = netChart.points.reduce<NetPoint | null>((nearest, point) =>
      !nearest || Math.abs(point.x - pointerX) < Math.abs(nearest.x - pointerX) ? point : nearest,
      null,
    );

    if (!nearestPoint) return;
    setHoveredNetPoint(nearestPoint);
  }

  const displayedExpenses = filterCategoryId
    ? allExpenses.filter((e) => e.categoryId === filterCategoryId)
    : allExpenses;

  const netChart = buildNetChart(allExpenses, year, month, stats.carryover);
  const categorySlices = buildCategorySlices(allExpenses, t);
  const payeeSlices = buildPayeeSlices(allExpenses, t);
  const expenseMixSlices = expenseMixView === "category" ? categorySlices : payeeSlices;
  const settleUpTransfers = buildSettleUpTransfers(allExpenses);
  const netSign = stats.net >= 0 ? "+" : "";
  const monthLabel = formatMonthLabel(year, month, locale);
  const monthName = formatMonthName(year, month, locale);
  const previousMonthLabel = month === 1
    ? formatMonthLabel(year - 1, 12, locale)
    : formatMonthLabel(year, month - 1, locale);
  const showCarryoverRow = !filterCategoryId && stats.carryover !== 0;
  const hasExpenseRows = displayedExpenses.length > 0 || showCarryoverRow;
  const currentMonth = currentYearMonth();
  const isCurrentMonth = year === currentMonth.year && month === currentMonth.month;
  const categoryOptions = categories.map((category) => ({
    color: category.color,
    label: category.name,
    value: category.id,
  }));
  const expenseCategoryOptions = [
    { label: t("noCategory"), value: "" },
    ...categoryOptions,
    { label: t("newCategoryOption"), value: "__new__" },
  ];
  const filterCategoryOptions = [{ label: t("allCategories"), value: "" }, ...categoryOptions];
  const memberOptions = [
    { label: t("unspecified"), value: "" },
    ...members.map((member) => ({ label: memberDisplayName(member), value: member.id })),
  ];
  const selectedColorGroup =
    EXPENSE_CATEGORY_COLOR_GROUPS.find((group) => group.name === selectedColorGroupName) ??
    findCategoryColorGroup(categoryForm.color);

  return (
    <div className="mx-auto w-full max-w-[940px] px-0 py-5 sm:px-6 sm:py-6">
      {/* Month picker */}
      <div className="mb-6 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <h1 className="min-w-0 font-serif text-2xl font-semibold text-[color:var(--text-strong)] sm:text-3xl">
            {monthLabel}
          </h1>
          <button
            className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-md border border-[color:var(--input-border)] bg-[color:var(--surface-primary)] px-3 text-sm font-medium text-[color:var(--text-primary)] transition hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-secondary)] disabled:opacity-50 sm:h-8 sm:px-2.5"
            disabled={categories.length === 0}
            onClick={openCategoryDialog}
            type="button"
          >
            <Settings aria-hidden className="h-4 w-4" />
            <span>{t("categories")}</span>
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            aria-label={t("previousMonth")}
            className="flex h-11 w-11 items-center justify-center rounded-md border border-[color:var(--input-border)] bg-[color:var(--surface-primary)] text-[color:var(--text-primary)] transition hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-secondary)] sm:h-8 sm:w-8"
            onClick={prevMonth}
            type="button"
          >
            <ChevronLeft aria-hidden className="h-4 w-4" />
          </button>
          <label className="sr-only" htmlFor="expense-month">
            {t("monthLabel")}
          </label>
          <div className="relative h-11 w-11 sm:h-8 sm:w-8">
            <input
              aria-label={t("chooseMonth")}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              id="expense-month"
              max="2100-12"
              min="2000-01"
              onChange={(e) => setMonthFromPicker(e.target.value)}
              type="month"
              value={monthValue(year, month)}
            />
            <span
              aria-hidden
              className="pointer-events-none flex h-full w-full items-center justify-center rounded-md border border-[color:var(--input-border)] bg-[color:var(--surface-primary)] text-[color:var(--text-primary)]"
            >
              <CalendarDays className="h-4 w-4" />
            </span>
          </div>
          <button
            aria-label={t("nextMonth")}
            className="flex h-11 w-11 items-center justify-center rounded-md border border-[color:var(--input-border)] bg-[color:var(--surface-primary)] text-[color:var(--text-primary)] transition hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-secondary)] sm:h-8 sm:w-8"
            onClick={nextMonth}
            type="button"
          >
            <ChevronRight aria-hidden className="h-4 w-4" />
          </button>
          {!isCurrentMonth ? (
            <button
              className="inline-flex h-11 items-center rounded-md border border-[color:var(--input-border)] bg-[color:var(--surface-primary)] px-3 py-1.5 text-sm font-medium text-[color:var(--text-primary)] transition hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-secondary)] sm:h-auto"
              onClick={jumpToCurrentMonth}
              type="button"
            >
              {t("today")}
            </button>
          ) : null}
        </div>
      </div>

      {showCategoryDialog ? (
        <div
          aria-labelledby="expense-category-dialog-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 pb-[calc(0.75rem_+_env(safe-area-inset-bottom))] sm:items-center sm:p-4"
          role="dialog"
        >
          <form
            className="max-h-[calc(100dvh_-_1.5rem_-_env(safe-area-inset-bottom))] w-full max-w-md overflow-y-auto rounded-md border border-[color:var(--border-default)] bg-[color:var(--surface-primary)] p-4 shadow-[var(--shadow-float)] sm:max-h-[calc(100dvh-2rem)] sm:p-5"
            onSubmit={(event) => void handleCategorySave(event)}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[color:var(--accent-rose-text)]">
                  {t("label")}
                </p>
                <h2
                  className="mt-1 font-serif text-2xl font-semibold tracking-normal text-[color:var(--text-strong)]"
                  id="expense-category-dialog-title"
                >
                  {t("editCategory")}
                </h2>
              </div>
              <button
                aria-label={t("closeCategoryDialog")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[color:var(--input-border)] bg-[color:var(--input-background)] text-xl font-semibold leading-none text-[color:var(--text-muted)] transition hover:bg-[color:var(--surface-secondary)]"
                disabled={isSavingCategory}
                onClick={closeCategoryDialog}
                type="button"
              >
                <span aria-hidden>&times;</span>
              </button>
            </div>

            {categoryError ? (
              <p className="mb-4 rounded-md border border-[color:var(--accent-rose-border)] bg-[color:var(--accent-rose-soft)] px-3 py-2 text-sm text-[color:var(--accent-rose-text)]">
                {categoryError}
              </p>
            ) : null}

            <div className="grid gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-[color:var(--text-primary)]" htmlFor="category-edit-select">
                  {t("categoryLabel")}
                </label>
                <CustomSelect
                  buttonClassName="[--select-bg:var(--input-background)] [--select-panel:var(--surface-primary)]"
                  id="category-edit-select"
                  onChange={selectCategoryForEdit}
                  options={categoryOptions}
                  value={categoryForm.id}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[color:var(--text-primary)]" htmlFor="category-edit-name">
                  {t("nameLabel")}
                </label>
                <input
                  className="w-full rounded-md border border-[color:var(--input-border)] bg-[color:var(--input-background)] px-3 py-2 text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--input-placeholder)] focus:border-[color:var(--focus-ring)] focus:outline-none"
                  id="category-edit-name"
                  maxLength={60}
                  onChange={(event) => setCategoryForm((prev) => ({ ...prev, name: event.target.value }))}
                  required
                  type="text"
                  value={categoryForm.name}
                />
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-[color:var(--text-primary)]">
                  {t("colorLabel")}
                </p>
                <div className="grid gap-3 rounded-md border border-[color:var(--input-border)] bg-[color:var(--input-background)] p-3">
                  <div>
                    <p className="mb-2 text-xs text-[color:var(--text-muted)]">
                      {t("colorFamily")}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                    {EXPENSE_CATEGORY_COLOR_GROUPS.map((group) => (
                      <button
                        aria-label={t("showColorShades", { color: colorGroupLabel(group.name, t) })}
                        className={`h-8 w-8 rounded-md border transition ${
                          selectedColorGroup.name === group.name
                            ? "border-[color:var(--text-strong)] ring-2 ring-[color:var(--text-strong)]/15"
                            : "border-[color:var(--input-border)] hover:border-[color:var(--border-strong)]"
                        }`}
                        key={group.name}
                        onClick={() => {
                          setSelectedColorGroupName(group.name);
                          setCategoryForm((prev) => ({ ...prev, color: group.base }));
                        }}
                        style={{ backgroundColor: group.base }}
                        title={colorGroupLabel(group.name, t)}
                        type="button"
                      />
                    ))}
                    </div>
                  </div>
                  <div className="border-t border-[color:var(--border-muted)] pt-3">
                    <p className="mb-2 text-xs text-[color:var(--text-muted)]">
                      {t("colorShades", { color: colorGroupLabel(selectedColorGroup.name, t) })}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {selectedColorGroup.shades.map((color) => (
                        <button
                          aria-label={t("useColorShade", { color: colorGroupLabel(selectedColorGroup.name, t), value: color })}
                          className={`h-8 w-8 rounded-md border transition ${
                            categoryForm.color.toLowerCase() === color.toLowerCase()
                              ? "border-[color:var(--text-strong)] ring-2 ring-[color:var(--text-strong)]/15"
                              : "border-[color:var(--input-border)] hover:border-[color:var(--border-strong)]"
                          }`}
                          key={color}
                          onClick={() => setCategoryForm((prev) => ({ ...prev, color }))}
                          style={{ backgroundColor: color }}
                          type="button"
                        />
                      ))}
                    </div>
                  </div>
                  <label
                    className="flex items-center gap-2 border-t border-[color:var(--border-muted)] pt-3 text-xs text-[color:var(--text-muted)]"
                    htmlFor="category-edit-color"
                  >
                    <span>{t("customColor")}</span>
                    <input
                      className="h-8 w-12 rounded-md border border-[color:var(--input-border)] bg-[color:var(--input-background)] p-1 focus:border-[color:var(--focus-ring)] focus:outline-none"
                      id="category-edit-color"
                      onChange={(event) => {
                        setCategoryForm((prev) => ({ ...prev, color: event.target.value }));
                        setSelectedColorGroupName(findCategoryColorGroup(event.target.value).name);
                      }}
                      type="color"
                      value={categoryForm.color}
                    />
                    <span className="font-mono uppercase">{categoryForm.color}</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                className="rounded-md border border-[color:var(--input-border)] px-4 py-2 text-sm text-[color:var(--text-primary)] transition hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-secondary)]"
                disabled={isSavingCategory}
                onClick={closeCategoryDialog}
                type="button"
              >
                {t("cancel")}
              </button>
              <button
                className="rounded-md border border-[color:var(--button-primary-border)] bg-[color:var(--button-primary-bg)] px-4 py-2 text-sm font-medium text-[color:var(--button-primary-text)] transition hover:bg-[color:var(--button-primary-hover)] disabled:opacity-50"
                disabled={isSavingCategory || !categoryForm.id}
                type="submit"
              >
                {isSavingCategory ? t("saving") : t("saveCategory")}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Stats panel */}
      <div
        className={`mb-6 grid grid-cols-1 gap-2 min-[420px]:grid-cols-3 sm:gap-3 transition-opacity ${isLoading ? "opacity-50" : ""}`}
      >
        <div className="rounded-md border border-[color:var(--border-default)] bg-[color:var(--surface-primary)] p-3 shadow-[var(--shadow-soft)] sm:p-4">
          <p className="text-[10px] font-semibold uppercase tracking-normal text-[color:var(--accent-sage-text)] sm:text-xs">{t("income")}</p>
          <p className="mt-1 break-words font-serif text-xl font-semibold text-[color:var(--accent-sage-text)] sm:text-2xl">
            {formatAmount(stats.income, locale)}
          </p>
        </div>
        <div className="rounded-md border border-[color:var(--border-default)] bg-[color:var(--surface-primary)] p-3 shadow-[var(--shadow-soft)] sm:p-4">
          <p className="text-[10px] font-semibold uppercase tracking-normal text-[color:var(--accent-rose-text)] sm:text-xs">
            {t("expenses")}
          </p>
          <p className="mt-1 break-words font-serif text-xl font-semibold text-[color:var(--accent-rose-text)] sm:text-2xl">
            {formatAmount(stats.expenses, locale)}
          </p>
        </div>
        <div className="rounded-md border border-[color:var(--border-default)] bg-[color:var(--surface-primary)] p-3 shadow-[var(--shadow-soft)] sm:p-4">
          <p className="text-[10px] font-semibold uppercase tracking-normal text-[color:var(--text-muted)] sm:text-xs">
            {t("net")}
          </p>
          <p
            className={`mt-1 break-words font-serif text-xl font-semibold sm:text-2xl ${stats.net >= 0 ? "text-[color:var(--accent-sage-text)]" : "text-[color:var(--accent-rose-text)]"}`}
          >
            {netSign}
            {formatAmount(stats.net, locale)}
          </p>
          <p className="mt-1 text-[10px] leading-4 text-[color:var(--text-muted)] sm:text-xs">
            {t("carriedIn", { amount: `${stats.carryover >= 0 ? "+" : ""}${formatAmount(stats.carryover, locale)}` })}
          </p>
        </div>
      </div>

      <section
        aria-label={t("statisticsFor", { month: monthLabel })}
        className={`mb-6 grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.85fr)] transition-opacity ${isLoading ? "opacity-50" : ""}`}
      >
        <div className="hidden sm:flex flex-col rounded-md border border-[color:var(--border-default)] bg-[color:var(--surface-primary)] p-4 shadow-[var(--shadow-soft)]">
          <div className="mb-4">
            <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[color:var(--accent-rose-text)]">
              {t("netBalance")}
            </p>
          </div>
          <div className="relative grow">
            <svg
              aria-label={t("netChartAria", { month: monthLabel })}
              className="h-full min-h-48 w-full overflow-visible"
              onPointerLeave={() => setHoveredNetPoint(null)}
              onPointerMove={handleNetChartPointerMove}
              preserveAspectRatio="none"
              role="img"
              viewBox="0 0 360 170"
            >
              <line stroke="var(--border-muted)" strokeWidth="1" x1="20" x2="340" y1="10" y2="10" />
              <line stroke="var(--border-muted)" strokeWidth="1" x1="20" x2="340" y1="75" y2="75" />
              <line stroke="var(--border-muted)" strokeWidth="1" x1="20" x2="340" y1="140" y2="140" />
              <line
                stroke="var(--border-strong)"
                strokeDasharray="4 4"
                strokeWidth="1"
                x1="20"
                x2="340"
                y1={netChart.zeroY}
                y2={netChart.zeroY}
              />
              <path
                d={netChart.path}
                fill="none"
                stroke={stats.net >= 0 ? "var(--accent-sage-strong)" : "var(--accent-rose-strong)"}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
                vectorEffect="non-scaling-stroke"
              />
              {hoveredNetPoint ? (
                <>
                  <line
                    stroke="var(--border-strong)"
                    strokeDasharray="3 3"
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                    x1={hoveredNetPoint.x}
                    x2={hoveredNetPoint.x}
                    y1="10"
                    y2="140"
                  />
                  <circle
                    cx={hoveredNetPoint.x}
                    cy={hoveredNetPoint.y}
                    fill="var(--surface-primary)"
                    r="4"
                    stroke={stats.net >= 0 ? "var(--accent-sage-strong)" : "var(--accent-rose-strong)"}
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                  />
                </>
              ) : null}
              {netChart.points
                .filter((point) => point.day === 1 || point.day === daysInMonth(year, month))
                .map((point) => (
                  <circle
                    cx={point.x}
                    cy={point.y}
                    fill="var(--surface-primary)"
                    key={point.day}
                    r="3"
                    stroke={stats.net >= 0 ? "var(--accent-sage-strong)" : "var(--accent-rose-strong)"}
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
            </svg>
            {hoveredNetPoint ? (
              <div
                className="pointer-events-none absolute z-20 w-56 rounded-lg border border-[color:var(--border-default)] bg-[color:var(--surface-primary)] p-3 text-xs text-[color:var(--text-primary)] shadow-[var(--shadow-float)]"
                style={{
                  left: `${(hoveredNetPoint.x / 360) * 100}%`,
                  top: `${Math.min(84, Math.max(16, (hoveredNetPoint.y / 170) * 100))}%`,
                  transform: hoveredNetPoint.x > 240
                    ? "translate(calc(-100% - 0.75rem), -50%)"
                    : "translate(0.75rem, -50%)",
                }}
              >
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <p className="font-medium text-[color:var(--text-strong)]">
                    {formatShortMonthDay(year, month, hoveredNetPoint.day, locale)}
                  </p>
                  <p className={`font-semibold tabular-nums ${hoveredNetPoint.value >= 0 ? "text-[color:var(--accent-sage-text)]" : "text-[color:var(--accent-rose-text)]"}`}>
                    {hoveredNetPoint.value >= 0 ? "+" : ""}
                    {formatAmount(hoveredNetPoint.value, locale)}
                  </p>
                </div>
                {hoveredNetPoint.entries.length > 0 ? (
                  <div className="grid gap-1.5">
                    {hoveredNetPoint.entries.slice(0, 3).map((entry) => {
                      return (
                        <div
                          className="flex items-center gap-2 rounded-md border border-[color:var(--border-muted)] bg-[color:var(--surface-secondary)] px-2 py-1.5"
                          key={entry.id}
                        >
                          {entry.memberColor && entry.memberName ? (
                            <MemberAvatar
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-[10px] font-semibold"
                              color={entry.memberColor}
                              emoji={entry.memberEmoji}
                              fallbackLabel={entry.memberName}
                              name={entry.memberName}
                              title={entry.memberName}
                            />
                          ) : (
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[color:var(--input-border)] bg-[color:var(--surface-muted)] text-[10px] text-[color:var(--text-subtle)]">
                              ?
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-[color:var(--text-primary)]">{entry.name}</p>
                            <p className={`tabular-nums ${entry.type === "INCOME" ? "text-[color:var(--accent-sage-text)]" : "text-[color:var(--accent-rose-text)]"}`}>
                              {entry.type === "INCOME" ? "+" : "−"}
                              {formatAmount(entry.amount, locale)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {hoveredNetPoint.entries.length > 3 ? (
                      <p className="pl-1 text-[color:var(--text-subtle)]">{t("moreEntries", { count: hoveredNetPoint.entries.length - 3 })}</p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-[color:var(--text-subtle)]">{t("noChangeRecorded")}</p>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col rounded-md border border-[color:var(--border-default)] bg-[color:var(--surface-primary)] p-4 shadow-[var(--shadow-soft)]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[color:var(--accent-rose-text)]">
              {t("expenseMix")}
            </p>
            <div className="inline-flex rounded-md border border-[color:var(--input-border)] bg-[color:var(--surface-secondary)] p-0.5" role="group">
              {(["category", "payee"] as const).map((view) => (
                <button
                  className={`rounded px-2 py-1 text-xs font-medium transition ${
                    expenseMixView === view
                      ? "bg-[color:var(--input-background)] text-[color:var(--text-strong)] shadow-sm"
                      : "text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)]"
                  }`}
                  key={view}
                  onClick={() => {
                    setExpenseMixView(view);
                    setHoveredCategoryKey(null);
                    setSelectedCategoryKey(null);
                  }}
                  type="button"
                >
                  {view === "category" ? t("categoryView") : t("payeeView")}
                </button>
              ))}
            </div>
          </div>
          {expenseMixSlices.length === 0 ? (
            <div className="flex grow min-h-48 items-center justify-center rounded-md border border-dashed border-[color:var(--input-border)] px-4 text-center text-sm text-[color:var(--text-subtle)]">
              {expenseMixView === "category"
                ? t("noExpenseBreakdown", { month: monthLabel })
                : t("noPayeeBreakdown", { month: monthLabel })}
            </div>
          ) : (
            <div className="flex grow items-center justify-center p-3">
              <div className="relative w-full max-w-[180px] sm:max-w-[320px] aspect-square" ref={donutRef}>
                <svg
                  aria-label={
                    expenseMixView === "category"
                      ? t("categoryChartAria", { month: monthLabel })
                      : t("payeeChartAria", { month: monthLabel })
                  }
                  className="h-full w-full"
                  onMouseLeave={() => setHoveredCategoryKey(null)}
                  role="img"
                  viewBox="0 0 120 120"
                >
                  <rect
                    fill="transparent"
                    height="120"
                    onClick={() => setSelectedCategoryKey(null)}
                    width="120"
                    x="0"
                    y="0"
                  />
                  <circle cx="60" cy="60" fill="none" r="42" stroke="var(--border-muted)" strokeWidth="18" />
                  {expenseMixSlices.map((slice) => (
                    <circle
                      cx="60"
                      cy="60"
                      fill="none"
                      key={slice.key}
                      onMouseEnter={() => setHoveredCategoryKey(slice.key)}
                      onClick={() => setSelectedCategoryKey(slice.key)}
                      opacity={activeCategoryKey && activeCategoryKey !== slice.key ? 0.22 : 1}
                      r="42"
                      stroke={slice.color}
                      strokeDasharray={slice.dash}
                      strokeDashoffset={-slice.offset}
                      strokeLinecap="butt"
                      strokeWidth={activeCategoryKey === slice.key ? 20 : 18}
                      className="cursor-pointer transition-[opacity,stroke-width] duration-150"
                      transform="rotate(-90 60 60)"
                    />
                  ))}
                  <text
                    fill="var(--text-strong)"
                    fontFamily="serif"
                    fontSize="15"
                    fontWeight="600"
                    textAnchor="middle"
                    x="60"
                    y="58"
                  >
                    {formatAmount(stats.expenses, locale)}
                  </text>
                  <text fill="var(--text-muted)" fontSize="9" textAnchor="middle" x="60" y="72">
                    {t("total")}
                  </text>
                </svg>
                {(() => {
                  const activeSlice = activeCategoryKey ? expenseMixSlices.find((s) => s.key === activeCategoryKey) : null;
                  if (!activeSlice) return null;
                  return (
                    <div className="absolute left-1/2 top-full z-20 mt-2 w-44 -translate-x-1/2 rounded-md border border-[color:var(--border-default)] bg-[color:var(--surface-primary)] px-3 py-2 shadow-[var(--shadow-soft)]">
                      <div className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className="h-2.5 w-2.5 shrink-0 rounded-sm"
                          style={{ backgroundColor: activeSlice.color }}
                        />
                        <span className="min-w-0 truncate text-sm font-medium text-[color:var(--text-primary)]">
                          {activeSlice.label}
                        </span>
                      </div>
                      <p className="mt-1 tabular-nums text-xs text-[color:var(--text-muted)]">
                        {activeSlice.percent.toFixed(0)}% · {formatAmount(activeSlice.amount, locale)}
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </section>

      <section
        aria-label={t("settleUp")}
        className={`mb-6 rounded-md border border-[color:var(--border-default)] bg-[color:var(--surface-primary)] p-4 shadow-[var(--shadow-soft)] transition-opacity ${isLoading ? "opacity-50" : ""}`}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[color:var(--accent-rose-text)]">
              {t("settleUp")}
            </p>
            <p className="mt-1 text-xs text-[color:var(--text-muted)]">{t("settleUpFor", { month: monthLabel })}</p>
          </div>
        </div>
        {settleUpTransfers.length === 0 ? (
          <div className="rounded-md border border-dashed border-[color:var(--input-border)] px-4 py-3 text-sm text-[color:var(--text-subtle)]">
            {t("nothingToSettle", { month: monthLabel })}
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {settleUpTransfers.map((transfer) => (
              <div
                className="flex items-center justify-between gap-3 rounded-md border border-[color:var(--border-muted)] bg-[color:var(--surface-muted)] px-3 py-2"
                key={`${transfer.from.id}-${transfer.to.id}-${transfer.amount}`}
              >
                <div className="min-w-0 flex items-center gap-2">
                  <MemberAvatar
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border font-serif text-xs font-semibold"
                    color={transfer.from.color}
                    emoji={transfer.from.emoji}
                    fallbackLabel={transfer.from.name}
                    name={transfer.from.name}
                    title={transfer.from.name}
                  />
                  <span className="min-w-0 truncate text-sm text-[color:var(--text-primary)]">
                    {t("pays")}
                  </span>
                  <MemberAvatar
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border font-serif text-xs font-semibold"
                    color={transfer.to.color}
                    emoji={transfer.to.emoji}
                    fallbackLabel={transfer.to.name}
                    name={transfer.to.name}
                    title={transfer.to.name}
                  />
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-[color:var(--accent-rose-text)]">
                  {formatAmount(transfer.amount, locale)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Filter bar + add button */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <CustomSelect
          buttonClassName="py-1.5"
          className="w-full min-w-0 sm:min-w-44"
          id="expense-filter-category"
          onChange={setFilterCategoryId}
          options={filterCategoryOptions}
          value={filterCategoryId}
        />

        <button
          className="flex h-11 w-full items-center justify-center gap-1.5 rounded-md border border-[color:var(--button-primary-border)] bg-[color:var(--button-primary-bg)] px-3 py-1.5 text-sm font-medium text-[color:var(--button-primary-text)] transition hover:bg-[color:var(--button-primary-hover)] sm:ml-auto sm:h-auto sm:w-auto"
          onClick={openCreateForm}
          type="button"
        >
          <Plus aria-hidden className="h-4 w-4" />
          {t("addExpense")}
        </button>
      </div>

      {showForm && (
        <div
          aria-labelledby="expense-entry-dialog-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 pb-[calc(0.75rem_+_env(safe-area-inset-bottom))] sm:items-center sm:p-4"
          role="dialog"
        >
          <form
            className="max-h-[calc(100dvh_-_1.5rem_-_env(safe-area-inset-bottom))] w-full max-w-2xl overflow-y-auto rounded-md border border-[color:var(--border-default)] bg-[color:var(--surface-primary)] p-5 shadow-[var(--shadow-float)] sm:max-h-[calc(100dvh-2rem)]"
            onSubmit={(e) => void handleSubmit(e)}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="font-serif text-lg font-semibold text-[color:var(--text-strong)]" id="expense-entry-dialog-title">
                {editingId ? t("editEntry") : t("newEntry")}
              </h2>
              <button
                aria-label={t("cancel")}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[color:var(--input-border)] bg-[color:var(--input-background)] text-[color:var(--text-muted)] transition hover:bg-[color:var(--surface-secondary)]"
                disabled={isSubmitting}
                onClick={resetForm}
                type="button"
              >
                <X aria-hidden className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <p className="mb-4 rounded-md border border-[color:var(--accent-rose-border)] bg-[color:var(--accent-rose-soft)] px-3 py-2 text-sm text-[color:var(--accent-rose-text)]">
                {formError}
              </p>
            )}

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Name */}
            <div className="sm:col-span-2">
              <label
                className="mb-1 block text-xs font-medium text-[color:var(--text-primary)]"
                htmlFor="exp-name"
              >
                {t("nameLabel")}
              </label>
              <input
                autoFocus
                className="w-full rounded-md border border-[color:var(--input-border)] bg-[color:var(--input-background)] px-3 py-2 text-base text-[color:var(--text-primary)] placeholder:text-[color:var(--input-placeholder)] focus:border-[color:var(--focus-ring)] focus:outline-none sm:text-sm"
                id="exp-name"
                onChange={(e) => updateForm({ name: e.target.value })}
                placeholder={t("namePlaceholder")}
                required
                type="text"
                value={form.name}
              />
            </div>

            {/* Amount */}
            <div>
              <label
                className="mb-1 block text-xs font-medium text-[color:var(--text-primary)]"
                htmlFor="exp-amount"
              >
                {t("amountLabel")}
              </label>
              <input
                className="w-full rounded-md border border-[color:var(--input-border)] bg-[color:var(--input-background)] px-3 py-2 text-base text-[color:var(--text-primary)] placeholder:text-[color:var(--input-placeholder)] focus:border-[color:var(--focus-ring)] focus:outline-none sm:text-sm"
                id="exp-amount"
                min="0.01"
                onChange={(e) => updateForm({ amount: e.target.value })}
                placeholder="0.00"
                required
                step="0.01"
                type="number"
                value={form.amount}
              />
            </div>

            {/* Type */}
            <div>
              <p className="mb-1 text-xs font-medium text-[color:var(--text-primary)]">{t("typeLabel")}</p>
              <div className="flex gap-2">
                {(["EXPENSE", "INCOME"] as const).map((entryType) => (
                  <button
                    className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition ${
                      form.type === entryType
                        ? entryType === "INCOME"
                          ? "border-[color:var(--accent-sage-border)] bg-[color:var(--accent-sage-surface)] text-[color:var(--accent-sage-text)]"
                          : "border-[color:var(--accent-rose-border)] bg-[color:var(--accent-rose-soft)] text-[color:var(--accent-rose-text)]"
                        : "border-[color:var(--input-border)] bg-[color:var(--input-background)] text-[color:var(--text-primary)] hover:border-[color:var(--border-strong)]"
                    }`}
                    key={entryType}
                    onClick={() => selectExpenseType(entryType)}
                    type="button"
                  >
                    {entryType === "INCOME" ? t("income") : t("expense")}
                  </button>
                ))}
              </div>
            </div>

            {/* Date */}
            <div>
              <label
                className="mb-1 block text-xs font-medium text-[color:var(--text-primary)]"
                htmlFor="exp-date"
              >
                {t("dateLabel")}
              </label>
              <input
                className="w-full rounded-md border border-[color:var(--input-border)] bg-[color:var(--input-background)] px-3 py-2 text-base text-[color:var(--text-primary)] focus:border-[color:var(--focus-ring)] focus:outline-none sm:text-sm"
                id="exp-date"
                onChange={(e) => updateForm({ date: e.target.value })}
                required
                type="date"
                value={form.date}
              />
            </div>

            {/* Category */}
            <div>
              <label
                className="mb-1 block text-xs font-medium text-[color:var(--text-primary)]"
                htmlFor="exp-category"
              >
                {t("categoryLabel")}
              </label>
              {form.categoryId === "__new__" ? (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    className="min-w-0 flex-1 rounded-md border border-[color:var(--input-border)] bg-[color:var(--input-background)] px-3 py-2 text-base text-[color:var(--text-primary)] placeholder:text-[color:var(--input-placeholder)] focus:border-[color:var(--focus-ring)] focus:outline-none sm:text-sm"
                    id="exp-category"
                    onChange={(e) => updateForm({ newCategoryName: e.target.value })}
                    placeholder={t("newCategoryPlaceholder")}
                    required
                    type="text"
                    value={form.newCategoryName}
                  />
                  <button
                    aria-label={t("cancelNewCategory")}
                    className="shrink-0 rounded-md border border-[color:var(--input-border)] bg-[color:var(--input-background)] px-3 text-sm font-medium text-[color:var(--text-muted)] transition hover:bg-[color:var(--surface-secondary)]"
                    onClick={() => updateForm({ categoryId: "", newCategoryName: "" })}
                    type="button"
                  >
                    {t("cancel")}
                  </button>
                </div>
              ) : (
                <CustomSelect
                  buttonClassName="[--select-bg:var(--input-background)] [--select-panel:var(--surface-primary)]"
                  id="exp-category"
                  onChange={(value) => updateForm({ categoryId: value, newCategoryName: "" })}
                  options={expenseCategoryOptions}
                  value={form.categoryId}
                />
              )}
            </div>

            {/* Household member */}
            <div>
              <label
                className="mb-1 block text-xs font-medium text-[color:var(--text-primary)]"
                htmlFor="exp-member"
              >
                {t("householdMemberLabel")}
              </label>
              <CustomSelect
                buttonClassName="[--select-bg:var(--input-background)] [--select-panel:var(--surface-primary)]"
                id="exp-member"
                onChange={selectHouseholdMember}
                options={memberOptions}
                value={form.householdMemberId}
              />
            </div>

            {form.type === "EXPENSE" ? (
              <div className="sm:col-span-2 rounded-md border border-[color:var(--border-muted)] bg-[color:var(--surface-muted)]">
                <button
                  aria-expanded={form.splitEnabled}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
                  onClick={toggleSplitEnabled}
                  type="button"
                >
                  <span>
                    <span className="block text-sm font-medium text-[color:var(--text-primary)]">{t("splitThisExpense")}</span>
                    <span className="block text-xs text-[color:var(--text-muted)]">{t("splitThisExpenseHint")}</span>
                  </span>
                  <ChevronRight
                    aria-hidden
                    className={`h-4 w-4 shrink-0 text-[color:var(--text-subtle)] transition-transform ${form.splitEnabled ? "rotate-90" : ""}`}
                  />
                </button>
                {form.splitEnabled ? (
                  <div className="border-t border-[color:var(--border-muted)] p-3">
                    <p className="mb-2 text-xs font-medium text-[color:var(--text-primary)]">{t("splitWith")}</p>
                    {members.length === 0 ? (
                      <p className="text-sm text-[color:var(--text-subtle)]">{t("noSplitMembers")}</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {members.map((member) => {
                          const name = memberDisplayName(member);
                          const checked = form.splitHouseholdMemberIds.includes(member.id);

                          return (
                            <label
                              className={`inline-flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm transition ${
                                checked
                                  ? "border-[color:var(--accent-sage-border)] bg-[color:var(--accent-sage-surface)] text-[color:var(--accent-sage-text)]"
                                  : "border-[color:var(--input-border)] bg-[color:var(--input-background)] text-[color:var(--text-primary)] hover:border-[color:var(--border-strong)]"
                              }`}
                              key={member.id}
                            >
                              <input
                                checked={checked}
                                className="sr-only"
                                onChange={() => toggleSplitMember(member.id)}
                                type="checkbox"
                              />
                              <MemberAvatar
                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border font-serif text-[10px] font-semibold"
                                color={member.color}
                                email={member.email}
                                emoji={member.emoji}
                                fallbackLabel={name}
                                name={member.name}
                                title={name}
                              />
                              <span className="max-w-32 truncate">{name}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Notes */}
            <div className="sm:col-span-2">
              <label
                className="mb-1 block text-xs font-medium text-[color:var(--text-primary)]"
                htmlFor="exp-notes"
              >
                {t("notesLabel")}{" "}
                <span className="font-normal text-[color:var(--text-subtle)]">{t("optionalLabel")}</span>
              </label>
              <textarea
                className="w-full resize-none rounded-md border border-[color:var(--input-border)] bg-[color:var(--input-background)] px-3 py-2 text-base text-[color:var(--text-primary)] placeholder:text-[color:var(--input-placeholder)] focus:border-[color:var(--focus-ring)] focus:outline-none sm:text-sm"
                id="exp-notes"
                onChange={(e) => updateForm({ notes: e.target.value })}
                placeholder={t("notesPlaceholder")}
                rows={2}
                value={form.notes}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              className="h-11 rounded-md border border-[color:var(--button-primary-border)] bg-[color:var(--button-primary-bg)] px-4 py-2 text-sm font-medium text-[color:var(--button-primary-text)] transition hover:bg-[color:var(--button-primary-hover)] disabled:opacity-50 sm:h-auto"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? t("saving") : editingId ? t("saveChanges") : t("save")}
            </button>
            <button
              className="h-11 rounded-md border border-[color:var(--input-border)] px-4 py-2 text-sm text-[color:var(--text-primary)] transition hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-secondary)] sm:h-auto"
              onClick={resetForm}
              type="button"
            >
              {t("cancel")}
            </button>
          </div>
          </form>
        </div>
      )}

      {/* Expense list */}
      <div className={`transition-opacity ${isLoading ? "opacity-50" : ""}`}>
        {!hasExpenseRows ? (
          <div className="rounded-md border border-dashed border-[color:var(--input-border)] p-8 text-center text-sm text-[color:var(--text-subtle)]">
            {filterCategoryId
              ? t("noEntriesForCategory", { month: monthName })
              : t("nothingRecorded", { month: monthLabel })}
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border border-[color:var(--border-default)] bg-[color:var(--surface-primary)] shadow-[var(--shadow-soft)]">
            <div className="divide-y divide-[color:var(--border-default)] sm:hidden">
              {displayedExpenses.map((expense) => (
                <div className="grid gap-2 px-4 py-3" key={expense.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-[color:var(--text-strong)]">{expense.name}</p>
                      <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                        {formatExpenseDate(expense.date, locale)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-sm font-medium tabular-nums ${
                        expense.type === "INCOME" ? "text-[color:var(--accent-sage-text)]" : "text-[color:var(--accent-rose-text)]"
                      }`}
                    >
                      {expense.type === "INCOME" ? "+" : "−"}
                      {formatAmount(expense.amount, locale)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--text-muted)]">
                    {expense.categoryName ? (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs text-[color:var(--text-primary)]"
                        style={{
                          backgroundColor: `${expense.categoryColor ?? UNCATEGORIZED_COLOR}1f`,
                          borderColor: `${expense.categoryColor ?? UNCATEGORIZED_COLOR}66`,
                        }}
                      >
                        <span
                          aria-hidden
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: expense.categoryColor ?? UNCATEGORIZED_COLOR }}
                        />
                        {expense.categoryName}
                      </span>
                    ) : null}
                    {expense.householdMemberName ? (
                      <span className="inline-flex items-center gap-1.5">
                        <MemberAvatar
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border font-serif text-[10px] font-semibold"
                          color={expense.householdMemberColor}
                          emoji={expense.householdMemberEmoji}
                          fallbackLabel={expense.householdMemberName}
                          name={expense.householdMemberName}
                          title={expense.householdMemberName}
                        />
                        <span>{expense.householdMemberName}</span>
                      </span>
                    ) : null}
                    {expense.splits.length > 0 ? (
                      <span className="inline-flex max-w-full items-center gap-1.5">
                        <span>{t("splitWith")}</span>
                        <span className="truncate">
                          {expense.splits
                            .map((split) => split.householdMemberName)
                            .filter((name): name is string => Boolean(name))
                            .join(", ")}
                        </span>
                      </span>
                    ) : null}
                  </div>
                  {expense.notes ? (
                    <p className="text-xs leading-5 text-[color:var(--text-subtle)]">{expense.notes}</p>
                  ) : null}
                  <div className="flex items-center justify-end gap-1">
                    {confirmDeleteId === expense.id ? (
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        <span className="text-xs text-[color:var(--text-muted)]">{t("deleteConfirm")}</span>
                        <button
                          className="h-8 rounded border border-[color:var(--accent-rose-border)] bg-[color:var(--accent-rose-soft)] px-2 py-1 text-xs font-medium text-[color:var(--accent-rose-text)] transition hover:bg-[color:var(--accent-rose-surface)]"
                          disabled={deletingId === expense.id}
                          onClick={() => void handleDelete(expense.id)}
                          type="button"
                        >
                          {t("confirmDelete")}
                        </button>
                        <button
                          className="h-8 rounded border border-[color:var(--border-default)] bg-[color:var(--surface-secondary)] px-2 py-1 text-xs font-medium text-[color:var(--text-muted)] transition hover:bg-[color:var(--surface-muted)]"
                          disabled={deletingId === expense.id}
                          onClick={() => setConfirmDeleteId(null)}
                          type="button"
                        >
                          {t("cancelDelete")}
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          aria-label={t("editEntryAria", { name: expense.name })}
                          className="flex h-9 w-9 items-center justify-center rounded text-[color:var(--text-subtle)] transition hover:bg-[color:var(--accent-sage-surface)] hover:text-[color:var(--accent-sage-text)] disabled:opacity-40"
                          disabled={deletingId === expense.id || isSubmitting}
                          onClick={() => openEditForm(expense)}
                          type="button"
                        >
                          <Pencil aria-hidden className="h-3.5 w-3.5" />
                        </button>
                        <button
                          aria-label={t("deleteEntryAria", { name: expense.name })}
                          className="flex h-9 w-9 items-center justify-center rounded text-[color:var(--text-subtle)] transition hover:bg-[color:var(--accent-rose-soft)] hover:text-[color:var(--accent-rose-text)] disabled:opacity-40"
                          disabled={deletingId === expense.id}
                          onClick={() => setConfirmDeleteId(expense.id)}
                          type="button"
                        >
                          <Trash2 aria-hidden className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {showCarryoverRow ? (
                <div className="grid gap-1 bg-[color:var(--surface-muted)] px-4 py-3">
                  <p className="font-medium text-[color:var(--text-strong)]">{t("startingBalance")}</p>
                  <p className="text-xs text-[color:var(--text-muted)]">
                    {t("carriedInFrom", { month: previousMonthLabel })}
                  </p>
                  <span
                    className={`text-sm font-medium tabular-nums ${
                      stats.carryover >= 0 ? "text-[color:var(--accent-sage-text)]" : "text-[color:var(--accent-rose-text)]"
                    }`}
                  >
                    {stats.carryover >= 0 ? "+" : "−"}
                    {formatAmount(Math.abs(stats.carryover), locale)}
                  </span>
                </div>
              ) : null}
            </div>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[color:var(--border-default)] bg-[color:var(--surface-secondary)]">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-[color:var(--text-muted)]">
                      {t("dateLabel")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-[color:var(--text-muted)]">
                      {t("nameLabel")}
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-[color:var(--text-muted)] sm:table-cell">
                      {t("categoryLabel")}
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-[color:var(--text-muted)] md:table-cell">
                      {t("paidBy")}
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-[color:var(--text-muted)] lg:table-cell">
                      {t("splitWith")}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-normal text-[color:var(--text-muted)]">
                      {t("amountLabel")}
                    </th>
                    <th className="w-32 px-2 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--border-default)]">
                  {displayedExpenses.map((expense) => (
                    <tr key={expense.id} className="transition-colors hover:bg-[color:var(--surface-secondary)]">
                      <td className="whitespace-nowrap px-4 py-3 text-[color:var(--text-muted)]">
                        {formatExpenseDate(expense.date, locale)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-[color:var(--text-strong)]">{expense.name}</span>
                        {expense.notes && (
                          <span
                            className="ml-1.5 hidden text-xs text-[color:var(--text-subtle)] sm:inline"
                            title={expense.notes}
                          >
                            · {expense.notes.length > 40 ? expense.notes.slice(0, 40) + "…" : expense.notes}
                          </span>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        {expense.categoryName ? (
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs text-[color:var(--text-primary)]"
                            style={{
                              backgroundColor: `${expense.categoryColor ?? UNCATEGORIZED_COLOR}1f`,
                              borderColor: `${expense.categoryColor ?? UNCATEGORIZED_COLOR}66`,
                            }}
                          >
                            <span
                              aria-hidden
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: expense.categoryColor ?? UNCATEGORIZED_COLOR }}
                            />
                            {expense.categoryName}
                          </span>
                        ) : (
                          <span className="text-[color:var(--text-subtle)]">—</span>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        {expense.householdMemberName ? (
                          <MemberAvatar
                            className="flex h-7 w-7 cursor-default items-center justify-center rounded-md border font-serif text-xs font-semibold"
                            color={expense.householdMemberColor}
                            emoji={expense.householdMemberEmoji}
                            fallbackLabel={expense.householdMemberName}
                            name={expense.householdMemberName}
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setMemberTooltip({ name: expense.householdMemberName!, x: rect.left + rect.width / 2, y: rect.bottom });
                            }}
                            onMouseLeave={() => setMemberTooltip(null)}
                            title={expense.householdMemberName}
                          />
                        ) : (
                          <span className="text-[color:var(--text-subtle)]">—</span>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 lg:table-cell">
                        {expense.splits.length > 0 ? (
                          <div className="flex -space-x-1.5">
                            {expense.splits.map((split) =>
                              split.householdMemberName ? (
                                <MemberAvatar
                                  className="flex h-7 w-7 cursor-default items-center justify-center rounded-md border-2 border-[color:var(--surface-primary)] font-serif text-xs font-semibold"
                                  color={split.householdMemberColor}
                                  emoji={split.householdMemberEmoji}
                                  fallbackLabel={split.householdMemberName}
                                  key={split.id}
                                  name={split.householdMemberName}
                                  onMouseEnter={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setMemberTooltip({ name: split.householdMemberName!, x: rect.left + rect.width / 2, y: rect.bottom });
                                  }}
                                  onMouseLeave={() => setMemberTooltip(null)}
                                  title={split.householdMemberName}
                                />
                              ) : null,
                            )}
                          </div>
                        ) : (
                          <span className="text-[color:var(--text-subtle)]">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <span
                          className={`font-medium tabular-nums ${
                            expense.type === "INCOME" ? "text-[color:var(--accent-sage-text)]" : "text-[color:var(--accent-rose-text)]"
                          }`}
                        >
                          {expense.type === "INCOME" ? "+" : "−"}
                          {formatAmount(expense.amount, locale)}
                        </span>
                      </td>
                      <td className="w-32 px-2 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {confirmDeleteId === expense.id ? (
                            <div className="flex shrink-0 items-center justify-end gap-1">
                              <span className="text-xs text-[color:var(--text-muted)]">{t("deleteConfirm")}</span>
                              <button
                                className="h-7 rounded border border-[color:var(--accent-rose-border)] bg-[color:var(--accent-rose-soft)] px-1.5 text-xs font-medium text-[color:var(--accent-rose-text)] transition hover:bg-[color:var(--accent-rose-surface)]"
                                disabled={deletingId === expense.id}
                                onClick={() => void handleDelete(expense.id)}
                                type="button"
                              >
                                {t("confirmDelete")}
                              </button>
                              <button
                                className="h-7 rounded border border-[color:var(--border-default)] bg-[color:var(--surface-secondary)] px-1.5 text-xs font-medium text-[color:var(--text-muted)] transition hover:bg-[color:var(--surface-muted)]"
                                disabled={deletingId === expense.id}
                                onClick={() => setConfirmDeleteId(null)}
                                type="button"
                              >
                                {t("cancelDelete")}
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                aria-label={t("editEntryAria", { name: expense.name })}
                                className="flex h-7 w-7 items-center justify-center rounded text-[color:var(--text-subtle)] transition hover:bg-[color:var(--accent-sage-surface)] hover:text-[color:var(--accent-sage-text)] disabled:opacity-40"
                                disabled={deletingId === expense.id || isSubmitting}
                                onClick={() => openEditForm(expense)}
                                type="button"
                              >
                                <Pencil aria-hidden className="h-3.5 w-3.5" />
                              </button>
                              <button
                                aria-label={t("deleteEntryAria", { name: expense.name })}
                                className="flex h-7 w-7 items-center justify-center rounded text-[color:var(--text-subtle)] transition hover:bg-[color:var(--accent-rose-soft)] hover:text-[color:var(--accent-rose-text)] disabled:opacity-40"
                                disabled={deletingId === expense.id}
                                onClick={() => setConfirmDeleteId(expense.id)}
                                type="button"
                              >
                                <Trash2 aria-hidden className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {showCarryoverRow ? (
                    <tr className="bg-[color:var(--surface-muted)]">
                      <td className="whitespace-nowrap px-4 py-3 text-[color:var(--text-muted)]">
                        {formatExpenseDate(`${year}-${String(month).padStart(2, "0")}-01`, locale)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-[color:var(--text-strong)]">{t("startingBalance")}</span>
                        <span className="ml-1.5 hidden text-xs text-[color:var(--text-subtle)] sm:inline">
                          {t("carriedInFrom", { month: previousMonthLabel })}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        <span className="inline-flex items-center rounded-full border border-[color:var(--border-default)] bg-[color:var(--surface-secondary)] px-2.5 py-0.5 text-xs text-[color:var(--text-primary)]">
                          {t("carryover")}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 text-[color:var(--text-subtle)] md:table-cell">—</td>
                      <td className="hidden px-4 py-3 text-[color:var(--text-subtle)] lg:table-cell">—</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <span
                          className={`font-medium tabular-nums ${
                            stats.carryover >= 0 ? "text-[color:var(--accent-sage-text)]" : "text-[color:var(--accent-rose-text)]"
                          }`}
                        >
                          {stats.carryover >= 0 ? "+" : "−"}
                          {formatAmount(Math.abs(stats.carryover), locale)}
                        </span>
                      </td>
                      <td className="w-32 px-2 py-3 text-right">
                        <span className="text-xs text-[color:var(--text-subtle)]">{t("automatic")}</span>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      {memberTooltip ? (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 whitespace-nowrap rounded border border-[color:var(--border-default)] bg-[color:var(--surface-primary)] px-2 py-1 text-xs text-[color:var(--text-primary)] shadow-[var(--shadow-soft)]"
          style={{ left: memberTooltip.x, top: memberTooltip.y + 6 }}
        >
          {memberTooltip.name}
        </div>
      ) : null}
    </div>
  );
}
