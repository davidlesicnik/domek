import { getTranslations } from "next-intl/server";
import { getLocale } from "next-intl/server";

import { redirect } from "@/i18n/server";
import { Link } from "@/i18n/navigation";
import { requireAppSession } from "@/lib/authz";
import { PaddleCheckoutLauncher } from "@/components/billing/paddle-checkout-launcher";
import { hasAccess } from "@/lib/billing";
import { getAppRuntimeConfig, getPaddleRuntimeConfig } from "@/lib/env";
import { getUserBillingSubscription } from "@/lib/billing";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "trialEnded" });
  return { title: t("metaTitle") };
}

export default async function TrialEndedPage() {
  const [session, t, locale] = await Promise.all([
    requireAppSession(),
    getTranslations("trialEnded"),
    getLocale(),
  ]);
  const billingSubscription = await getUserBillingSubscription(session.user.id);

  if (
    hasAccess({
      billingSubscription,
      developmentAccessGrantedAt: session.user.developmentAccessGrantedAt,
      trialStartedAt: session.user.trialStartedAt,
    })
  ) {
    return await redirect("/app");
  }

  const { appUrl } = getAppRuntimeConfig();
  const { clientToken, priceId } = getPaddleRuntimeConfig();
  const origin = appUrl ?? "http://localhost:3000";
  const successUrl = `${origin}/${locale}/app`;

  return (
    <main className="min-h-dvh border-t-4 border-[#232323] bg-[#f8f6f1] px-4 py-8 text-[#202321] sm:px-6">
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-[920px] items-center">
        <section className="w-full rounded-md border border-[#dedbd2] bg-[#fffdf8] p-6 shadow-[0_22px_55px_rgba(31,35,30,0.10)] sm:p-8">
          <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#686e6a]">
            {t("label")}
          </p>
          <div className="mt-3 grid gap-8 sm:grid-cols-[1fr_0.85fr] sm:items-start">
            <div>
              <h1 className="font-serif text-4xl font-semibold tracking-normal text-[#171a18]">
                {t("title")}
              </h1>
              <p className="mt-4 max-w-lg text-base leading-7 text-[#686e6a]">
                {t("description")}
              </p>
              <ul className="mt-6 grid gap-3 text-sm text-[#686e6a]">
                {[t("bullet1"), t("bullet2"), t("bullet3")].map((bullet) => (
                  <li key={bullet} className="flex items-center gap-3">
                    <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#b9cdbc]" />
                    {bullet}
                  </li>
                ))}
              </ul>
              <p className="mt-6 flex items-center gap-2 text-xs text-[#8b918c]">
                <svg aria-hidden className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <rect height="11" rx="2" ry="2" width="18" x="3" y="11" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                {t("dataPreservationNote")}
              </p>
            </div>
            <div className="grid gap-4 rounded-md border border-[#e5e0d7] bg-[#fcfbf7] p-5">
              <div>
                <p className="text-sm font-semibold text-[#202321]">{t("planTitle")}</p>
                <p className="font-serif text-3xl font-semibold text-[#171a18]">{t("planPrice")}</p>
                <p className="mt-1 text-sm text-[#526c56]">{t("planTrialLabel")}</p>
              </div>

              <PaddleCheckoutLauncher
                appUserId={session.user.id}
                clientToken={clientToken}
                customerEmail={session.user.email}
                priceId={priceId}
                successUrl={successUrl}
              />

              <p className="text-xs leading-5 text-[#8b918c]">{t("paddleNote")}</p>
              <Link
                className="text-center text-sm text-[#686e6a] underline underline-offset-2 hover:text-[#3c413e]"
                href="/pricing"
              >
                {t("viewPricing")}
              </Link>
              <p className="text-center text-xs leading-5 text-[#8b918c]">
                {t("billingQuestion")}
                <Link className="underline underline-offset-2 hover:text-[#686e6a]" href="/refund-policy">
                  {t("seeRefundPolicy")}
                </Link>
                .
              </p>
              <form action="/api/auth/signout" method="post">
                <button className="w-full text-center text-xs text-[#9ea49f] hover:underline" type="submit">
                  {t("logOut")}
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
