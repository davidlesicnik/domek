import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

import { Footer } from "@/components/layout/footer";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pricing" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default function PricingPage() {
  return (
    <div className="min-h-dvh border-t-4 border-[#232323] bg-[#f8f6f1] text-[#202321]">
      <PricingHeader />
      <PricingContent />
      <Footer />
    </div>
  );
}

function PricingHeader() {
  const tc = useTranslations("common");
  return (
    <header className="border-b border-[#dfddd6] bg-[#fdfcf8]">
      <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="font-serif text-3xl font-semibold tracking-normal text-[#171a18]">
          Domek
        </Link>
        <Link
          className="inline-flex h-8 items-center justify-center rounded-full border border-[#b9cdbc] bg-[#eef7ef] px-5 text-xs font-semibold text-[#526c56] transition hover:bg-[#e1f0e3]"
          href="/login"
        >
          {tc("login")}
        </Link>
      </div>
    </header>
  );
}

function PricingContent() {
  const t = useTranslations("pricing");
  const tc = useTranslations("common");

  const included = [
    t("includedCalendar"),
    t("includedTodos"),
    t("includedShopping"),
    t("includedNotes"),
    t("includedExpenses"),
    t("includedChores"),
    t("includedMembers"),
  ];

  const howItWorks = [
    t("howItWorksSubscription"),
    t("howItWorksInvite"),
    t("howItWorksShare"),
  ];

  const noSurprises = [
    t("noSurprisesMonthly"),
    t("noSurprisesFees"),
    t("noSurprisesCancel"),
  ];

  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 pb-20 pt-12 sm:px-6 sm:pt-16">
      <div className="rounded-md bg-[#fffdf8] shadow-[0_8px_40px_rgba(31,35,30,0.06)]">
        <div className="flex flex-col gap-6 border-b border-[#e8e5de] px-8 py-8 sm:flex-row sm:items-end sm:justify-between sm:px-10 sm:py-10">
          <div>
            <h1 className="font-serif text-4xl font-semibold tracking-normal text-[#171a18] sm:text-5xl">
              {t("heroTitle").split("\n").map((line, i) => (
                <span key={i}>{line}{i === 0 ? <br /> : null}</span>
              ))}
            </h1>
            <p className="mt-4 text-base leading-7 text-[#686e6a]">
              {t("heroSubtitle")}
            </p>
          </div>
          <div className="shrink-0 sm:text-right">
            <div className="flex items-baseline gap-1 sm:justify-end">
              <span className="font-serif text-5xl font-semibold text-[#171a18]">{t("price")}</span>
              <span className="text-base text-[#686e6a]">{t("perYear")}</span>
            </div>
            <p className="mt-1 text-sm text-[#686e6a]">{t("perHousehold")}</p>
            <Link
              className="mt-4 inline-flex h-10 items-center justify-center rounded-md border border-[#b9cdbc] bg-[#eef7ef] px-6 text-sm font-semibold text-[#526c56] transition hover:bg-[#e1f0e3]"
              href="/login"
            >
              {tc("startHousehold")}
            </Link>
            <p className="mt-3 text-xs text-[#7f857f] sm:text-right">
              {t("trialNote")}
            </p>
            <p className="mt-1 text-xs text-[#9ea49f] sm:text-right">
              {t("cancelNoteStart")}
              <Link className="underline underline-offset-2 hover:text-[#686e6a]" href="/refund-policy">
                {t("reviewFairly")}
              </Link>
              {t("cancelNoteEnd")}
            </p>
            <p className="mt-1 text-xs text-[#9ea49f] sm:text-right">{t("paddleNote")}</p>
          </div>
        </div>

        <div className="grid gap-0 divide-y divide-[#e8e5de] sm:divide-x sm:divide-y-0 sm:grid-cols-3">
          <div className="px-8 py-8 sm:px-10">
            <h2 className="mb-5 text-sm font-semibold text-[#202321]">{t("includedTitle")}</h2>
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
            <h2 className="mb-5 text-sm font-semibold text-[#202321]">{t("howItWorksTitle")}</h2>
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
            <h2 className="mb-5 text-sm font-semibold text-[#202321]">{t("noSurprisesTitle")}</h2>
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
  );
}
