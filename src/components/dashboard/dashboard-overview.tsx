import { getLocale, getTranslations } from "next-intl/server";

import { DashboardPlanner } from "@/components/dashboard/dashboard-planner";
import { StatCard } from "@/components/dashboard/stat-card";
import { MemberAvatar } from "@/components/ui/member-avatar";
import { Link } from "@/i18n/navigation";
import type { DashboardData } from "@/lib/dashboard";

type DashboardOverviewProps = Readonly<{
  data: DashboardData;
}>;

type HeroState = Readonly<{
  eyebrow: string;
  title: string;
  summary: string;
}>;

function formatSignedAmount(amount: number, locale: string) {
  const sign = amount > 0 ? "+" : amount < 0 ? "−" : "";
  const absoluteAmount = Math.abs(amount);

  return `${sign}${absoluteAmount.toLocaleString(locale, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
}

function formatExpenseDate(date: string, locale: string) {
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return date;
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function countAgendaItems(data: DashboardData) {
  return data.agendaDays.reduce((sum, day) => sum + day.items.length, 0);
}

function formatMonthLabel(dateKey: string, locale: string) {
  const [year, month] = dateKey.split("-").map(Number);

  return new Intl.DateTimeFormat(locale, {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function heroState(data: DashboardData, t: Awaited<ReturnType<typeof getTranslations>>): HeroState {
  const upcomingCount = countAgendaItems(data);

  if (data.actionSummary.overdueChores > 0) {
    return {
      eyebrow: t("heroNeedsAttentionEyebrow"),
      summary:
        upcomingCount > 0
          ? t("heroOverdueWithUpcoming", { count: upcomingCount })
          : t("heroOverdueOnly"),
      title: t("heroOverdueChores", { count: data.actionSummary.overdueChores }),
    };
  }

  if (upcomingCount > 0) {
    return {
      eyebrow: t("heroThisWeekEyebrow"),
      summary: t("heroUpcomingSummary"),
      title: t("heroUpcoming", { count: upcomingCount }),
    };
  }

  return {
    eyebrow: t("heroAllClearEyebrow"),
    summary: t("heroAllClearSummary"),
    title: t("heroAllClearTitle"),
  };
}

export async function DashboardOverview({ data }: DashboardOverviewProps) {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("dashboardPage")]);
  const { actionSummary, agendaDays, expenseSnapshot, monthItemCountsByDate, todayKey } = data;
  const summaryState = heroState(data, t);
  const monthLabel = formatMonthLabel(todayKey, locale);
  const hasExpenseActivity =
    expenseSnapshot.entries.length > 0 ||
    expenseSnapshot.stats.income !== 0 ||
    expenseSnapshot.stats.expenses !== 0 ||
    expenseSnapshot.stats.net !== 0 ||
    expenseSnapshot.stats.carryover !== 0;

  return (
    <div className="grid gap-8">
      <section className="rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 shadow-[var(--shadow-float)] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h1 className="font-serif text-[1.95rem] font-semibold leading-[1.04] tracking-normal text-[var(--text-strong)] sm:text-5xl sm:leading-[1.02]">
              {summaryState.title}
            </h1>
            <p className="mt-3 max-w-xl text-base leading-7 text-[var(--text-muted)]">{summaryState.summary}</p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-[var(--text-muted)] sm:flex sm:flex-wrap sm:items-center sm:gap-x-4">
              <Link
                className="inline-flex min-w-0 flex-col items-start gap-1 rounded-md border border-[var(--border-muted)] bg-[var(--surface-muted)] px-2.5 py-2 transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-secondary)] sm:flex-row sm:items-baseline sm:gap-1.5 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:hover:bg-transparent"
                href="/app/todos"
              >
                <span className="font-serif text-xl font-semibold leading-none text-[var(--text-strong)] sm:text-[30px]">
                  {actionSummary.todosThisWeek}
                </span>
                <span className="text-xs font-medium leading-4 sm:text-[15px] sm:leading-5">
                  {t("tasksDue", { count: actionSummary.todosThisWeek })}
                </span>
              </Link>
              <span aria-hidden className="hidden h-1 w-1 rounded-full bg-[var(--border-strong)] sm:block" />
              <Link
                className="inline-flex min-w-0 flex-col items-start gap-1 rounded-md border border-[var(--border-muted)] bg-[var(--surface-muted)] px-2.5 py-2 transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-secondary)] sm:flex-row sm:items-baseline sm:gap-1.5 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:hover:bg-transparent"
                href="/app#dashboard-planner"
              >
                <span className="font-serif text-xl font-semibold leading-none text-[var(--text-strong)] sm:text-[30px]">
                  {actionSummary.calendarThisWeek}
                </span>
                <span className="text-xs font-medium leading-4 sm:text-[15px] sm:leading-5">
                  {t("events", { count: actionSummary.calendarThisWeek })}
                </span>
              </Link>
              <span aria-hidden className="hidden h-1 w-1 rounded-full bg-[var(--border-strong)] sm:block" />
              <Link
                className="inline-flex min-w-0 flex-col items-start gap-1 rounded-md border border-[var(--border-muted)] bg-[var(--surface-muted)] px-2.5 py-2 transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-secondary)] sm:flex-row sm:items-baseline sm:gap-1.5 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:hover:bg-transparent"
                href="/app/chores"
              >
                <span className="font-serif text-xl font-semibold leading-none text-[var(--text-strong)] sm:text-[30px]">
                  {actionSummary.overdueChores}
                </span>
                <span className="text-xs font-medium leading-4 sm:text-[15px] sm:leading-5">
                  {t("overdueChores", { count: actionSummary.overdueChores })}
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="dashboard-planner">
        <DashboardPlanner
          agendaDays={agendaDays}
          calendarEvents={data.calendarEvents}
          calendarGroups={data.calendarGroups}
          calendarMembers={data.calendarMembers}
          monthItemCountsByDate={monthItemCountsByDate}
          nonCalendarItemsByDate={data.nonCalendarItemsByDate}
          todayKey={todayKey}
        />
      </section>

      {hasExpenseActivity ? (
        <section className="rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 shadow-[var(--shadow-soft)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[var(--text-muted)]">
                {t("moneyThisMonth")}
              </p>
              <h2 className="mt-1 font-serif text-2xl font-semibold tracking-normal text-[var(--text-strong)]">
                {monthLabel}
              </h2>
              <p className="mt-2 max-w-lg text-sm leading-6 text-[var(--text-muted)]">
                {t("moneySummary")}
              </p>
            </div>
            <Link
              className="inline-flex h-10 w-full items-center justify-center rounded-md border border-[var(--border-strong)] bg-[var(--surface-primary)] px-3 text-sm font-medium text-[var(--text-muted)] transition hover:bg-[var(--surface-secondary)] sm:h-9 sm:w-auto sm:shrink-0"
              href="/app/expenses"
            >
              {t("openExpenses")}
            </Link>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <StatCard
              accent="sage"
              detail={t("incomeDetail")}
              label={t("incomeLabel")}
              value={formatSignedAmount(expenseSnapshot.stats.income, locale)}
            />
            <StatCard
              accent="rose"
              detail={t("spendingDetail")}
              label={t("spendingLabel")}
              value={formatSignedAmount(-expenseSnapshot.stats.expenses, locale)}
            />
            <StatCard
              accent="sun"
              detail={t("netDetail")}
              label={t("netLabel")}
              value={formatSignedAmount(expenseSnapshot.stats.net, locale)}
            />
          </div>

          {expenseSnapshot.entries.length > 0 ? (
            <div className="mt-5 overflow-hidden rounded-md border border-[var(--border-muted)] bg-[var(--surface-muted)]">
              <div className="grid divide-y divide-[var(--border-muted)]">
                {expenseSnapshot.entries.map((expense) => (
                  <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4" key={expense.id}>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{expense.name}</p>
                        {expense.categoryName ? (
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium text-[var(--text-muted)]"
                            style={{
                              backgroundColor: `${expense.categoryColor ?? "#c8c4bb"}1f`,
                              borderColor: `${expense.categoryColor ?? "#c8c4bb"}66`,
                            }}
                          >
                            <span
                              aria-hidden
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: expense.categoryColor ?? "#c8c4bb" }}
                            />
                            {expense.categoryName}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--text-subtle)]">
                        <span>{formatExpenseDate(expense.date, locale)}</span>
                        {expense.householdMemberName ? (
                          <>
                            <span aria-hidden>·</span>
                            <span className="inline-flex items-center gap-1.5">
                              <MemberAvatar
                                className="inline-flex h-5 w-5 items-center justify-center rounded-md border text-[9px] font-semibold"
                                color={expense.householdMemberColor}
                                emoji={expense.householdMemberEmoji}
                                fallbackLabel={expense.householdMemberName}
                                name={expense.householdMemberName}
                              />
                              {expense.householdMemberName}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <div className="inline-flex items-center gap-1.5 text-sm font-semibold tabular-nums text-[var(--text-strong)] sm:shrink-0 sm:justify-end">
                      <span
                        className={`inline-flex min-w-12 items-center justify-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-tight ${
                          expense.type === "INCOME"
                            ? "border-[var(--accent-sage-border)] bg-[var(--accent-sage-soft)] text-[var(--accent-sage-text)]"
                            : "border-[var(--accent-rose-border)] bg-[var(--accent-rose-soft)] text-[var(--accent-rose-text)]"
                        }`}
                      >
                        {expense.type === "INCOME" ? t("incomeLabel") : t("spendingLabel")}
                      </span>
                      <p>
                        {expense.type === "INCOME" ? "+" : "−"}
                        {formatSignedAmount(expense.amount, locale).replace(/^[+−]/, "")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : (
        <section className="rounded-md border border-[var(--border-muted)] bg-[var(--surface-muted)] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[var(--text-muted)]">
                {t("moneyThisMonth")}
              </p>
              <h2 className="mt-1 font-serif text-xl font-semibold tracking-normal text-[var(--text-strong)]">
                {t("noExpensesTitle")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                {t("noExpensesSummary")}
              </p>
            </div>
            <Link
              className="inline-flex h-10 w-full items-center justify-center rounded-md border border-[var(--border-strong)] bg-[var(--surface-primary)] px-3 text-sm font-medium text-[var(--text-muted)] transition hover:bg-[var(--surface-secondary)] sm:h-9 sm:w-auto sm:shrink-0"
              href="/app/expenses"
            >
              {t("addExpense")}
            </Link>
          </div>
        </section>
      )}

    </div>
  );
}
