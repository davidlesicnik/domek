import Link from "next/link";

import { DashboardPlanner } from "@/components/dashboard/dashboard-planner";
import { StatCard } from "@/components/dashboard/stat-card";
import { MemberAvatar } from "@/components/ui/member-avatar";
import type { DashboardData } from "@/lib/dashboard";

type DashboardOverviewProps = Readonly<{
  data: DashboardData;
}>;

type HeroState = Readonly<{
  eyebrow: string;
  title: string;
  summary: string;
}>;

function formatSignedAmount(amount: number) {
  const sign = amount > 0 ? "+" : amount < 0 ? "−" : "";
  const absoluteAmount = Math.abs(amount);

  return `${sign}${absoluteAmount.toLocaleString("en", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
}

function formatExpenseDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(date));
}

function countAgendaItems(data: DashboardData) {
  return data.agendaDays.reduce((sum, day) => sum + day.items.length, 0);
}

function heroState(data: DashboardData): HeroState {
  const upcomingCount = countAgendaItems(data);

  if (data.actionSummary.overdueChores > 0) {
    const title =
      data.actionSummary.overdueChores === 1
        ? "1 chore needs attention"
        : `${data.actionSummary.overdueChores} chores need attention`;
    const summary =
      upcomingCount > 0
        ? `${upcomingCount} more things are coming up this week. Start with what has slipped.`
        : "Start with what has slipped, then settle the rest of the board.";

    return {
      eyebrow: "Needs attention",
      summary,
      title,
    };
  }

  if (upcomingCount > 0) {
    const title =
      upcomingCount === 1 ? "1 thing is coming up next" : `${upcomingCount} things are coming up next`;

    return {
      eyebrow: "This week",
      summary: "Nothing is urgent, but the next few days are taking shape.",
      title,
    };
  }

  return {
    eyebrow: "All clear",
    summary: "Nothing is overdue and nothing is scheduled for the next 7 days.",
    title: "Everything is under control this week.",
  };
}

export function DashboardOverview({ data }: DashboardOverviewProps) {
  const { actionSummary, agendaDays, expenseSnapshot, monthItemCountsByDate, todayKey } = data;
  const summaryState = heroState(data);
  const hasExpenseActivity =
    expenseSnapshot.entries.length > 0 ||
    expenseSnapshot.stats.income !== 0 ||
    expenseSnapshot.stats.expenses !== 0 ||
    expenseSnapshot.stats.net !== 0 ||
    expenseSnapshot.stats.carryover !== 0;

  return (
    <div className="grid gap-8">
      <section className="rounded-md border border-[#e9e4da] bg-[#fffdf9] p-6 shadow-[0_20px_45px_rgba(31,35,30,0.07)] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h1 className="font-serif text-4xl font-semibold tracking-normal text-[#171a18] sm:text-5xl">
              {summaryState.title}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-[#686e6a]">{summaryState.summary}</p>
            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-[#5f6662] sm:gap-x-4">
              <span className="inline-flex items-baseline gap-1.5">
                <span className="font-serif text-2xl font-semibold leading-none text-[#171a18] sm:text-[30px]">
                  {actionSummary.todosThisWeek}
                </span>
                <span className="text-sm font-medium sm:text-[15px]">
                  {actionSummary.todosThisWeek === 1 ? "task due" : "tasks due"}
                </span>
              </span>
              <span aria-hidden className="h-1 w-1 rounded-full bg-[#c9ceca]" />
              <span className="inline-flex items-baseline gap-1.5">
                <span className="font-serif text-2xl font-semibold leading-none text-[#171a18] sm:text-[30px]">
                  {actionSummary.calendarThisWeek}
                </span>
                <span className="text-sm font-medium sm:text-[15px]">
                  {actionSummary.calendarThisWeek === 1 ? "event" : "events"}
                </span>
              </span>
              <span aria-hidden className="h-1 w-1 rounded-full bg-[#c9ceca]" />
              <span className="inline-flex items-baseline gap-1.5">
                <span className="font-serif text-2xl font-semibold leading-none text-[#171a18] sm:text-[30px]">
                  {actionSummary.overdueChores}
                </span>
                <span className="text-sm font-medium sm:text-[15px]">
                  {actionSummary.overdueChores === 1 ? "overdue chore" : "overdue chores"}
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
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#545b57]">
                Money this month
              </p>
              <h2 className="mt-1 font-serif text-2xl font-semibold tracking-normal text-[#171a18]">
                {expenseSnapshot.monthLabel}
              </h2>
              <p className="mt-2 max-w-lg text-sm leading-6 text-[#6c726e]">
                A lighter read on income, spending, and the latest entries on the board.
              </p>
            </div>
            <Link
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-[#d8d2c8] bg-white px-3 text-sm font-medium text-[#5d635f] transition hover:bg-[#f4f1ea]"
              href="/app/expenses"
            >
              Open expenses
            </Link>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <StatCard
              accent="sage"
              detail="Income"
              label="In"
              value={formatSignedAmount(expenseSnapshot.stats.income)}
            />
            <StatCard
              accent="rose"
              detail="Spending"
              label="Out"
              value={formatSignedAmount(-expenseSnapshot.stats.expenses)}
            />
            <StatCard
              accent="sun"
              detail="This month"
              label="Net"
              value={formatSignedAmount(expenseSnapshot.stats.net)}
            />
          </div>

          {expenseSnapshot.entries.length > 0 ? (
            <div className="mt-5 overflow-hidden rounded-md border border-[#e3ded6] bg-[#fbfaf6]">
              <div className="grid divide-y divide-[#e3ded6]">
                {expenseSnapshot.entries.map((expense) => (
                  <div className="flex items-center justify-between gap-4 px-4 py-3" key={expense.id}>
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
                        <span>{formatExpenseDate(expense.date)}</span>
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
                      className={`shrink-0 text-sm font-semibold tabular-nums ${
                        expense.type === "INCOME" ? "text-[#2d4f34]" : "text-[#8d3028]"
                      }`}
                    >
                      {expense.type === "INCOME" ? "+" : "−"}
                      {formatSignedAmount(expense.amount).replace(/^[+−]/, "")}
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
                Money this month
              </p>
              <h2 className="mt-1 font-serif text-xl font-semibold tracking-normal text-[#171a18]">
                No expenses this month
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#6c726e]">
                Nothing to track yet. Add spending when the month starts to fill up.
              </p>
            </div>
            <Link
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-[#d8d2c8] bg-white px-3 text-sm font-medium text-[#5d635f] transition hover:bg-[#f4f1ea]"
              href="/app/expenses"
            >
              Add expense
            </Link>
          </div>
        </section>
      )}

    </div>
  );
}
