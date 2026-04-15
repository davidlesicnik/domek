import { Banknote, BrushCleaning, CalendarDays, ListTodo, NotebookPen, ShoppingCart } from "lucide-react";
import Link from "next/link";

import { FeatureCard } from "@/components/dashboard/feature-card";
import { Footer } from "@/components/layout/footer";
import { getCurrentAppSession } from "@/lib/authz";

export const dynamic = "force-dynamic";

const features = [
  {
    accent: "sage",
    id: "calendar",
    marker: "CAL",
    icon: <CalendarDays aria-hidden className="h-5 w-5" />,
    title: "Dates that matter",
    summary: "Birthdays, bins, school days, guests, and all the little dates that keep the house moving.",
  },
  {
    accent: "rose",
    id: "to-do",
    marker: "DO",
    icon: <ListTodo aria-hidden className="h-5 w-5" />,
    title: "Things to do",
    summary: "The small jobs that used to live on scraps of paper and kitchen counters.",
  },
  {
    accent: "sun",
    id: "shopping",
    marker: "SHOP",
    icon: <ShoppingCart aria-hidden className="h-5 w-5" />,
    title: "Shopping lists",
    summary: "Shared lists for the weekly shop, top-ups, and the things you always forget.",
  },
  {
    accent: "sun",
    id: "notes",
    marker: "NOTE",
    icon: <NotebookPen aria-hidden className="h-5 w-5" />,
    title: "Notes for the house",
    summary: "Wi-Fi notes, trip lists, pet care, and anything worth being able to find again.",
  },
  {
    accent: "rose",
    id: "expenses",
    marker: "EUR",
    icon: <Banknote aria-hidden className="h-5 w-5" />,
    title: "Money to keep track of",
    summary: "Shared costs, repairs, supplies, and the odd surprise bill - all in one place.",
  },
  {
    accent: "moss",
    id: "chores",
    marker: "JOB",
    icon: <BrushCleaning aria-hidden className="h-5 w-5" />,
    title: "Chores around the house",
    summary: "Recurring jobs, without the weekly “who did what” debate.",
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
        <section className="mx-auto w-full max-w-[940px] rounded-md bg-[#fffdf8] px-8 pb-10 pt-12 shadow-[0_8px_40px_rgba(31,35,30,0.06)] sm:px-14 sm:pb-12 sm:pt-16">
          <div className="max-w-lg">
            <h2 className="font-serif text-4xl font-semibold tracking-normal text-[#171a18] sm:text-5xl">
              Your home,<br />organised.
            </h2>
            <p className="mt-5 text-base leading-7 text-[#686e6a]">
              One shared place for your calendar, chores, lists, and expenses.<br/>
              Like the list on the fridge, but for everything.
            </p>
            <div className="mt-6">
              <Link
                className="inline-flex h-10 items-center justify-center rounded-md border border-[#b9cdbc] bg-[#eef7ef] px-6 text-sm font-semibold text-[#526c56] transition hover:bg-[#e1f0e3]"
                href={session ? "/app" : "/login"}
              >
                {session ? "Open Domek" : "Get started"}
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

      <Footer />
    </div>
  );
}
