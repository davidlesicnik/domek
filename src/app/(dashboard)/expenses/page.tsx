import type { Metadata } from "next";

import { ExpensesBoard } from "@/components/expenses/expenses-board";
import {
  getCurrentExpenseScope,
  getMonthStats,
  listCategories,
  listExpenses,
  listMembers,
} from "@/lib/expenses";

export const metadata: Metadata = {
  title: "Expenses | Domek",
  description: "Household income and spending for the month.",
};

export default async function ExpensesPage() {
  const now = new Date();
  const initialYear = now.getUTCFullYear();
  const initialMonth = now.getUTCMonth() + 1;
  const scope = await getCurrentExpenseScope();

  const [initialExpenses, initialStats, initialCategories, members] = scope
    ? await Promise.all([
        listExpenses(scope, initialYear, initialMonth),
        getMonthStats(scope, initialYear, initialMonth),
        listCategories(scope),
        listMembers(scope),
      ])
    : [[], { carryover: 0, income: 0, expenses: 0, net: 0 }, [], []];

  return (
    <ExpensesBoard
      initialCategories={initialCategories}
      initialExpenses={initialExpenses}
      initialMonth={initialMonth}
      initialStats={initialStats}
      initialYear={initialYear}
      members={members}
    />
  );
}
