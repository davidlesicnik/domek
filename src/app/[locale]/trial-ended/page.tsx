import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";

import { redirect } from "@/i18n/server";
import { Link } from "@/i18n/navigation";
import { requireAppSession } from "@/lib/authz";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "trialEnded" });
  return { title: t("metaTitle") };
}

async function activateAction() {
  "use server";

  await requireAppSession();
  return await redirect("/onboarding/payment");
}

export default function TrialEndedPage() {
  return <TrialEndedView />;
}

function TrialEndedView() {
  const t = useTranslations("trialEnded");
  return (
    <main className="min-h-dvh border-t-4 border-[#232323] bg-[#f8f6f1] px-4 py-8 text-[#202321] sm:px-6">
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-[860px] items-center">
        <section className="w-full rounded-md border border-[#dedbd2] bg-[#fffdf8] p-6 shadow-[0_22px_55px_rgba(31,35,30,0.10)] sm:p-8">
          <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#b94e3f]">
            {t("label")}
          </p>
          <div className="mt-3 grid gap-8 sm:grid-cols-[1fr_0.8fr] sm:items-start">
            <div>
              <h1 className="font-serif text-4xl font-semibold tracking-normal text-[#171a18]">
                {t("title")}
              </h1>
              <p className="mt-4 max-w-lg text-base leading-7 text-[#686e6a]">
                {t("description")}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <form action={activateAction}>
                <button
                  className="h-12 w-full rounded-md bg-[#232323] px-5 text-sm font-semibold text-white transition hover:bg-[#3c413e]"
                  type="submit"
                >
                  {t("continueButton")}
                </button>
              </form>
              <Link
                className="inline-flex h-10 items-center justify-center rounded-md border border-[#d9d6ce] bg-[#fffdf8] px-5 text-sm font-semibold text-[#3c413e] transition hover:border-[#bfc9bd] hover:bg-[#f8f6f1]"
                href="/pricing"
              >
                {t("viewPricing")}
              </Link>
              <p className="text-center text-xs leading-5 text-[#8b918c]">
                {t("billingQuestion")}
                <Link className="underline underline-offset-2 hover:text-[#686e6a]" href="/refund-policy">
                  {t("seeHowItWorks")}
                </Link>
                .
              </p>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                className="mt-1 text-center text-xs text-[#9ea49f] hover:underline"
                href="/api/auth/signout"
              >
                {t("logOut")}
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
