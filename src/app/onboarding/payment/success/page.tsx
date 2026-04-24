import Link from "next/link";
import { redirect } from "next/navigation";

import { PaymentStatusRefresh } from "@/components/billing/payment-status-refresh";
import { requireAppSession } from "@/lib/authz";
import { billingStatusHasAccess, getUserBillingSubscription } from "@/lib/billing";
import { getFirstHouseholdMembership } from "@/lib/users";

export const dynamic = "force-dynamic";

export default async function PaymentSuccessPage() {
  const session = await requireAppSession();
  const membership = await getFirstHouseholdMembership(session.user.id);
  const billingSubscription = await getUserBillingSubscription(session.user.id);

  if (membership) {
    redirect("/app");
  }

  if (
    session.user.developmentAccessGrantedAt ||
    billingStatusHasAccess(billingSubscription?.status)
  ) {
    redirect("/onboarding/household");
  }

  return (
    <main className="min-h-dvh border-t-4 border-[#232323] bg-[#f8f6f1] px-4 py-8 text-[#202321] sm:px-6">
      <PaymentStatusRefresh />
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-[560px] items-center justify-center">
        <section className="w-full rounded-md border border-[#dedbd2] bg-[#fffdf8] p-8 text-center shadow-[0_22px_55px_rgba(31,35,30,0.10)] sm:p-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#d9d6ce] bg-[#f8f6f1]">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#c9d7ca] border-t-[#526c56]" />
          </div>
          <p className="mt-6 font-serif text-xs font-semibold uppercase tracking-normal text-[#526c56]">
            Activating trial
          </p>
          <h1 className="mt-3 font-serif text-4xl font-semibold tracking-normal text-[#171a18]">
            Setting up your Domek access
          </h1>
          <p className="mt-4 text-base leading-7 text-[#686e6a]">
            We&apos;re waiting for Paddle to confirm the subscription. This page refreshes on
            its own and will send you forward as soon as your household trial is ready.
          </p>
          <p className="mt-6 text-xs leading-5 text-[#9ea49f]">
            If this takes longer than expected,{" "}
            <Link className="underline underline-offset-2 hover:text-[#686e6a]" href="/onboarding/payment">
              head back to payment
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
