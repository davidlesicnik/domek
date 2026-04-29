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
      <section className="rounded-md border border-[#e9e4da] bg-[#fffdf9] p-5 shadow-[0_20px_45px_rgba(31,35,30,0.07)] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h1 className="font-serif text-[1.95rem] font-semibold leading-[1.04] tracking-normal text-[#171a18] sm:text-5xl sm:leading-[1.02]">
              {summaryState.title}
            </h1>
            <p className="mt-3 max-w-xl text-base leading-7 text-[#686e6a]">{summaryState.summary}</p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-[#5f6662] sm:flex sm:flex-wrap sm:items-center sm:gap-x-4">
              <span className="inline-flex min-w-0 flex-col items-start gap-1 rounded-md border border-[#ece7de] bg-[#fbfaf6] px-2.5 py-2 sm:flex-row sm:items-baseline sm:gap-1.5 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
                <span className="font-serif text-xl font-semibold leading-none text-[#171a18] sm:text-[30px]">
                  {actionSummary.todosThisWeek}
                </span>
                <span className="text-xs font-medium leading-4 sm:text-[15px] sm:leading-5">
                  {t("tasksDue", { count: actionSummary.todosThisWeek })}
                </span>
              </span>
              <span aria-hidden className="hidden h-1 w-1 rounded-full bg-[#c9ceca] sm:block" />
              <span className="inline-flex min-w-0 flex-col items-start gap-1 rounded-md border border-[#ece7de] bg-[#fbfaf6] px-2.5 py-2 sm:flex-row sm:items-baseline sm:gap-1.5 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
                <span className="font-serif text-xl font-semibold leading-none text-[#171a18] sm:text-[30px]">
                  {actionSummary.calendarThisWeek}
                </span>
                <span className="text-xs font-medium leading-4 sm:text-[15px] sm:leading-5">
                  {t("events", { count: actionSummary.calendarThisWeek })}
                </span>
              </span>
              <span aria-hidden className="hidden h-1 w-1 rounded-full bg-[#c9ceca] sm:block" />
              <span className="inline-flex min-w-0 flex-col items-start gap-1 rounded-md border border-[#ece7de] bg-[#fbfaf6] px-2.5 py-2 sm:flex-row sm:items-baseline sm:gap-1.5 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
                <span className="font-serif text-xl font-semibold leading-none text-[#171a18] sm:text-[30px]">
                  {actionSummary.overdueChores}
                </span>
                <span className="text-xs font-medium leading-4 sm:text-[15px] sm:leading-5">
                  {t("overdueChores", { count: actionSummary.overdueChores })}
                </span>
              </span>
            </div>
          </div>
        </div>
      </section>

      <DashboardPlanner
        agendaDays={agendaDays}
        calendarEvents={data.calendarEvents}
        calendarMembers={data.calendarMembers}
        monthItemCountsByDate={monthItemCountsByDate}
        nonCalendarItemsByDate={data.nonCalendarItemsByDate}
        todayKey={todayKey}
      />

      {hasExpenseActivity ? (
        <section className="rounded-md border border-[#dedbd2] bg-[#fffdf8] p-5 shadow-[0_12px_28px_rgba(31,35,30,0.07)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#545b57]">
                {t("moneyThisMonth")}
              </p>
              <h2 className="mt-1 font-serif text-2xl font-semibold tracking-normal text-[#171a18]">
                {monthLabel}
              </h2>
              <p className="mt-2 max-w-lg text-sm leading-6 text-[#6c726e]">
                {t("moneySummary")}
              </p>
            </div>
            <Link
              className="inline-flex h-10 w-full items-center justify-center rounded-md border border-[#d8d2c8] bg-white px-3 text-sm font-medium text-[#5d635f] transition hover:bg-[#f4f1ea] sm:h-9 sm:w-auto sm:shrink-0"
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
            <div className="mt-5 overflow-hidden rounded-md border border-[#e3ded6] bg-[#fbfaf6]">
              <div className="grid divide-y divide-[#e3ded6]">
                {expenseSnapshot.entries.map((expense) => (
                  <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4" key={expense.id}>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-[#202321]">{expense.name}</p>
                        {expense.categoryName ? (
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium text-[#5d635f]"
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
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#717874]">
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
                    <p
                      className={`text-sm font-semibold tabular-nums sm:shrink-0 sm:text-right ${
                        expense.type === "INCOME" ? "text-[#2d4f34]" : "text-[#8d3028]"
                      }`}
                    >
                      {expense.type === "INCOME" ? "+" : "−"}
                      {formatSignedAmount(expense.amount, locale).replace(/^[+−]/, "")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : (
        <section className="rounded-md border border-[#e3ded6] bg-[#fbfaf6] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#545b57]">
                {t("moneyThisMonth")}
              </p>
              <h2 className="mt-1 font-serif text-xl font-semibold tracking-normal text-[#171a18]">
                {t("noExpensesTitle")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#6c726e]">
                {t("noExpensesSummary")}
              </p>
            </div>
            <Link
              className="inline-flex h-10 w-full items-center justify-center rounded-md border border-[#d8d2c8] bg-white px-3 text-sm font-medium text-[#5d635f] transition hover:bg-[#f4f1ea] sm:h-9 sm:w-auto sm:shrink-0"
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
