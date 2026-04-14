"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Pencil, Plus, Settings, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { EXPENSE_CATEGORY_COLOR_GROUPS } from "@/lib/expense-colors";

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
};

type CategoryView = { id: string; color: string; name: string };
type MemberView = { id: string; name: string | null; email: string | null };
type MonthStats = { carryover: number; income: number; expenses: number; net: number };
type NetPointEntry = { amount: number; id: string; name: string; type: "INCOME" | "EXPENSE" };
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

type Props = {
  initialExpenses: ExpenseView[];
  initialStats: MonthStats;
  initialCategories: CategoryView[];
  members: MemberView[];
  initialYear: number;
  initialMonth: number;
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const UNCATEGORIZED_COLOR = "#c8c4bb";
const DONUT_CIRCUMFERENCE = 2 * Math.PI * 42;
const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

function formatAmount(n: number): string {
  return n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

function buildCategorySlices(expenses: ExpenseView[]): CategorySlice[] {
  const totals = new Map<string, { amount: number; color: string; label: string }>();

  for (const expense of expenses) {
    if (expense.type !== "EXPENSE") continue;
    const key = expense.categoryId ?? "__unsorted__";
    const previous = totals.get(key);
    totals.set(key, {
      amount: (previous?.amount ?? 0) + expense.amount,
      color: expense.categoryColor ?? UNCATEGORIZED_COLOR,
      label: expense.categoryName ?? "Unsorted",
    });
  }

  const entries = Array.from(totals.entries()).sort((a, b) => b[1].amount - a[1].amount);
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
      className={`relative [--select-bg:#fffdf8] [--select-border:#dfddd6] [--select-hover-border:#c8c4bb] [--select-panel:#fffdf8] [--select-text:#4d5451] ${className}`}
      ref={rootRef}
    >
      <button
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`flex w-full items-center justify-between gap-2 rounded-md border border-[var(--select-border)] bg-[var(--select-bg)] px-3 py-2 text-left text-sm text-[var(--select-text)] transition hover:border-[var(--select-hover-border)] focus:border-[#c85b45] focus:outline-none ${buttonClassName}`}
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
          <span className={selectedOption ? "truncate" : "truncate text-[#9da39f]"}>
            {selectedOption?.label ?? placeholder}
          </span>
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
                className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition ${
                  isSelected ? "bg-[#e8efe9] text-[#2d4f34]" : "text-[#4d5451] hover:bg-[#f4f1ea]"
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
        setFormError("Enter a valid positive amount.");
        return;
      }

      let categoryId: string | null = form.categoryId === "__new__" ? null : (form.categoryId || null);

      if (form.categoryId === "__new__") {
        const trimmed = form.newCategoryName.trim();
        if (!trimmed) {
          setFormError("Enter a name for the new category.");
          return;
        }
        const catRes = await fetch("/api/expenses/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed }),
        });
        if (!catRes.ok) {
          setFormError("Failed to create category.");
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
          memberName: members.length === 0 ? form.memberName.trim() || null : null,
        }),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as Record<string, string>;
        setFormError(err.error ?? "Failed to add expense.");
        return;
      }

      const data = (await res.json()) as { expense: ExpenseView };
      applyExpenseChange(data.expense);
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
      setCategoryError("Choose a category to edit.");
      return;
    }
    if (!name) {
      setCategoryError("Enter a category name.");
      return;
    }
    if (!HEX_COLOR_PATTERN.test(categoryForm.color)) {
      setCategoryError("Choose a valid category color.");
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
        setCategoryError("Failed to update category.");
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
  const categorySlices = buildCategorySlices(allExpenses);
  const netSign = stats.net >= 0 ? "+" : "";
  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;
  const previousMonthLabel = month === 1 ? `${MONTH_NAMES[11]} ${year - 1}` : `${MONTH_NAMES[month - 2]} ${year}`;
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
    { label: "No category", value: "" },
    ...categoryOptions,
    { label: "+ New category...", value: "__new__" },
  ];
  const filterCategoryOptions = [{ label: "All categories", value: "" }, ...categoryOptions];
  const memberOptions = [
    { label: "Unspecified", value: "" },
    ...members.map((member) => ({ label: member.name ?? member.email ?? member.id, value: member.id })),
  ];
  const selectedColorGroup =
    EXPENSE_CATEGORY_COLOR_GROUPS.find((group) => group.name === selectedColorGroupName) ??
    findCategoryColorGroup(categoryForm.color);

  return (
    <div className="mx-auto w-full max-w-[940px] px-4 py-6 sm:px-6">
      {/* Month picker */}
      <div className="mb-6 flex items-center gap-3">
        <button
          aria-label="Previous month"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-[#dfddd6] bg-[#fffdf8] text-[#4d5451] transition hover:border-[#c8c4bb] hover:bg-[#f4f1ea]"
          onClick={prevMonth}
          type="button"
        >
          <ChevronLeft aria-hidden className="h-4 w-4" />
        </button>
        <h1 className="font-serif text-2xl font-semibold text-[#171a18] sm:text-3xl">
          {MONTH_NAMES[month - 1]} {year}
        </h1>
        <label className="sr-only" htmlFor="expense-month">
          Month
        </label>
        <div className="relative h-8 w-8">
          <input
            aria-label="Choose month"
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
            className="pointer-events-none flex h-8 w-8 items-center justify-center rounded-md border border-[#dfddd6] bg-[#fffdf8] text-[#4d5451]"
          >
            <CalendarDays className="h-4 w-4" />
          </span>
        </div>
        <button
          aria-label="Next month"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-[#dfddd6] bg-[#fffdf8] text-[#4d5451] transition hover:border-[#c8c4bb] hover:bg-[#f4f1ea]"
          onClick={nextMonth}
          type="button"
        >
          <ChevronRight aria-hidden className="h-4 w-4" />
        </button>
        {!isCurrentMonth ? (
          <button
            className="rounded-md border border-[#dfddd6] bg-[#fffdf8] px-2.5 py-1.5 text-sm font-medium text-[#4d5451] transition hover:border-[#c8c4bb] hover:bg-[#f4f1ea]"
            onClick={jumpToCurrentMonth}
            type="button"
          >
            Today
          </button>
        ) : null}
        <button
          className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md border border-[#dfddd6] bg-[#fffdf8] px-2.5 text-sm font-medium text-[#4d5451] transition hover:border-[#c8c4bb] hover:bg-[#f4f1ea] disabled:opacity-50"
          disabled={categories.length === 0}
          onClick={openCategoryDialog}
          type="button"
        >
          <Settings aria-hidden className="h-4 w-4" />
          <span className="hidden sm:inline">Categories</span>
        </button>
      </div>

      {showCategoryDialog ? (
        <div
          aria-labelledby="expense-category-dialog-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#202321]/45 p-3 pb-[calc(0.75rem_+_env(safe-area-inset-bottom))] sm:items-center sm:p-4"
          role="dialog"
        >
          <form
            className="max-h-[calc(100dvh_-_1.5rem_-_env(safe-area-inset-bottom))] w-full max-w-md overflow-y-auto rounded-md border border-[#dedbd2] bg-[#fffdf8] p-4 shadow-[0_22px_55px_rgba(31,35,30,0.22)] sm:max-h-[calc(100dvh-2rem)] sm:p-5"
            onSubmit={(event) => void handleCategorySave(event)}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#a6543c]">
                  Expenses
                </p>
                <h2
                  className="mt-1 font-serif text-2xl font-semibold tracking-normal text-[#171a18]"
                  id="expense-category-dialog-title"
                >
                  Edit category
                </h2>
              </div>
              <button
                aria-label="Close category dialog"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#d8d2c8] bg-white text-xl font-semibold leading-none text-[#5d635f] transition hover:bg-[#f7f4ec]"
                disabled={isSavingCategory}
                onClick={closeCategoryDialog}
                type="button"
              >
                <span aria-hidden>&times;</span>
              </button>
            </div>

            {categoryError ? (
              <p className="mb-4 rounded-md bg-[#f3e4e2] px-3 py-2 text-sm text-[#8d3028]">
                {categoryError}
              </p>
            ) : null}

            <div className="grid gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#545b57]" htmlFor="category-edit-select">
                  Category
                </label>
                <CustomSelect
                  buttonClassName="[--select-bg:#ffffff] [--select-panel:#ffffff]"
                  id="category-edit-select"
                  onChange={selectCategoryForEdit}
                  options={categoryOptions}
                  value={categoryForm.id}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[#545b57]" htmlFor="category-edit-name">
                  Name
                </label>
                <input
                  className="w-full rounded-md border border-[#dfddd6] bg-white px-3 py-2 text-sm text-[#171a18] placeholder:text-[#9da39f] focus:border-[#c85b45] focus:outline-none"
                  id="category-edit-name"
                  maxLength={60}
                  onChange={(event) => setCategoryForm((prev) => ({ ...prev, name: event.target.value }))}
                  required
                  type="text"
                  value={categoryForm.name}
                />
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-[#545b57]">
                  Color
                </p>
                <div className="grid gap-3 rounded-md border border-[#dfddd6] bg-white p-3">
                  <div>
                    <p className="mb-2 text-xs text-[#686e6a]">
                      Family
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                    {EXPENSE_CATEGORY_COLOR_GROUPS.map((group) => (
                      <button
                        aria-label={`Show ${group.name} shades`}
                        className={`h-8 w-8 rounded-md border transition ${
                          selectedColorGroup.name === group.name
                            ? "border-[#171a18] ring-2 ring-[#171a18]/15"
                            : "border-[#d8d2c8] hover:border-[#a9a398]"
                        }`}
                        key={group.name}
                        onClick={() => {
                          setSelectedColorGroupName(group.name);
                          setCategoryForm((prev) => ({ ...prev, color: group.base }));
                        }}
                        style={{ backgroundColor: group.base }}
                        title={group.name}
                        type="button"
                      />
                    ))}
                    </div>
                  </div>
                  <div className="border-t border-[#ece8df] pt-3">
                    <p className="mb-2 text-xs text-[#686e6a]">
                      {selectedColorGroup.name} shades
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {selectedColorGroup.shades.map((color) => (
                        <button
                          aria-label={`Use ${selectedColorGroup.name} shade ${color}`}
                          className={`h-8 w-8 rounded-md border transition ${
                            categoryForm.color.toLowerCase() === color.toLowerCase()
                              ? "border-[#171a18] ring-2 ring-[#171a18]/15"
                              : "border-[#d8d2c8] hover:border-[#a9a398]"
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
                    className="flex items-center gap-2 border-t border-[#ece8df] pt-3 text-xs text-[#686e6a]"
                    htmlFor="category-edit-color"
                  >
                    <span>Custom</span>
                    <input
                      className="h-8 w-12 rounded-md border border-[#dfddd6] bg-white p-1 focus:border-[#c85b45] focus:outline-none"
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
                className="rounded-md border border-[#dfddd6] px-4 py-2 text-sm text-[#4d5451] transition hover:border-[#c8c4bb] hover:bg-[#f4f1ea]"
                disabled={isSavingCategory}
                onClick={closeCategoryDialog}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-[#c85b45] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#b94e3f] disabled:opacity-50"
                disabled={isSavingCategory || !categoryForm.id}
                type="submit"
              >
                {isSavingCategory ? "Saving…" : "Save category"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Stats panel */}
      <div
        className={`mb-6 grid grid-cols-3 gap-2 sm:gap-3 transition-opacity ${isLoading ? "opacity-50" : ""}`}
      >
        <div className="rounded-md border border-[#e0dcd4] bg-[#fffdf8] p-3 sm:p-4 shadow-[0_4px_12px_rgba(31,35,30,0.06)]">
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-normal text-[#6e9274]">Income</p>
          <p className="mt-1 font-serif text-lg sm:text-2xl font-semibold text-[#2d4f34] truncate">
            {formatAmount(stats.income)}
          </p>
        </div>
        <div className="rounded-md border border-[#e0dcd4] bg-[#fffdf8] p-3 sm:p-4 shadow-[0_4px_12px_rgba(31,35,30,0.06)]">
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-normal text-[#b94e3f]">
            Expenses
          </p>
          <p className="mt-1 font-serif text-lg sm:text-2xl font-semibold text-[#8d3028] truncate">
            {formatAmount(stats.expenses)}
          </p>
        </div>
        <div className="rounded-md border border-[#e0dcd4] bg-[#fffdf8] p-3 sm:p-4 shadow-[0_4px_12px_rgba(31,35,30,0.06)]">
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-normal text-[#545b57]">
            Net
          </p>
          <p
            className={`mt-1 font-serif text-lg sm:text-2xl font-semibold truncate ${stats.net >= 0 ? "text-[#2d4f34]" : "text-[#8d3028]"}`}
          >
            {netSign}
            {formatAmount(stats.net)}
          </p>
          <p className="mt-1 text-[10px] sm:text-xs text-[#686e6a] truncate">
            {stats.carryover >= 0 ? "+" : ""}
            {formatAmount(stats.carryover)} carried in
          </p>
        </div>
      </div>

      <section
        aria-label={`Statistics for ${monthLabel}`}
        className={`mb-6 grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.85fr)] transition-opacity ${isLoading ? "opacity-50" : ""}`}
      >
        <div className="hidden sm:flex flex-col rounded-md border border-[#e0dcd4] bg-[#fffdf8] p-4 shadow-[0_4px_12px_rgba(31,35,30,0.06)]">
          <div className="mb-4">
            <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#a6543c]">
              Net balance
            </p>
          </div>
          <div className="relative grow">
            <svg
              aria-label={`Daily net balance line for ${monthLabel}`}
              className="h-full min-h-48 w-full overflow-visible"
              onPointerLeave={() => setHoveredNetPoint(null)}
              onPointerMove={handleNetChartPointerMove}
              preserveAspectRatio="none"
              role="img"
              viewBox="0 0 360 170"
            >
              <line stroke="#ece8df" strokeWidth="1" x1="20" x2="340" y1="10" y2="10" />
              <line stroke="#ece8df" strokeWidth="1" x1="20" x2="340" y1="75" y2="75" />
              <line stroke="#ece8df" strokeWidth="1" x1="20" x2="340" y1="140" y2="140" />
              <line
                stroke="#c8c4bb"
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
                stroke={stats.net >= 0 ? "#6e9274" : "#c85b45"}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
                vectorEffect="non-scaling-stroke"
              />
              {hoveredNetPoint ? (
                <>
                  <line
                    stroke="#c8c4bb"
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
                    fill="#fffdf8"
                    r="4"
                    stroke={stats.net >= 0 ? "#6e9274" : "#c85b45"}
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
                    fill="#fffdf8"
                    key={point.day}
                    r="3"
                    stroke={stats.net >= 0 ? "#6e9274" : "#c85b45"}
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
            </svg>
            {hoveredNetPoint ? (
              <div
                className="pointer-events-none absolute z-20 w-48 rounded-md border border-[#d8d2c8] bg-[#fffdf8] p-2 text-xs text-[#4d5451] shadow-[0_14px_30px_rgba(31,35,30,0.18)]"
                style={{
                  left: `${(hoveredNetPoint.x / 360) * 100}%`,
                  top: `${Math.min(84, Math.max(16, (hoveredNetPoint.y / 170) * 100))}%`,
                  transform: hoveredNetPoint.x > 240
                    ? "translate(calc(-100% - 0.75rem), -50%)"
                    : "translate(0.75rem, -50%)",
                }}
              >
                <p className="font-medium text-[#171a18]">
                  {MONTH_NAMES[month - 1].slice(0, 3)} {hoveredNetPoint.day}:{" "}
                  {hoveredNetPoint.value >= 0 ? "+" : ""}
                  {formatAmount(hoveredNetPoint.value)}
                </p>
                {hoveredNetPoint.entries.length > 0 ? (
                  <div className="mt-1 grid gap-0.5">
                    {hoveredNetPoint.entries.slice(0, 3).map((entry) => (
                      <p className="truncate" key={entry.id}>
                        <span className={entry.type === "INCOME" ? "text-[#2d4f34]" : "text-[#8d3028]"}>
                          {entry.type === "INCOME" ? "+" : "-"}
                          {formatAmount(entry.amount)}
                        </span>{" "}
                        {entry.name}
                      </p>
                    ))}
                    {hoveredNetPoint.entries.length > 3 ? (
                      <p className="text-[#686e6a]">+{hoveredNetPoint.entries.length - 3} more</p>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-1 text-[#686e6a]">No change recorded.</p>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col rounded-md border border-[#e0dcd4] bg-[#fffdf8] p-4 shadow-[0_4px_12px_rgba(31,35,30,0.06)]">
          <div className="mb-4">
            <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#a6543c]">
              Expense mix
            </p>
          </div>
          {categorySlices.length === 0 ? (
            <div className="flex grow min-h-48 items-center justify-center rounded-md border border-dashed border-[#dfddd6] px-4 text-center text-sm text-[#9da39f]">
              No expenses to break down for {monthLabel}.
            </div>
          ) : (
            <div className="flex grow items-center justify-center p-3">
              <div className="relative w-full max-w-[180px] sm:max-w-[320px] aspect-square" ref={donutRef}>
                <svg
                  aria-label={`Expense category ratios for ${monthLabel}`}
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
                  <circle cx="60" cy="60" fill="none" r="42" stroke="#ece8df" strokeWidth="18" />
                  {categorySlices.map((slice) => (
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
                    fill="#171a18"
                    fontFamily="serif"
                    fontSize="15"
                    fontWeight="600"
                    textAnchor="middle"
                    x="60"
                    y="58"
                  >
                    {formatAmount(stats.expenses)}
                  </text>
                  <text fill="#686e6a" fontSize="9" textAnchor="middle" x="60" y="72">
                    total
                  </text>
                </svg>
                {(() => {
                  const activeSlice = activeCategoryKey ? categorySlices.find((s) => s.key === activeCategoryKey) : null;
                  if (!activeSlice) return null;
                  return (
                    <div className="absolute top-full left-1/2 mt-2 -translate-x-1/2 z-20 w-44 rounded-md border border-[#d8d2c8] bg-[#fffdf8] px-3 py-2 shadow-[0_8px_24px_rgba(31,35,30,0.15)]">
                      <div className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className="h-2.5 w-2.5 shrink-0 rounded-sm"
                          style={{ backgroundColor: activeSlice.color }}
                        />
                        <span className="min-w-0 truncate text-sm font-medium text-[#4d5451]">
                          {activeSlice.label}
                        </span>
                      </div>
                      <p className="mt-1 tabular-nums text-xs text-[#686e6a]">
                        {activeSlice.percent.toFixed(0)}% · {formatAmount(activeSlice.amount)}
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Filter bar + add button */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <CustomSelect
          buttonClassName="py-1.5"
          className="min-w-44"
          id="expense-filter-category"
          onChange={setFilterCategoryId}
          options={filterCategoryOptions}
          value={filterCategoryId}
        />

        <button
          className="ml-auto flex items-center gap-1.5 rounded-md bg-[#c85b45] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[#b94e3f]"
          onClick={openCreateForm}
          type="button"
        >
          {showForm ? (
            <X aria-hidden className="h-4 w-4" />
          ) : (
            <Plus aria-hidden className="h-4 w-4" />
          )}
          {showForm && editingId ? "Cancel edit" : showForm ? "Cancel" : "Add expense"}
        </button>
      </div>

      {showForm && (
        <form
          className="mb-6 rounded-md border border-[#e0dcd4] bg-[#fffdf8] p-5 shadow-[0_4px_12px_rgba(31,35,30,0.06)]"
          onSubmit={(e) => void handleSubmit(e)}
        >
          <h2 className="mb-4 font-serif text-lg font-semibold text-[#171a18]">
            {editingId ? "Edit entry" : "New entry"}
          </h2>

          {formError && (
            <p className="mb-4 rounded-md bg-[#f3e4e2] px-3 py-2 text-sm text-[#8d3028]">
              {formError}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Name */}
            <div className="sm:col-span-2">
              <label
                className="mb-1 block text-xs font-medium text-[#545b57]"
                htmlFor="exp-name"
              >
                Name
              </label>
              <input
                autoFocus
                className="w-full rounded-md border border-[#dfddd6] bg-white px-3 py-2 text-sm text-[#171a18] placeholder:text-[#9da39f] focus:border-[#c85b45] focus:outline-none"
                id="exp-name"
                onChange={(e) => updateForm({ name: e.target.value })}
                placeholder="e.g. Grocery run"
                required
                type="text"
                value={form.name}
              />
            </div>

            {/* Amount */}
            <div>
              <label
                className="mb-1 block text-xs font-medium text-[#545b57]"
                htmlFor="exp-amount"
              >
                Amount
              </label>
              <input
                className="w-full rounded-md border border-[#dfddd6] bg-white px-3 py-2 text-sm text-[#171a18] placeholder:text-[#9da39f] focus:border-[#c85b45] focus:outline-none"
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
              <p className="mb-1 text-xs font-medium text-[#545b57]">Type</p>
              <div className="flex gap-2">
                {(["EXPENSE", "INCOME"] as const).map((t) => (
                  <button
                    className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition ${
                      form.type === t
                        ? t === "INCOME"
                          ? "border-[#6e9274] bg-[#e8efe9] text-[#2d4f34]"
                          : "border-[#c85b45] bg-[#f7ecea] text-[#8d3028]"
                        : "border-[#dfddd6] bg-white text-[#4d5451] hover:border-[#c8c4bb]"
                    }`}
                    key={t}
                    onClick={() => updateForm({ type: t })}
                    type="button"
                  >
                    {t === "INCOME" ? "Income" : "Expense"}
                  </button>
                ))}
              </div>
            </div>

            {/* Date */}
            <div>
              <label
                className="mb-1 block text-xs font-medium text-[#545b57]"
                htmlFor="exp-date"
              >
                Date
              </label>
              <input
                className="w-full rounded-md border border-[#dfddd6] bg-white px-3 py-2 text-sm text-[#171a18] focus:border-[#c85b45] focus:outline-none"
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
                className="mb-1 block text-xs font-medium text-[#545b57]"
                htmlFor="exp-category"
              >
                Category
              </label>
              <CustomSelect
                buttonClassName="[--select-bg:#ffffff] [--select-panel:#ffffff]"
                id="exp-category"
                onChange={(value) => updateForm({ categoryId: value, newCategoryName: "" })}
                options={expenseCategoryOptions}
                value={form.categoryId}
              />
            </div>

            {/* New category name input */}
            {form.categoryId === "__new__" && (
              <div>
                <label
                  className="mb-1 block text-xs font-medium text-[#545b57]"
                  htmlFor="exp-new-cat"
                >
                  New category name
                </label>
                <input
                  className="w-full rounded-md border border-[#dfddd6] bg-white px-3 py-2 text-sm text-[#171a18] placeholder:text-[#9da39f] focus:border-[#c85b45] focus:outline-none"
                  id="exp-new-cat"
                  onChange={(e) => updateForm({ newCategoryName: e.target.value })}
                  placeholder="e.g. Groceries"
                  required
                  type="text"
                  value={form.newCategoryName}
                />
              </div>
            )}

            {/* Household member */}
            {members.length > 0 ? (
              <div>
                <label
                  className="mb-1 block text-xs font-medium text-[#545b57]"
                  htmlFor="exp-member"
                >
                  Household member
                </label>
                <CustomSelect
                  buttonClassName="[--select-bg:#ffffff] [--select-panel:#ffffff]"
                  id="exp-member"
                  onChange={(value) => updateForm({ householdMemberId: value })}
                  options={memberOptions}
                  value={form.householdMemberId}
                />
              </div>
            ) : (
              <div>
                <label
                  className="mb-1 block text-xs font-medium text-[#545b57]"
                  htmlFor="exp-member-name"
                >
                  Member <span className="font-normal text-[#9da39f]">(optional)</span>
                </label>
                <input
                  className="w-full rounded-md border border-[#dfddd6] bg-white px-3 py-2 text-sm text-[#171a18] placeholder:text-[#9da39f] focus:border-[#c85b45] focus:outline-none"
                  id="exp-member-name"
                  maxLength={120}
                  onChange={(e) => updateForm({ memberName: e.target.value })}
                  placeholder="e.g. David"
                  type="text"
                  value={form.memberName}
                />
              </div>
            )}

            {/* Notes */}
            <div className="sm:col-span-2">
              <label
                className="mb-1 block text-xs font-medium text-[#545b57]"
                htmlFor="exp-notes"
              >
                Notes{" "}
                <span className="font-normal text-[#9da39f]">(optional)</span>
              </label>
              <textarea
                className="w-full resize-none rounded-md border border-[#dfddd6] bg-white px-3 py-2 text-sm text-[#171a18] placeholder:text-[#9da39f] focus:border-[#c85b45] focus:outline-none"
                id="exp-notes"
                onChange={(e) => updateForm({ notes: e.target.value })}
                placeholder="Any details…"
                rows={2}
                value={form.notes}
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              className="rounded-md bg-[#c85b45] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#b94e3f] disabled:opacity-50"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Saving…" : editingId ? "Save changes" : "Save"}
            </button>
            <button
              className="rounded-md border border-[#dfddd6] px-4 py-2 text-sm text-[#4d5451] transition hover:border-[#c8c4bb] hover:bg-[#f4f1ea]"
              onClick={resetForm}
              type="button"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Expense list */}
      <div className={`transition-opacity ${isLoading ? "opacity-50" : ""}`}>
        {!hasExpenseRows ? (
          <div className="rounded-md border border-dashed border-[#dfddd6] p-8 text-center text-sm text-[#9da39f]">
            {filterCategoryId
              ? "No entries for this category in " + MONTH_NAMES[month - 1] + "."
              : "Nothing recorded for " + MONTH_NAMES[month - 1] + " " + year + "."}
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border border-[#e0dcd4] bg-[#fffdf8] shadow-[0_4px_12px_rgba(31,35,30,0.06)]">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e0dcd4] bg-[#f7f5f0]">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-[#545b57]">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-[#545b57]">
                      Name
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-[#545b57] sm:table-cell">
                      Category
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-[#545b57] md:table-cell">
                      Member
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-normal text-[#545b57]">
                      Amount
                    </th>
                    <th className="w-32 px-2 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0dcd4]">
                  {displayedExpenses.map((expense) => (
                    <tr key={expense.id} className="transition-colors hover:bg-[#f7f5f0]">
                      <td className="whitespace-nowrap px-4 py-3 text-[#686e6a]">
                        {expense.date.slice(8, 10)}.{expense.date.slice(5, 7)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-[#171a18]">{expense.name}</span>
                        {expense.notes && (
                          <span
                            className="ml-1.5 hidden text-xs text-[#9da39f] sm:inline"
                            title={expense.notes}
                          >
                            · {expense.notes.length > 40 ? expense.notes.slice(0, 40) + "…" : expense.notes}
                          </span>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        {expense.categoryName ? (
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs text-[#545b57]"
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
                          <span className="text-[#c8c4bb]">—</span>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 text-[#686e6a] md:table-cell">
                        {expense.householdMemberName ?? (
                          <span className="text-[#c8c4bb]">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <span
                          className={`font-medium tabular-nums ${
                            expense.type === "INCOME" ? "text-[#2d4f34]" : "text-[#8d3028]"
                          }`}
                        >
                          {expense.type === "INCOME" ? "+" : "−"}
                          {formatAmount(expense.amount)}
                        </span>
                      </td>
                      <td className="w-32 px-2 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {confirmDeleteId === expense.id ? (
                            <div className="flex shrink-0 items-center justify-end gap-1">
                              <span className="text-xs text-[#5d635f]">Delete?</span>
                              <button
                                className="h-7 rounded bg-[#f7ecea] px-1.5 text-xs font-medium text-[#a6543c] transition hover:bg-[#f0d4cf]"
                                disabled={deletingId === expense.id}
                                onClick={() => void handleDelete(expense.id)}
                                type="button"
                              >
                                Yes
                              </button>
                              <button
                                className="h-7 rounded bg-[#ebe8de] px-1.5 text-xs font-medium text-[#5d635f] transition hover:bg-[#dedad0]"
                                disabled={deletingId === expense.id}
                                onClick={() => setConfirmDeleteId(null)}
                                type="button"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                aria-label={`Edit ${expense.name}`}
                                className="flex h-7 w-7 items-center justify-center rounded text-[#9da39f] transition hover:bg-[#e8efe9] hover:text-[#526c56] disabled:opacity-40"
                                disabled={deletingId === expense.id || isSubmitting}
                                onClick={() => openEditForm(expense)}
                                type="button"
                              >
                                <Pencil aria-hidden className="h-3.5 w-3.5" />
                              </button>
                              <button
                                aria-label={`Delete ${expense.name}`}
                                className="flex h-7 w-7 items-center justify-center rounded text-[#9da39f] transition hover:bg-[#f3e4e2] hover:text-[#b94e3f] disabled:opacity-40"
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
                    <tr className="bg-[#fbfaf6]">
                      <td className="whitespace-nowrap px-4 py-3 text-[#686e6a]">
                        01.{String(month).padStart(2, "0")}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-[#171a18]">Starting balance</span>
                        <span className="ml-1.5 hidden text-xs text-[#9da39f] sm:inline">
                          · Carried in from {previousMonthLabel}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        <span className="inline-flex items-center rounded-full border border-[#d8d2c8] bg-[#f4f1ea] px-2.5 py-0.5 text-xs text-[#545b57]">
                          Carryover
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 text-[#c8c4bb] md:table-cell">—</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <span
                          className={`font-medium tabular-nums ${
                            stats.carryover >= 0 ? "text-[#2d4f34]" : "text-[#8d3028]"
                          }`}
                        >
                          {stats.carryover >= 0 ? "+" : "−"}
                          {formatAmount(Math.abs(stats.carryover))}
                        </span>
                      </td>
                      <td className="w-32 px-2 py-3 text-right">
                        <span className="text-xs text-[#9da39f]">Automatic</span>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
