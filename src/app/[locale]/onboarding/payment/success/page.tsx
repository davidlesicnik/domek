import { useTranslations } from "next-intl";

import { PaymentStatusRefresh } from "@/components/billing/payment-status-refresh";
import { billingStatusHasAccess, getUserBillingSubscription } from "@/lib/billing";
import { requireAppSession } from "@/lib/authz";
import { getFirstHouseholdMembership } from "@/lib/users";
import { redirect } from "@/i18n/server";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-dynamic";

export default async function PaymentSuccessPage() {
  const session = await requireAppSession();
  const membership = await getFirstHouseholdMembership(session.user.id);
  const billingSubscription = await getUserBillingSubscription(session.user.id);

  if (membership) {
    return await redirect("/app");
  }

  if (
    session.user.developmentAccessGrantedAt ||
    billingStatusHasAccess(billingSubscription?.status)
  ) {
    return await redirect("/onboarding/household");
  }

  return <PaymentSuccessView />;
}

function PaymentSuccessView() {
  const t = useTranslations("onboarding");
  return (
    <main className="min-h-dvh border-t-4 border-[#232323] bg-[#f8f6f1] px-4 py-8 text-[#202321] sm:px-6">
      <PaymentStatusRefresh />
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-[560px] items-center justify-center">
        <section className="w-full rounded-md border border-[#dedbd2] bg-[#fffdf8] p-8 text-center shadow-[0_22px_55px_rgba(31,35,30,0.10)] sm:p-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#d9d6ce] bg-[#f8f6f1]">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#c9d7ca] border-t-[#526c56]" />
          </div>
          <p className="mt-6 font-serif text-xs font-semibold uppercase tracking-normal text-[#526c56]">
            {t("paymentSuccessLabel")}
          </p>
          <h1 className="mt-3 font-serif text-4xl font-semibold tracking-normal text-[#171a18]">
            {t("paymentSuccessTitle")}
          </h1>
          <p className="mt-4 text-base leading-7 text-[#686e6a]">
            {t("paymentSuccessDescription")}
          </p>
          <p className="mt-6 text-xs leading-5 text-[#9ea49f]">
            {t("paymentSuccessDelayNote")}
            <Link className="underline underline-offset-2 hover:text-[#686e6a]" href="/onboarding/payment">
              {t("paymentSuccessHeadBack")}
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
