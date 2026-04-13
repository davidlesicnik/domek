import { FeatureCard } from "@/components/dashboard/feature-card";
import { StatCard } from "@/components/dashboard/stat-card";

const stats = [
  { label: "Today", value: "3", detail: "planned household items" },
  { label: "Open tasks", value: "8", detail: "waiting for an owner" },
  { label: "Monthly spend", value: "0 EUR", detail: "expense tracker placeholder" },
];

const features = [
  {
    id: "calendar",
    title: "Shared calendar",
    summary: "Plan household events, appointments, and reminders in one shared view.",
    status: "Roadmap",
  },
  {
    id: "to-do",
    title: "Shared to-do list",
    summary: "Track tasks with ownership, due dates, and completion history.",
    status: "Roadmap",
  },
  {
    id: "notes",
    title: "Shared notes",
    summary: "Keep household notes, links, and recurring reference details together.",
    status: "Roadmap",
  },
  {
    id: "chores",
    title: "Chore list",
    summary: "Rotate recurring chores and keep accountability visible.",
    status: "Roadmap",
  },
  {
    id: "expenses",
    title: "Expense tracker",
    summary: "Record household spending and review simple monthly totals.",
    status: "Roadmap",
  },
];

export function DashboardOverview() {
  return (
    <div className="grid gap-6">
      <section className="grid gap-4 rounded-md border border-[#d7dce2] bg-[#ffffff] p-4 sm:p-6">
        <div className="max-w-3xl">
          <p className="text-sm font-medium text-[#0f766e]">Overview</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-normal text-[#161616] sm:text-4xl">
            Home, today
          </h2>
          <p className="mt-3 text-base leading-7 text-[#4b5563]">
            A shared starting point for the household. The first slice keeps the
            structure ready for real data, authentication, and feature-by-feature growth.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {features.map((feature) => (
          <FeatureCard key={feature.id} {...feature} />
        ))}
      </section>
    </div>
  );
}
