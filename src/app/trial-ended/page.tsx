import Link from "next/link";
import { redirect } from "next/navigation";

import { requireAppSession } from "@/lib/authz";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Trial ended – Domek",
};

async function activateAction() {
  "use server";

  const session = await requireAppSession();

  const membership = await prisma.householdMember.findFirst({
    select: { householdId: true },
    where: { accountId: session.user.id, household: { deletedAt: null } },
  });

  if (!membership) {
    redirect("/onboarding/household");
  }

  await prisma.household.update({
    data: { paidAt: new Date() },
    where: { id: membership.householdId },
  });

  redirect("/app");
}

export default function TrialEndedPage() {
  return (
    <main className="min-h-dvh border-t-4 border-[#232323] bg-[#f8f6f1] px-4 py-8 text-[#202321] sm:px-6">
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-[860px] items-center">
        <section className="w-full rounded-md border border-[#dedbd2] bg-[#fffdf8] p-6 shadow-[0_22px_55px_rgba(31,35,30,0.10)] sm:p-8">
          <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#b94e3f]">
            Trial ended
          </p>
          <div className="mt-3 grid gap-8 sm:grid-cols-[1fr_0.8fr] sm:items-start">
            <div>
              <h1 className="font-serif text-4xl font-semibold tracking-normal text-[#171a18]">
                Keep your household running
              </h1>
              <p className="mt-4 max-w-lg text-base leading-7 text-[#686e6a]">
                Your 30-day trial has ended. Get a plan to keep your lists, calendar, and notes
                going, one price for the whole household.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <form action={activateAction}>
                <button
                  className="h-12 w-full rounded-md bg-[#232323] px-5 text-sm font-semibold text-white transition hover:bg-[#3c413e]"
                  type="submit"
                >
                  Continue with Domek — €15/year
                </button>
              </form>
              <Link
                className="inline-flex h-10 items-center justify-center rounded-md border border-[#d9d6ce] bg-[#fffdf8] px-5 text-sm font-semibold text-[#3c413e] transition hover:border-[#bfc9bd] hover:bg-[#f8f6f1]"
                href="/pricing"
              >
                View pricing
              </Link>
              <a
                className="mt-1 text-center text-xs text-[#9ea49f] hover:underline"
                href="/api/auth/signout"
              >
                Log out
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
