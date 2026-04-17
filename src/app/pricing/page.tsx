import { Check } from "lucide-react";
import Link from "next/link";

import { Footer } from "@/components/layout/footer";

export const metadata = {
  title: "Pricing – Domek",
  description: "One simple plan for your home. Everything in Domek for one household.",
};

const included = [
  "Shared calendar",
  "To-do lists",
  "Shopping lists",
  "Shared Notes",
  "Expense tracking",
  "Chore management",
  "Unlimited household members",
];

const howItWorks = [
  "One subscription per household",
  "Invite anyone you live with",
  "Everyone shares the same space",
];

const noSurprises = [
  "No monthly billing",
  "No hidden fees",
  "Cancel anytime",
];

export default function PricingPage() {
  return (
    <div className="min-h-dvh border-t-4 border-[#232323] bg-[#f8f6f1] text-[#202321]">
      <header className="border-b border-[#dfddd6] bg-[#fdfcf8]">
        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="font-serif text-3xl font-semibold tracking-normal text-[#171a18]">
            Domek
          </Link>
          <Link
            className="inline-flex h-8 items-center justify-center rounded-full border border-[#b9cdbc] bg-[#eef7ef] px-5 text-xs font-semibold text-[#526c56] transition hover:bg-[#e1f0e3]"
            href="/login"
          >
            Login
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1120px] px-4 pb-20 pt-12 sm:px-6 sm:pt-16">
        <div className="rounded-md bg-[#fffdf8] shadow-[0_8px_40px_rgba(31,35,30,0.06)]">
          {/* Top: heading + price */}
          <div className="flex flex-col gap-6 border-b border-[#e8e5de] px-8 py-8 sm:flex-row sm:items-end sm:justify-between sm:px-10 sm:py-10">
            <div>
              <h1 className="font-serif text-4xl font-semibold tracking-normal text-[#171a18] sm:text-5xl">
                One simple plan<br />for your home
              </h1>
              <p className="mt-4 text-base leading-7 text-[#686e6a]">
                Everything Domek offers, for one household.
              </p>
            </div>
            <div className="shrink-0 sm:text-right">
              <div className="flex items-baseline gap-1 sm:justify-end">
                <span className="font-serif text-5xl font-semibold text-[#171a18]">$15</span>
                <span className="text-base text-[#686e6a]">/ year</span>
              </div>
              <p className="mt-1 text-sm text-[#686e6a]">Per household. No per-user pricing. No tiers.</p>
              <Link
                className="mt-4 inline-flex h-10 items-center justify-center rounded-md border border-[#b9cdbc] bg-[#eef7ef] px-6 text-sm font-semibold text-[#526c56] transition hover:bg-[#e1f0e3]"
                href="/login"
              >
                Start your household
              </Link>
              <p className="mt-3 text-xs text-[#9ea49f] sm:text-right">You&apos;ll be able to review everything before confirming.</p>
              <p className="mt-1 text-xs text-[#9ea49f] sm:text-right">Payments handled securely by Paddle.</p>
            </div>
          </div>

          {/* Bottom: three columns */}
          <div className="grid gap-0 divide-y divide-[#e8e5de] sm:divide-x sm:divide-y-0 sm:grid-cols-3">
            <div className="px-8 py-8 sm:px-10">
              <h2 className="mb-5 text-sm font-semibold text-[#202321]">What&apos;s included</h2>
              <ul className="space-y-3">
                {included.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-[#686e6a]">
                    <Check aria-hidden className="h-4 w-4 shrink-0 text-[#526c56]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="px-8 py-8 sm:px-10">
              <h2 className="mb-5 text-sm font-semibold text-[#202321]">How it works</h2>
              <ul className="space-y-3">
                {howItWorks.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-[#686e6a]">
                    <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#b9cdbc]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="px-8 py-8 sm:px-10">
              <h2 className="mb-5 text-sm font-semibold text-[#202321]">No surprises</h2>
              <ul className="space-y-3">
                {noSurprises.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-[#686e6a]">
                    <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#b9cdbc]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
