import { CheckCircle2, X } from "lucide-react";
import NextLink from "next/link";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

import { ProductShowcase, type LandingFeaturePreview } from "@/components/landing/product-showcase";
import { Footer } from "@/components/layout/footer";
import { Link } from "@/i18n/navigation";
import { getCurrentAppSession } from "@/lib/authz";

export const dynamic = "force-dynamic";

const TRUST_KEYS = ["trustTrial", "trustNoCard", "trustCancel", "trustPrivate"] as const;

const HERO_PREVIEW_STATS = [
  ["heroPreviewOpenChores", "3", "bg-[#a8beb0]"],
  ["heroPreviewListItems", "12", "bg-[#dccd79]"],
  ["heroPreviewSharedCosts", "4", "bg-[#ddaea9]"],
  ["heroPreviewUpcomingDates", "6", "bg-[#a99f7f]"],
] as const;

const HERO_PREVIEW_TAB_KEYS = [
  "heroPreviewBoardTab",
  "heroPreviewCalendar",
  "heroPreviewListsTab",
  "heroPreviewMoneyTab",
] as const;

const PROBLEM_KEYS = [
  "problemStickyNotes",
  "problemShoppingApps",
  "problemChoreTurns",
  "problemForgottenBills",
] as const;

const FAQ_KEY_PAIRS = [
  ["faqTrialQuestion", "faqTrialAnswer"],
  ["faqMembersQuestion", "faqMembersAnswer"],
  ["faqPrivacyQuestion", "faqPrivacyAnswer"],
  ["faqUseQuestion", "faqUseAnswer"],
  ["faqCancelQuestion", "faqCancelAnswer"],
] as const;

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

      <main className="mx-auto w-full max-w-[1180px] px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
        <LandingHero hasSession={!!session} />
        <LandingProblem />
        <LandingFeatures />
        <LandingFaq />
        <LandingBottomCta hasSession={!!session} />
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
      <NextLink
        className="inline-flex h-8 items-center justify-center rounded-full px-4 text-xs font-medium text-[#686e6a] transition hover:text-[#202321]"
        href="/blog"
      >
        Blog
      </NextLink>
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
  const trustItems = TRUST_KEYS.map((key) => t(key));

  return (
    <section className="-mx-4 grid w-auto gap-8 rounded-none bg-[#fffdf8] px-[18px] pb-12 pt-8 shadow-none sm:mx-auto sm:w-full sm:rounded-md sm:px-8 sm:pb-8 sm:pt-10 sm:shadow-[0_8px_40px_rgba(31,35,30,0.06)] lg:grid-cols-[minmax(0,0.9fr)_minmax(480px,1.1fr)] lg:items-center">
      <div className="max-w-xl">
        <h2 className="font-serif text-[clamp(2.4rem,11vw,3.5rem)] font-semibold leading-[0.92] tracking-normal text-[#171a18] sm:text-5xl sm:leading-none lg:text-6xl">
          {t("heroTitle").split("\n").map((line, i) => (
            <span key={i}>{line}{i === 0 ? <br /> : null}</span>
          ))}
        </h2>
        <p className="mt-5 max-w-lg text-base leading-7 text-[#686e6a] sm:text-lg">
          {t("heroSubtitle")}
        </p>
        <p className="mt-3 text-sm leading-6 text-[#7c827e]">{t("heroByline")}</p>
        <div className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Link
            className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-[#a8beb0] bg-[#e8efe9] px-6 py-3 text-sm font-semibold text-[#526c56] transition hover:bg-[#dceade] sm:w-auto"
            href={hasSession ? "/app" : "/login"}
          >
            {hasSession ? tc("openDomek") : tc("startHousehold")}
          </Link>
          <Link
            className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-[#e0dbd2] px-4 py-3 text-sm font-medium text-[#686e6a] transition hover:bg-white hover:text-[#202321] sm:w-auto sm:border-transparent"
            href="/pricing"
          >
            {tc("seePricingArrow")}
          </Link>
        </div>
        <div className="mt-7 grid gap-2 min-[420px]:grid-cols-2 sm:flex sm:flex-wrap sm:gap-x-4 sm:gap-y-2">
          {trustItems.map((item) => (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5f6662]" key={item}>
              <CheckCircle2 aria-hidden className="h-3.5 w-3.5 text-[#6f8d75]" />
              {item}
            </span>
          ))}
        </div>
      </div>
      <HeroProductPreview />
    </section>
  );
}

function HeroProductPreview() {
  const t = useTranslations("landing");
  const stats = HERO_PREVIEW_STATS.map(([labelKey, value, tone]) => ({ label: t(labelKey), tone, value }));
  const tabs = HERO_PREVIEW_TAB_KEYS.map((key) => t(key));

  return (
    <div className="max-w-full overflow-hidden rounded-md border border-[#ded8ce] bg-[#fffdf9] shadow-[0_16px_34px_rgba(31,35,30,0.08)] sm:shadow-[0_20px_44px_rgba(31,35,30,0.10)]">
      <div className="flex items-center justify-between border-b border-[#e8e1d5] bg-[#f7f3ea] px-4 py-3">
        <div className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-[#dfbbb7]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#dfcf83]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#adc5b5]" />
        </div>
        <span className="rounded-full border border-[#ded8ce] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-normal text-[#6b716d]">
          {t("heroPreviewHousehold")}
        </span>
      </div>
      <div className="border-b border-[#ece6dc] px-5 py-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          {tabs.map((tab, index) => (
            <span
              className={`shrink-0 rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-normal ${index === 0 ? "bg-[#e8efe9] text-[#526c56]" : "text-[#777d78]"}`}
              key={tab}
            >
              {tab}
            </span>
          ))}
        </div>
      </div>
      <div className="grid gap-4 p-4 sm:gap-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#68706b]">{t("heroPreviewLabel")}</p>
            <h3 className="mt-2 font-serif text-2xl font-semibold tracking-normal text-[#171a18] sm:text-3xl">{t("heroPreviewTitle")}</h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#6a706c]">{t("heroPreviewSummary")}</p>
          </div>
          <div className="hidden rounded-md border border-[#e8e1d6] bg-[#fffaf1] px-3 py-2 text-right sm:block">
            <p className="text-[11px] font-semibold uppercase tracking-normal text-[#7b817c]">{t("heroPreviewDoneThisWeek")}</p>
            <p className="mt-1 font-serif text-2xl font-semibold leading-none text-[#171a18]">9</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((stat) => (
            <div className="rounded-md border border-[#e8e1d6] bg-[#fffdf8] p-3" key={stat.label}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-normal text-[#8b908b]">{stat.label}</p>
                <span className={`h-2 w-2 rounded-full ${stat.tone}`} />
              </div>
              <p className="mt-3 font-serif text-3xl font-semibold leading-none text-[#171a18]">{stat.value}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-[0.9fr_1.1fr]">
          <div className="hidden rounded-md border border-[#e8e1d6] bg-white p-4 sm:block">
            <p className="text-xs font-semibold uppercase tracking-normal text-[#7b817c]">{t("heroPreviewNeedsAttention")}</p>
            <div className="mt-4 grid gap-2.5">
              {[84, 64, 74, 52].map((width, index) => (
                <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2.5" key={width}>
                  <span className={`h-4 w-4 rounded-md ${index === 0 ? "bg-[#e8efe9]" : index === 1 ? "bg-[#f3e4e2]" : "bg-[#f4edc5]"}`} />
                  <span className="h-2.5 rounded-full bg-[#ded8cd]" style={{ width: `${width}%` }} />
                  <span className="h-5 w-10 rounded-full bg-[#f7f3ea]" />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-md border border-[#e8e1d6] bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-normal text-[#7b817c]">{t("heroPreviewOnTheTable")}</p>
            <div className="mt-4 grid grid-cols-7 gap-1.5">
              {[28, 44, 72, 38, 60, 22, 50].map((height, index) => (
                <span className="flex h-24 items-end rounded-sm bg-[#f4f0e8] p-1" key={`${height}-${index}`}>
                  <span className={`w-full rounded-sm ${index === 2 ? "bg-[#a8beb0]" : index === 5 ? "bg-[#dfbbb7]" : "bg-[#b9cdbc]"}`} style={{ height: `${height}%` }} />
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LandingProblem() {
  const t = useTranslations("landing");
  const problems = PROBLEM_KEYS.map((key) => t(key));

  return (
    <section className="mx-auto mt-8 grid max-w-[1040px] gap-6 py-6 sm:mt-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
      <div>
        <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#545b57]">{t("problemEyebrow")}</p>
        <h2 className="mt-3 font-serif text-3xl font-semibold tracking-normal text-[#171a18] sm:text-4xl">
          {t("problemTitle")}
        </h2>
        <p className="mt-4 max-w-xl text-base leading-7 text-[#686e6a]">{t("problemIntro")}</p>
      </div>
      <div className="grid gap-2.5">
        {problems.map((problem) => (
          <div className="flex items-center gap-3 rounded-md border border-[#ebe5dc] bg-[#fffdf9] px-3 py-2 shadow-[0_8px_24px_rgba(31,35,30,0.03)]" key={problem}>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#f3e4e2] text-[#9a4f47]">
              <X aria-hidden className="h-3.5 w-3.5 stroke-[2.4]" />
            </span>
            <span className="text-sm font-medium leading-5 text-[#555c57]">{problem}</span>
          </div>
        ))}
        <div className="rounded-md border border-[#dce7de] bg-[#eef7ef] p-5">
          <h3 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">{t("solutionTitle")}</h3>
          <p className="mt-2 text-sm leading-6 text-[#526c56]">{t("solutionSummary")}</p>
        </div>
      </div>
    </section>
  );
}

function LandingFeatures() {
  const t = useTranslations("landing");
  const features: LandingFeaturePreview[] = [
    {
      accent: "sage",
      id: "calendar",
      marker: "CAL",
      preview: {
        days: [
          t("previewCalendarDayMon"),
          t("previewCalendarDayTue"),
          t("previewCalendarDayWed"),
          t("previewCalendarDayThu"),
          t("previewCalendarDayFri"),
          t("previewCalendarDaySat"),
          t("previewCalendarDaySun"),
        ],
        events: [
          { day: "10", title: t("previewCalendarEventBins"), tone: "sage" },
          { day: "12", title: t("previewCalendarEventSchool"), tone: "sun" },
          { day: "17", title: t("previewCalendarEventDinner"), tone: "rose" },
        ],
        kind: "calendar",
        upcoming: [
          { day: t("previewCalendarUpcomingDayToday"), detail: t("previewCalendarUpcomingMetaToday"), title: t("previewCalendarUpcomingTitleToday") },
          { day: t("previewCalendarUpcomingDayThu"), detail: t("previewCalendarUpcomingMetaThu"), title: t("previewCalendarUpcomingTitleThu") },
          { day: t("previewCalendarUpcomingDaySat"), detail: t("previewCalendarUpcomingMetaSat"), title: t("previewCalendarUpcomingTitleSat") },
        ],
        upcomingLabel: t("previewCalendarUpcomingLabel"),
      },
      screenSummary: t("screenCalendarSummary"),
      screenTitle: t("screenCalendarTitle"),
      summary: t("featureCalendarSummary"),
      title: t("featureCalendarTitle"),
    },
    {
      accent: "rose",
      id: "todos",
      marker: "DO",
      preview: {
        kind: "todos",
        sections: [
          {
            items: [
              { label: t("previewTodosItemBoiler"), meta: t("previewTodosMetaBoiler") },
              { label: t("previewTodosItemGift"), meta: t("previewTodosMetaGift") },
            ],
            title: t("previewTodosSectionOpen"),
            tone: "rose",
          },
          {
            items: [
              { label: t("previewTodosItemPermission"), meta: t("previewTodosMetaPermission") },
              { done: true, label: t("previewTodosItemLadder"), meta: t("previewTodosMetaLadder") },
            ],
            title: t("previewTodosSectionDone"),
            tone: "sage",
          },
        ],
      },
      screenSummary: t("screenTodosSummary"),
      screenTitle: t("screenTodosTitle"),
      summary: t("featureTodosSummary"),
      title: t("featureTodosTitle"),
    },
    {
      accent: "sun",
      id: "shopping",
      marker: "SHOP",
      preview: {
        groups: [
          {
            items: [
              { label: t("previewShoppingItemApples"), qty: t("previewShoppingQtySix") },
              { label: t("previewShoppingItemYogurt"), qty: t("previewShoppingQtyTwo") },
              { checked: true, label: t("previewShoppingItemBread"), qty: t("previewShoppingQtyOne") },
            ],
            title: t("previewShoppingGroupThisWeek"),
          },
          {
            items: [
              { label: t("previewShoppingItemOliveOil"), qty: t("previewShoppingQtyOne") },
              { checked: true, label: t("previewShoppingItemLaundry"), qty: t("previewShoppingQtyOne") },
              { label: t("previewShoppingItemCoffee"), qty: t("previewShoppingQtyTwo") },
            ],
            title: t("previewShoppingGroupTopUps"),
          },
        ],
        kind: "shopping",
      },
      screenSummary: t("screenShoppingSummary"),
      screenTitle: t("screenShoppingTitle"),
      summary: t("featureShoppingSummary"),
      title: t("featureShoppingTitle"),
    },
    {
      accent: "sun",
      id: "notes",
      marker: "NOTE",
      preview: {
        cards: [
          { meta: t("previewNotesMetaPinned"), snippet: t("previewNotesSnippetWifi"), title: t("previewNotesTitleWifi") },
          { accent: true, meta: t("previewNotesMetaUpdatedToday"), snippet: t("previewNotesSnippetTrip"), title: t("previewNotesTitleTrip") },
          { meta: t("previewNotesMetaSaved"), snippet: t("previewNotesSnippetVet"), title: t("previewNotesTitleVet") },
        ],
        kind: "notes",
        pinnedLabel: t("previewNotesPinnedLabel"),
      },
      screenSummary: t("screenNotesSummary"),
      screenTitle: t("screenNotesTitle"),
      summary: t("featureNotesSummary"),
      title: t("featureNotesTitle"),
    },
    {
      accent: "rose",
      id: "expenses",
      marker: "EUR",
      preview: {
        entries: [
          { amount: t("previewExpensesAmountGroceries"), label: t("previewExpensesLabelGroceries"), meta: t("previewExpensesMetaGroceries"), tone: "rose" },
          { amount: t("previewExpensesAmountRepair"), label: t("previewExpensesLabelRepair"), meta: t("previewExpensesMetaRepair"), tone: "stone" },
          { amount: t("previewExpensesAmountSplit"), label: t("previewExpensesLabelSplit"), meta: t("previewExpensesMetaSplit"), tone: "sage" },
        ],
        kind: "expenses",
        recentLabel: t("previewExpensesRecentLabel"),
        summaryAmount: t("previewExpensesSummaryAmount"),
        summaryLabel: t("previewExpensesSummaryLabel"),
        summaryNote: t("previewExpensesSummaryNote"),
      },
      screenSummary: t("screenExpensesSummary"),
      screenTitle: t("screenExpensesTitle"),
      summary: t("featureExpensesSummary"),
      title: t("featureExpensesTitle"),
    },
    {
      accent: "moss",
      id: "chores",
      marker: "JOB",
      preview: {
        kind: "chores",
        sections: [
          {
            items: [
              { assignee: t("previewChoresAssigneeMaja"), cadence: t("previewChoresCadenceWeekly"), label: t("previewChoresItemBathrooms"), state: t("previewChoresStateTomorrow") },
              { assignee: t("previewChoresAssigneeLuka"), cadence: t("previewChoresCadenceDaily"), label: t("previewChoresItemKitchen"), state: t("previewChoresStateToday") },
            ],
            title: t("previewChoresSectionNextUp"),
          },
          {
            items: [
              { assignee: t("previewChoresAssigneeAna"), cadence: t("previewChoresCadenceRotation"), done: true, label: t("previewChoresItemBins"), state: t("previewChoresStateDone") },
            ],
            title: t("previewChoresSectionDone"),
          },
        ],
      },
      screenSummary: t("screenChoresSummary"),
      screenTitle: t("screenChoresTitle"),
      summary: t("featureChoresSummary"),
      title: t("featureChoresTitle"),
    },
  ];

  return (
    <section className="mt-10 sm:mt-12">
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#545b57]">
            {t("whatsInside")}
          </p>
          <h2 className="mt-3 font-serif text-3xl font-semibold tracking-normal text-[#171a18]">{t("previewTitle")}</h2>
        </div>
        <p className="max-w-sm text-sm leading-6 text-[#686e6a]">{t("previewSummary")}</p>
      </div>
      <ProductShowcase features={features} screenLabel={t("previewScreenLabel")} />
    </section>
  );
}

function LandingFaq() {
  const t = useTranslations("landing");
  const faqs = FAQ_KEY_PAIRS.map(([questionKey, answerKey]) => ({
    answer: t(answerKey),
    question: t(questionKey),
  }));

  return (
    <section className="mx-auto mt-10 max-w-[940px] sm:mt-14">
      <div className="mb-5">
        <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#545b57]">{t("faqEyebrow")}</p>
        <h2 className="mt-3 font-serif text-3xl font-semibold tracking-normal text-[#171a18] sm:text-4xl">
          {t("faqTitle")}
        </h2>
      </div>
      <div className="grid gap-3">
        {faqs.map((faq, index) => (
          <details
            className="group rounded-md border border-[#e7e0d6] bg-[#fffdf9] shadow-[0_8px_24px_rgba(31,35,30,0.035)] open:border-[#d6e1d8]"
            key={faq.question}
            open={index === 0}
          >
            <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 font-serif text-lg font-semibold tracking-normal text-[#171a18] marker:hidden">
              {faq.question}
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#ded8ce] bg-[#f7f3ea] text-sm font-sans text-[#6b716d] transition group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="max-w-3xl px-4 pb-4 text-sm leading-6 text-[#686e6a]">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function LandingBottomCta({ hasSession }: { hasSession: boolean }) {
  const t = useTranslations("landing");
  const tc = useTranslations("common");

  return (
    <section className="mx-auto mt-10 max-w-[940px] rounded-md border border-[#dce7de] bg-[#eef7ef] px-5 py-10 text-center shadow-[0_14px_34px_rgba(31,35,30,0.06)] sm:mt-12 sm:px-8 sm:py-12">
      <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#526c56]">{t("socialProof")}</p>
      <h2 className="mt-4 font-serif text-3xl font-semibold tracking-normal text-[#171a18] sm:text-4xl">
        {t("bottomCtaTitle")}
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#526c56]">{t("bottomCtaSummary")}</p>
      <div className="mt-6 flex justify-center">
        <Link
          className="inline-flex h-11 items-center justify-center rounded-md border border-[#a8beb0] bg-[#fffdf9] px-6 text-sm font-semibold text-[#526c56] transition hover:bg-white"
          href={hasSession ? "/app" : "/login"}
        >
          {hasSession ? tc("openDomek") : tc("startHousehold")}
        </Link>
      </div>
    </section>
  );
}
