"use client";

import { Banknote, BrushCleaning, CalendarDays, CheckCircle2, ListTodo, NotebookPen, ShoppingCart } from "lucide-react";
import { useState, type ComponentType } from "react";

export type LandingFeatureId = "calendar" | "todos" | "shopping" | "notes" | "expenses" | "chores";

type CalendarPreview = Readonly<{
  kind: "calendar";
  days: string[];
  events: { day: string; title: string; tone: "rose" | "sage" | "sun" }[];
  upcomingLabel: string;
  upcoming: { day: string; detail: string; title: string }[];
}>;

type TodosPreview = Readonly<{
  kind: "todos";
  sections: {
    title: string;
    tone: "rose" | "sage" | "sun";
    items: { done?: boolean; label: string; meta: string }[];
  }[];
}>;

type ShoppingPreview = Readonly<{
  kind: "shopping";
  groups: {
    title: string;
    items: { checked?: boolean; label: string; qty: string }[];
  }[];
}>;

type NotesPreview = Readonly<{
  kind: "notes";
  cards: { accent?: boolean; meta: string; snippet: string; title: string }[];
  pinnedLabel: string;
}>;

type ExpensesPreview = Readonly<{
  kind: "expenses";
  entries: { amount: string; label: string; meta: string; tone: "rose" | "sage" | "stone" }[];
  recentLabel: string;
  summaryAmount: string;
  summaryLabel: string;
  summaryNote: string;
}>;

type ChoresPreview = Readonly<{
  kind: "chores";
  sections: {
    title: string;
    items: { assignee: string; cadence: string; done?: boolean; label: string; state: string }[];
  }[];
}>;

export type LandingFeaturePreviewData =
  | CalendarPreview
  | TodosPreview
  | ShoppingPreview
  | NotesPreview
  | ExpensesPreview
  | ChoresPreview;

export type LandingFeaturePreview = Readonly<{
  accent: "moss" | "rose" | "sage" | "sun";
  id: LandingFeatureId;
  marker: string;
  preview: LandingFeaturePreviewData;
  screenSummary: string;
  screenTitle: string;
  summary: string;
  title: string;
}>;

type ProductShowcaseProps = Readonly<{
  features: LandingFeaturePreview[];
  screenLabel: string;
}>;

const accentStyles: Record<LandingFeaturePreview["accent"], { active: string; border: string; icon: string; pill: string }> = {
  moss: {
    active: "border-[#b9ad82] bg-[#fffdf8]",
    border: "border-t-[#a99f7f]",
    icon: "bg-[#ebe8de] text-[#635d46]",
    pill: "border-[#dad1b8] bg-[#f6f1e4] text-[#6f6240]",
  },
  rose: {
    active: "border-[#dfbbb7] bg-[#fffafa]",
    border: "border-t-[#ddaea9]",
    icon: "bg-[#f3e4e2] text-[#8d4c45]",
    pill: "border-[#ead0cb] bg-[#fbefeb] text-[#8d4c45]",
  },
  sage: {
    active: "border-[#adc5b5] bg-[#fbfffb]",
    border: "border-t-[#a8beb0]",
    icon: "bg-[#e8efe9] text-[#536e5a]",
    pill: "border-[#cfe0d2] bg-[#eef6ef] text-[#45614c]",
  },
  sun: {
    active: "border-[#dfcf83] bg-[#fffdf2]",
    border: "border-t-[#dccd79]",
    icon: "bg-[#f4edc5] text-[#74651e]",
    pill: "border-[#e4d899] bg-[#fbf4cf] text-[#64571f]",
  },
};

const toneStyles: Record<"rose" | "sage" | "stone" | "sun", { dot: string; pill: string; surface: string }> = {
  rose: {
    dot: "bg-[#dba49d]",
    pill: "border-[#ead0cb] bg-[#fbefeb] text-[#8d4c45]",
    surface: "bg-[#fbf2ef]",
  },
  sage: {
    dot: "bg-[#9fb8a7]",
    pill: "border-[#cfe0d2] bg-[#eef6ef] text-[#45614c]",
    surface: "bg-[#f2f7f3]",
  },
  stone: {
    dot: "bg-[#d7d0c3]",
    pill: "border-[#e7e0d6] bg-[#f8f5ee] text-[#6a706c]",
    surface: "bg-[#f7f4ec]",
  },
  sun: {
    dot: "bg-[#dccd79]",
    pill: "border-[#e4d899] bg-[#fbf4cf] text-[#64571f]",
    surface: "bg-[#faf6e5]",
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

      {activeFeature ? <ProductScreen feature={activeFeature} screenLabel={screenLabel} /> : null}
    </div>
  );
}

function ProductScreen({ feature, screenLabel }: Readonly<{ feature: LandingFeaturePreview; screenLabel: string }>) {
  const styles = accentStyles[feature.accent];

  return (
    <div
      aria-label={screenLabel}
      className="max-w-full overflow-hidden rounded-md border border-[#ddd7cd] bg-[#fffdf9] shadow-[0_16px_34px_rgba(31,35,30,0.08)] transition sm:shadow-[0_22px_54px_rgba(31,35,30,0.10)]"
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#6d746f]">{screenLabel}</p>
            <h3 className="mt-2 font-serif text-2xl font-semibold tracking-normal text-[#171a18] sm:text-3xl">{feature.screenTitle}</h3>
            <p className="mt-2 max-w-lg text-sm leading-6 text-[#68706b]">{feature.screenSummary}</p>
          </div>
          <span className={`hidden h-11 shrink-0 items-center rounded-md border px-3 text-xs font-semibold uppercase tracking-normal sm:inline-flex ${styles.pill}`}>
            {feature.title}
          </span>
        </div>

        <ScreenBody feature={feature} />
      </div>
    </div>
  );
}

function ScreenBody({ feature }: Readonly<{ feature: LandingFeaturePreview }>) {
  switch (feature.preview.kind) {
    case "calendar":
      return <CalendarScreen preview={feature.preview} />;
    case "todos":
      return <TodosScreen preview={feature.preview} />;
    case "shopping":
      return <ShoppingScreen preview={feature.preview} />;
    case "notes":
      return <NotesScreen preview={feature.preview} />;
    case "expenses":
      return <ExpensesScreen preview={feature.preview} />;
    case "chores":
      return <ChoresScreen preview={feature.preview} />;
    default:
      return null;
  }
}

function CalendarScreen({ preview }: Readonly<{ preview: CalendarPreview }>) {
  return (
    <div className="grid gap-3 md:grid-cols-[1.35fr_0.65fr]">
      <div className="rounded-md border border-[#e7e0d6] bg-white p-3 sm:p-4">
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-normal text-[#8a8f8b]">
          {preview.days.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1.5">
          {Array.from({ length: 14 }, (_, index) => {
            const event = preview.events.find((item) => Number(item.day) === index + 8);
            const tone = event ? toneStyles[event.tone] : null;
            return (
              <div className={`min-h-[4.5rem] rounded-md border border-[#f0ebe2] p-1.5 ${event ? tone?.surface : "bg-[#fbfaf6]"}`} key={index}>
                <div className="text-[11px] font-medium text-[#717874]">{index + 8}</div>
                {event ? (
                  <div className="mt-6 flex items-center gap-1">
                    <span className={`h-2.5 w-2.5 rounded-full ${tone?.dot}`} />
                    <span className={`h-1.5 w-6 rounded-full ${tone?.dot}`} />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      <div className="rounded-md border border-[#e7e0d6] bg-[#fbfaf6] p-3 sm:p-4">
        <p className="text-[11px] font-semibold uppercase tracking-normal text-[#8a8f8b]">{preview.upcomingLabel}</p>
        <div className="mt-3 grid gap-2.5">
          {preview.upcoming.map((item) => (
            <div className="rounded-md border border-[#ebe5dc] bg-white px-3 py-2.5" key={`${item.day}-${item.title}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#202321]">{item.title}</p>
                  <p className="mt-1 text-xs text-[#7b817c]">{item.detail}</p>
                </div>
                <span className="rounded-md border border-[#dde2dc] bg-[#f7f9f6] px-2 py-1 text-[10px] font-semibold uppercase tracking-normal text-[#6b736d]">
                  {item.day}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TodosScreen({ preview }: Readonly<{ preview: TodosPreview }>) {
  return (
    <div className="grid gap-3">
      {preview.sections.map((section) => (
        <div className="rounded-md border border-[#e7e0d6] bg-white p-3 sm:p-4" key={section.title}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-normal text-[#8a8f8b]">{section.title}</p>
            <span className={`h-2.5 w-2.5 rounded-full ${toneStyles[section.tone].dot}`} />
          </div>
          <div className="mt-3 grid gap-2">
            {section.items.map((item) => (
              <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md border border-[#ebe5dc] bg-[#fbfaf6] px-3 py-2.5" key={`${section.title}-${item.label}`}>
                <span className={`flex h-5 w-5 items-center justify-center rounded-md border ${item.done ? "border-[#cfe0d2] bg-[#eef6ef] text-[#45614c]" : "border-[#d8d2c8] bg-white text-[#9da39f]"}`}>
                  {item.done ? <CheckCircle2 aria-hidden className="h-3.5 w-3.5" /> : null}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[#59605b]">{item.label}</p>
                  <p className="mt-0.5 text-xs text-[#8a8f8b]">{item.meta}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-normal ${toneStyles[section.tone].pill}`}>
                  {section.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ShoppingScreen({ preview }: Readonly<{ preview: ShoppingPreview }>) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {preview.groups.map((group, groupIndex) => (
        <div className="rounded-md border border-[#e7e0d6] bg-white p-3 sm:p-4" key={group.title}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-normal text-[#8a8f8b]">{group.title}</p>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-normal ${groupIndex === 0 ? toneStyles.sun.pill : toneStyles.sage.pill}`}>
              {group.items.length}
            </span>
          </div>
          <div className="mt-3 grid gap-2">
            {group.items.map((item) => (
              <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md border border-[#ebe5dc] bg-[#fbfaf6] px-3 py-2.5" key={`${group.title}-${item.label}`}>
                <span className={`flex h-5 w-5 items-center justify-center rounded-md border ${item.checked ? "border-[#cfe0d2] bg-[#eef6ef] text-[#45614c]" : "border-[#d8d2c8] bg-white text-[#9da39f]"}`}>
                  {item.checked ? <CheckCircle2 aria-hidden className="h-3.5 w-3.5" /> : null}
                </span>
                <span className={`min-w-0 truncate text-sm font-medium ${item.checked ? "text-[#9da39f] line-through" : "text-[#59605b]"}`}>{item.label}</span>
                <span className="rounded-md border border-[#e7e0d6] bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-normal text-[#707773]">
                  {item.qty}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function NotesScreen({ preview }: Readonly<{ preview: NotesPreview }>) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-md border border-[#e7e0d6] bg-[#fbfaf6] p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-normal text-[#8a8f8b]">{preview.pinnedLabel}</p>
          <span className="rounded-full border border-[#e4d899] bg-[#fbf4cf] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-normal text-[#64571f]">
            1
          </span>
        </div>
        <div className="mt-3 rounded-md border border-[#e7e0d6] bg-white p-4">
          <p className="text-sm font-semibold text-[#202321]">{preview.cards[0]?.title}</p>
          <p className="mt-2 text-sm leading-6 text-[#686e6a]">{preview.cards[0]?.snippet}</p>
          <p className="mt-3 text-xs text-[#8a8f8b]">{preview.cards[0]?.meta}</p>
        </div>
      </div>
      <div className="grid gap-3">
        {preview.cards.slice(1).map((card) => (
          <div className={`rounded-md border border-[#e7e0d6] p-4 ${card.accent ? "bg-[#fffaf1]" : "bg-white"}`} key={card.title}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[#202321]">{card.title}</p>
              <span className="text-[10px] font-semibold uppercase tracking-normal text-[#8a8f8b]">{card.meta}</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-[#686e6a]">{card.snippet}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExpensesScreen({ preview }: Readonly<{ preview: ExpensesPreview }>) {
  const widths = [72, 54, 36];

  return (
    <div className="grid gap-3 md:grid-cols-[0.92fr_1.08fr]">
      <div className="rounded-md border border-[#e7e0d6] bg-white p-4">
        <p className="text-[11px] font-semibold uppercase tracking-normal text-[#8a8f8b]">{preview.summaryLabel}</p>
        <p className="mt-2 font-serif text-3xl font-semibold leading-none text-[#171a18]">{preview.summaryAmount}</p>
        <p className="mt-2 text-sm leading-6 text-[#6a706c]">{preview.summaryNote}</p>
        <div className="mt-4 grid gap-2.5">
          {preview.entries.slice(0, 3).map((entry, index) => (
            <div key={entry.label}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-[#59605b]">{entry.label}</p>
                <span className="text-xs font-semibold text-[#7b817c]">{entry.amount}</span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-[#eee8dd]">
                <span className={`block h-full rounded-full ${toneStyles[entry.tone].dot}`} style={{ width: `${widths[index]}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-md border border-[#e7e0d6] bg-[#fbfaf6] p-3 sm:p-4">
        <p className="text-[11px] font-semibold uppercase tracking-normal text-[#8a8f8b]">{preview.recentLabel}</p>
        <div className="mt-3 grid gap-2">
          {preview.entries.map((entry) => (
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md border border-[#ebe5dc] bg-white px-3 py-2.5" key={`${entry.label}-${entry.amount}`}>
              <span className={`h-2.5 w-2.5 rounded-full ${toneStyles[entry.tone].dot}`} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#59605b]">{entry.label}</p>
                <p className="mt-0.5 text-xs text-[#8a8f8b]">{entry.meta}</p>
              </div>
              <span className={`text-sm font-semibold ${entry.tone === "rose" ? "text-[#8d3028]" : "text-[#2d4f34]"}`}>{entry.amount}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChoresScreen({ preview }: Readonly<{ preview: ChoresPreview }>) {
  return (
    <div className="grid gap-3">
      {preview.sections.map((section, sectionIndex) => (
        <div className="rounded-md border border-[#e7e0d6] bg-white p-3 sm:p-4" key={section.title}>
          <p className="text-[11px] font-semibold uppercase tracking-normal text-[#8a8f8b]">{section.title}</p>
          <div className="mt-3 grid gap-2">
            {section.items.map((item) => (
              <div className="grid grid-cols-[1fr_auto] gap-3 rounded-md border border-[#ebe5dc] bg-[#fbfaf6] px-3 py-2.5" key={`${section.title}-${item.label}`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${item.done ? "border-[#cfe0d2] bg-[#eef6ef] text-[#45614c]" : "border-[#d8d2c8] bg-white text-[#9da39f]"}`}>
                      {item.done ? <CheckCircle2 aria-hidden className="h-3.5 w-3.5" /> : null}
                    </span>
                    <p className="truncate text-sm font-medium text-[#59605b]">{item.label}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 pl-7">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-normal ${sectionIndex === 0 ? accentStyles.moss.pill : toneStyles.sage.pill}`}>
                      {item.assignee}
                    </span>
                    <span className="rounded-full border border-[#e7e0d6] bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-normal text-[#6a706c]">
                      {item.cadence}
                    </span>
                  </div>
                </div>
                <span className={`self-start rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-normal ${item.done ? toneStyles.sage.pill : toneStyles.sun.pill}`}>
                  {item.state}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
