import { Banknote, BrushCleaning, CalendarDays, ListTodo, NotebookPen, ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

import { FeatureCard } from "@/components/dashboard/feature-card";
import { Footer } from "@/components/layout/footer";
import { Link } from "@/i18n/navigation";
import { getCurrentAppSession } from "@/lib/authz";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common" });
  return {
    title: t("appName"),
    description: "A household planner for shared calendars, tasks, notes, chores, and expenses.",
  };
}

export default async function LandingPage() {
  const session = await getCurrentAppSession();

  return (
    <div className="min-h-dvh border-t-4 border-[#232323] bg-[#f8f6f1] text-[#202321]">
      <header className="border-b border-[#dfddd6] bg-[#fdfcf8]">
        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between px-4 py-4 sm:px-6">
          <h1 className="font-serif text-3xl font-semibold tracking-normal text-[#171a18]">
            Domek
          </h1>
          <LandingHeaderButtons hasSession={!!session} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1120px] px-4 pb-20 pt-12 sm:px-6 sm:pt-16">
        <LandingHero hasSession={!!session} />
        <LandingFeatures />
      </main>

      <Footer />
    </div>
  );
}

function LandingHeaderButtons({ hasSession }: { hasSession: boolean }) {
  const t = useTranslations("landing");
  const tc = useTranslations("common");

  return (
    <div className="flex items-center gap-3">
      <Link
        className="inline-flex h-8 items-center justify-center rounded-full px-4 text-xs font-medium text-[#686e6a] transition hover:text-[#202321]"
        href="/pricing"
      >
        {t("seePricing")}
      </Link>
      <Link
        className="inline-flex h-8 items-center justify-center rounded-full border border-[#b9cdbc] bg-[#eef7ef] px-5 text-xs font-semibold text-[#526c56] transition hover:bg-[#e1f0e3]"
        href={hasSession ? "/app" : "/login"}
      >
        {hasSession ? tc("openApp") : tc("login")}
      </Link>
    </div>
  );
}

function LandingHero({ hasSession }: { hasSession: boolean }) {
  const t = useTranslations("landing");
  const tc = useTranslations("common");

  return (
    <section className="mx-auto w-full max-w-[940px] rounded-md bg-[#fffdf8] px-8 pb-10 pt-12 shadow-[0_8px_40px_rgba(31,35,30,0.06)] sm:px-14 sm:pb-12 sm:pt-16">
      <div className="max-w-lg">
        <h2 className="font-serif text-4xl font-semibold tracking-normal text-[#171a18] sm:text-5xl">
          {t("heroTitle").split("\n").map((line, i) => (
            <span key={i}>{line}{i === 0 ? <br /> : null}</span>
          ))}
        </h2>
        <p className="mt-5 text-base leading-7 text-[#686e6a]">
          {t("heroSubtitle")}<br />{t("heroByline")}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md border border-[#b9cdbc] bg-[#eef7ef] px-6 text-sm font-semibold text-[#526c56] transition hover:bg-[#e1f0e3]"
            href={hasSession ? "/app" : "/login"}
          >
            {hasSession ? tc("openDomek") : tc("startHousehold")}
          </Link>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium text-[#686e6a] transition hover:text-[#202321]"
            href="/pricing"
          >
            {tc("seePricingArrow")}
          </Link>
        </div>
      </div>
    </section>
  );
}

function LandingFeatures() {
  const t = useTranslations("landing");

  const features = [
    {
      accent: "sage" as const,
      id: "calendar",
      marker: "CAL",
      icon: <CalendarDays aria-hidden className="h-5 w-5" />,
      title: t("featureCalendarTitle"),
      summary: t("featureCalendarSummary"),
    },
    {
      accent: "rose" as const,
      id: "to-do",
      marker: "DO",
      icon: <ListTodo aria-hidden className="h-5 w-5" />,
      title: t("featureTodosTitle"),
      summary: t("featureTodosSummary"),
    },
    {
      accent: "sun" as const,
      id: "shopping",
      marker: "SHOP",
      icon: <ShoppingCart aria-hidden className="h-5 w-5" />,
      title: t("featureShoppingTitle"),
      summary: t("featureShoppingSummary"),
    },
    {
      accent: "sun" as const,
      id: "notes",
      marker: "NOTE",
      icon: <NotebookPen aria-hidden className="h-5 w-5" />,
      title: t("featureNotesTitle"),
      summary: t("featureNotesSummary"),
    },
    {
      accent: "rose" as const,
      id: "expenses",
      marker: "EUR",
      icon: <Banknote aria-hidden className="h-5 w-5" />,
      title: t("featureExpensesTitle"),
      summary: t("featureExpensesSummary"),
    },
    {
      accent: "moss" as const,
      id: "chores",
      marker: "JOB",
      icon: <BrushCleaning aria-hidden className="h-5 w-5" />,
      title: t("featureChoresTitle"),
      summary: t("featureChoresSummary"),
    },
  ];

  return (
    <section className="mt-12">
      <p className="mb-4 font-serif text-xs font-semibold uppercase tracking-normal text-[#545b57]">
        {t("whatsInside")}
      </p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {features.map((feature) => (
          <FeatureCard key={feature.id} {...feature} />
        ))}
      </div>
    </section>
  );
}
