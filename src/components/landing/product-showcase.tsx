"use client";

import { Banknote, BrushCleaning, CalendarDays, CheckCircle2, ListTodo, NotebookPen, ShoppingCart } from "lucide-react";
import { useState, type ComponentType } from "react";

export type LandingFeatureId = "calendar" | "todos" | "shopping" | "notes" | "expenses" | "chores";

export type LandingFeaturePreview = Readonly<{
  accent: "moss" | "rose" | "sage" | "sun";
  id: LandingFeatureId;
  marker: string;
  title: string;
  summary: string;
  screenTitle: string;
  screenSummary: string;
  primaryMetric: string;
  secondaryMetric: string;
  tertiaryMetric: string;
}>;

type ProductShowcaseProps = Readonly<{
  features: LandingFeaturePreview[];
  screenLabel: string;
}>;

const accentStyles: Record<LandingFeaturePreview["accent"], { border: string; icon: string; active: string; bar: string }> = {
  moss: {
    active: "border-[#b9ad82] bg-[#fffdf8]",
    bar: "bg-[#b9ad82]",
    border: "border-t-[#a99f7f]",
    icon: "bg-[#ebe8de] text-[#635d46]",
  },
  rose: {
    active: "border-[#dfbbb7] bg-[#fffafa]",
    bar: "bg-[#ddaea9]",
    border: "border-t-[#ddaea9]",
    icon: "bg-[#f3e4e2] text-[#8d4c45]",
  },
  sage: {
    active: "border-[#adc5b5] bg-[#fbfffb]",
    bar: "bg-[#a8beb0]",
    border: "border-t-[#a8beb0]",
    icon: "bg-[#e8efe9] text-[#536e5a]",
  },
  sun: {
    active: "border-[#dfcf83] bg-[#fffdf2]",
    bar: "bg-[#dccd79]",
    border: "border-t-[#dccd79]",
    icon: "bg-[#f4edc5] text-[#74651e]",
  },
};

const icons: Record<LandingFeatureId, ComponentType<{ className?: string }>> = {
  calendar: CalendarDays,
  chores: BrushCleaning,
  expenses: Banknote,
  notes: NotebookPen,
  shopping: ShoppingCart,
  todos: ListTodo,
};

export function ProductShowcase({ features, screenLabel }: ProductShowcaseProps) {
  const [activeId, setActiveId] = useState<LandingFeatureId>(features[0]?.id ?? "calendar");
  const activeFeature = features.find((feature) => feature.id === activeId) ?? features[0];

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)] lg:items-start lg:gap-6">
      <div className="sticky top-0 z-20 -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto border-y border-[#e6dfd4] bg-[#f8f6f1]/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:grid lg:gap-3 lg:overflow-visible lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none xl:grid-cols-2">
        {features.map((feature) => {
          const Icon = icons[feature.id];
          const styles = accentStyles[feature.accent];
          const isActive = feature.id === activeFeature.id;

          return (
            <button
              aria-pressed={isActive}
              className={`group min-h-0 w-[78vw] max-w-[20rem] shrink-0 snap-start rounded-md border border-[#ece7de] border-t-[1.5px] bg-[#fffdf9] p-4 text-left shadow-[0_8px_30px_rgba(31,35,30,0.04)] transition hover:-translate-y-0.5 hover:border-[#d9d0c2] hover:shadow-[0_12px_34px_rgba(31,35,30,0.07)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8fa998] lg:min-h-44 lg:w-auto lg:max-w-none lg:p-5 ${styles.border} ${isActive ? styles.active : ""}`}
              key={feature.id}
              onClick={() => setActiveId(feature.id)}
              onFocus={() => setActiveId(feature.id)}
              onMouseEnter={() => setActiveId(feature.id)}
              type="button"
            >
              <span className="mb-3 flex items-center justify-between gap-4 lg:mb-4">
                <span className={`inline-flex h-9 w-9 items-center justify-center rounded-md lg:h-10 lg:w-10 ${styles.icon}`}>
                  <Icon aria-hidden className="h-4 w-4 lg:h-5 lg:w-5" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-normal text-[#9b958b]">{feature.marker}</span>
              </span>
              <span className="block font-serif text-lg font-semibold tracking-normal text-[#171a18] lg:text-xl">{feature.title}</span>
              <span className="mt-2 block max-h-12 overflow-hidden text-sm leading-6 text-[#686e6a] lg:mt-3 lg:max-h-none">{feature.summary}</span>
            </button>
          );
        })}
      </div>

      <ProductScreen feature={activeFeature} screenLabel={screenLabel} />
    </div>
  );
}

function ProductScreen({ feature, screenLabel }: Readonly<{ feature: LandingFeaturePreview; screenLabel: string }>) {
  const styles = accentStyles[feature.accent];

  return (
    <div
      aria-label={screenLabel}
      className="max-w-full overflow-hidden rounded-md border border-[#ddd7cd] bg-[#fffdf9] shadow-[0_16px_34px_rgba(31,35,30,0.08)] sm:shadow-[0_22px_54px_rgba(31,35,30,0.10)]"
      role="img"
    >
      <div className="flex items-center justify-between border-b border-[#e8e2d8] bg-[#f7f3ea] px-4 py-3">
        <div className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-[#dfbbb7]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#dfcf83]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#adc5b5]" />
        </div>
        <span className="rounded-full border border-[#ded8ce] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-normal text-[#6b716d]">
          Domek
        </span>
      </div>
      <div className="grid gap-4 p-4 sm:gap-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#6d746f]">{screenLabel}</p>
            <h3 className="mt-2 font-serif text-2xl font-semibold tracking-normal text-[#171a18] sm:text-3xl">{feature.screenTitle}</h3>
            <p className="mt-2 max-w-lg text-sm leading-6 text-[#68706b]">{feature.screenSummary}</p>
          </div>
          <span className={`hidden h-11 w-11 shrink-0 rounded-md ${styles.icon} items-center justify-center sm:flex`}>
            <CheckCircle2 aria-hidden className="h-5 w-5" />
          </span>
        </div>

        <div className="grid gap-3 min-[420px]:grid-cols-3">
          {[feature.primaryMetric, feature.secondaryMetric, feature.tertiaryMetric].map((metric, index) => (
            <div className="rounded-md border border-[#ebe5dc] bg-white p-3 sm:p-4" key={metric}>
              <p className="text-[11px] font-semibold uppercase tracking-normal text-[#8a8f8b]">{metric}</p>
              <div className="mt-3 flex items-end gap-2 sm:mt-4">
                <span className="font-serif text-2xl font-semibold leading-none text-[#171a18] sm:text-3xl">{index + 2}</span>
                <span className="mb-1 h-1.5 flex-1 rounded-full bg-[#e9e3d9]">
                  <span className={`block h-full rounded-full ${styles.bar}`} style={{ width: `${62 + index * 12}%` }} />
                </span>
              </div>
            </div>
          ))}
        </div>

        <ScreenBody feature={feature} styles={styles} />
      </div>
    </div>
  );
}

function ScreenBody({
  feature,
  styles,
}: Readonly<{
  feature: LandingFeaturePreview;
  styles: { bar: string; icon: string };
}>) {
  if (feature.id === "calendar") {
    return (
      <>
        <div className="grid gap-3 sm:hidden">
          {[feature.primaryMetric, feature.secondaryMetric, feature.tertiaryMetric].map((label, index) => (
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md border border-[#ebe5dc] bg-[#fffaf1] px-4 py-3" key={label}>
              <span className={`h-3 w-3 rounded-full ${index === 1 ? "bg-[#dfcf83]" : styles.bar}`} />
              <span className="min-w-0 text-sm font-medium text-[#59605b]">{label}</span>
              <span className="h-5 w-12 rounded-full bg-white" />
            </div>
          ))}
        </div>
        <div className="hidden grid-cols-7 gap-1.5 rounded-md border border-[#ebe5dc] bg-white p-3 sm:grid">
          {Array.from({ length: 28 }, (_, index) => (
            <span className="min-h-14 rounded-sm bg-[#f6f1e9] p-1.5" key={index}>
              <span className="block h-1.5 w-6 rounded-full bg-[#ded8cd]" />
              {[4, 9, 14, 17, 22, 25].includes(index) ? (
                <span className={`mt-5 block h-2 w-2 rounded-full ${styles.bar}`} />
              ) : null}
            </span>
          ))}
        </div>
      </>
    );
  }

  if (feature.id === "expenses") {
    return (
      <div className="grid gap-3 rounded-md border border-[#ebe5dc] bg-white p-4">
        {[72, 44, 58, 34].map((width, index) => (
          <div className="grid grid-cols-[4rem_1fr] items-center gap-3 sm:grid-cols-[5.5rem_1fr]" key={width}>
            <span className="h-2.5 rounded-full bg-[#ded8cd]" />
            <span className="h-5 rounded-full bg-[#f4f0e8]">
              <span
                className={`block h-full rounded-full ${index === 1 ? "bg-[#dfbbb7]" : styles.bar}`}
                style={{ width: `${width}%` }}
              />
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (feature.id === "notes") {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {[feature.primaryMetric, feature.secondaryMetric, feature.tertiaryMetric, feature.screenTitle].map((label, index) => (
          <div className="rounded-md border border-[#ebe5dc] bg-[#fffaf1] p-4" key={label}>
            <p className="text-xs font-semibold text-[#59605b]">{label}</p>
            <span className="mt-4 block h-2 rounded-full bg-[#ded8cd]" />
            <span className="mt-2 block h-2 w-3/4 rounded-full bg-[#e9e3d9]" />
            {index === 0 ? <span className={`mt-4 block h-1 rounded-full ${styles.bar}`} /> : null}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {[feature.primaryMetric, feature.secondaryMetric, feature.tertiaryMetric, feature.screenTitle].map((label, index) => (
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md border border-[#ebe5dc] bg-[#fffaf1] px-4 py-3" key={label}>
          <span className={`h-5 w-5 rounded-md ${index === 2 ? "bg-[#e9e3d9]" : styles.icon} flex items-center justify-center`}>
            {index === 2 ? null : <CheckCircle2 aria-hidden className="h-3.5 w-3.5" />}
          </span>
          <span className="min-w-0 text-sm font-medium text-[#59605b]">{label}</span>
          <span className={`h-2.5 w-16 rounded-full ${index === 0 ? styles.bar : "bg-[#ded8cd]"}`} />
        </div>
      ))}
    </div>
  );
}
