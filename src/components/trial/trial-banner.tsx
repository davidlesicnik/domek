import Link from "next/link";

import { type TrialState } from "@/lib/trial";

type TrialBannerProps = Readonly<{
  state: TrialState;
  daysLeft: number;
  daysUsed: number;
  memberCount: number;
}>;

export function TrialBanner({ state, daysLeft, daysUsed, memberCount }: TrialBannerProps) {
  if (state === "active") return null;

  if (state === "trial" && daysUsed >= 14 && memberCount >= 2) {
    return (
      <div className="border-b border-[#c5d9c6] bg-[#f0f6f1]">
        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between px-4 py-2 sm:px-6">
          <p className="text-xs text-[#3c5e40]">
            You&apos;ve been using Domek for {daysUsed} days — keep your household going for $20/year.
          </p>
          <Link
            className="ml-4 shrink-0 text-xs font-semibold text-[#526c56] hover:underline"
            href="/pricing"
          >
            Get a plan →
          </Link>
        </div>
      </div>
    );
  }

  if (state === "expiring") {
    const label = daysLeft === 1 ? "1 day" : `${daysLeft} days`;
    return (
      <div className="border-b border-[#e8c4bc] bg-[#fdf5f3]">
        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between px-4 py-2 sm:px-6">
          <p className="text-xs text-[#7a3228]">
            {label} left in your trial — your household will need a plan to continue.
          </p>
          <Link
            className="ml-4 shrink-0 text-xs font-semibold text-[#a6543c] hover:underline"
            href="/pricing"
          >
            Continue →
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
