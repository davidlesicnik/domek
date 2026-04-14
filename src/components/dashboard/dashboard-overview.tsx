import { FeatureCard } from "@/components/dashboard/feature-card";

const features = [
  {
    accent: "sage",
    id: "calendar",
    marker: "CAL",
    title: "Shared calendar",
    summary:
      "Birthdays, bins, school days, guests, and all the little dates that keep the house moving.",
    status: "Open",
  },
  {
    accent: "rose",
    id: "to-do",
    marker: "DO",
    title: "Shared to-do list",
    summary: "A place for the small jobs that otherwise live on scraps of paper and kitchen counters.",
    status: "Soon",
  },
  {
    accent: "sun",
    id: "notes",
    marker: "NOTE",
    title: "Shared notes",
    summary: "Wi-Fi notes, shopping ideas, pet care, trip lists, and anything worth finding again.",
    status: "Open",
  },
  {
    accent: "moss",
    id: "chores",
    marker: "JOB",
    title: "Chore list",
    summary: "Recurring work without the weekly detective game of who did what last time.",
    status: "Soon",
  },
  {
    accent: "rose",
    id: "expenses",
    marker: "EUR",
    title: "Expense tracker",
    summary: "Simple totals for shared costs, repairs, supplies, and the odd surprise bill.",
    status: "Open",
  },
];

export function DashboardOverview() {
  return (
    <div className="grid gap-8">
      <section className="mx-auto grid w-full max-w-[940px] gap-8 rounded-md border border-[#e0dcd4] bg-[#fffdf8] p-6 shadow-[0_22px_55px_rgba(31,35,30,0.10)] sm:p-10">
        <div className="max-w-2xl">
          <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#a6543c]">
            On the table
          </p>
          <h2 className="mt-3 font-serif text-4xl font-semibold tracking-normal text-[#171a18] sm:text-5xl">
            What needs attention?
          </h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-[#686e6a]">
            One shared place for the calendar, the list on the fridge, the chore rhythm,
            and the money bits no one wants to chase later.
          </p>
        </div>
      </section>

      <section>
        <p className="mb-4 font-serif text-xs font-semibold uppercase tracking-normal text-[#545b57]">
          Everything in one place
        </p>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature) => (
            <FeatureCard key={feature.id} {...feature} />
          ))}
        </div>
      </section>
    </div>
  );
}
