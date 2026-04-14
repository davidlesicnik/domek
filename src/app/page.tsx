import Link from "next/link";

import { FeatureCard } from "@/components/dashboard/feature-card";
import { getCurrentAppSession } from "@/lib/authz";

export const dynamic = "force-dynamic";

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
    status: "Open",
  },
  {
    accent: "sun",
    id: "shopping",
    marker: "SHOP",
    title: "Shopping lists",
    summary: "Shared lists for the weekly shop, top-ups, and the things you always forget.",
    status: "Open",
  },
  {
    accent: "sun",
    id: "notes",
    marker: "NOTE",
    title: "Shared notes",
    summary: "Wi-Fi notes, trip lists, pet care, and anything worth being able to find again.",
    status: "Open",
  },
  {
    accent: "rose",
    id: "expenses",
    marker: "EUR",
    title: "Expense tracker",
    summary: "Simple totals for shared costs, repairs, supplies, and the odd surprise bill.",
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
];

export default async function LandingPage() {
  const session = await getCurrentAppSession();

  return (
    <div className="min-h-dvh border-t-4 border-[#232323] bg-[#f8f6f1] text-[#202321]">
      <header className="border-b border-[#dfddd6] bg-[#fdfcf8]">
        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between px-4 py-4 sm:px-6">
          <h1 className="font-serif text-2xl font-semibold tracking-normal text-[#171a18]">
            Domek
          </h1>
          <Link
            className="inline-flex h-8 items-center justify-center rounded-full border border-[#b9cdbc] bg-[#eef7ef] px-5 text-xs font-semibold text-[#526c56] transition hover:bg-[#e1f0e3]"
            href={session ? "/app" : "/login"}
          >
            {session ? "Open app →" : "Login"}
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1120px] px-4 pb-20 pt-12 sm:px-6 sm:pt-16">
        <section className="mx-auto grid w-full max-w-[940px] gap-8 rounded-md border border-[#e0dcd4] bg-[#fffdf8] p-6 shadow-[0_22px_55px_rgba(31,35,30,0.10)] sm:p-10">
          <div className="max-w-2xl">
            <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#a6543c]">
              Everything in one place
            </p>
            <h2 className="mt-3 font-serif text-4xl font-semibold tracking-normal text-[#171a18] sm:text-5xl">
              Your home,<br />organised.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-[#686e6a]">
              One shared place for the calendar, the list on the fridge, the chore rhythm,
              and the money bits no one wants to chase later.
            </p>
            <div className="mt-8">
              <Link
                className="inline-flex h-10 items-center justify-center rounded-md border border-[#b9cdbc] bg-[#eef7ef] px-6 text-sm font-semibold text-[#526c56] transition hover:bg-[#e1f0e3]"
                href={session ? "/app" : "/login"}
              >
                {session ? "Open Domek" : "Sign in to get started"}
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-12">
          <p className="mb-4 font-serif text-xs font-semibold uppercase tracking-normal text-[#545b57]">
            What&apos;s inside
          </p>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature) => (
              <FeatureCard key={feature.id} {...feature} />
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-[#dfddd6] bg-[#fdfcf8] px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-[1280px]">
          <p className="text-xs text-[#9ea49f]">
            Domek — a household planner for the people who live there.
          </p>
        </div>
      </footer>
    </div>
  );
}
