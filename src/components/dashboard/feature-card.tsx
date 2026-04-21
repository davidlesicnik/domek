import type { ReactNode } from "react";

type FeatureCardProps = Readonly<{
  accent: string;
  id: string;
  marker: string;
  icon?: ReactNode;
  title: string;
  summary: string;
  status?: string;
}>;

const cardStyles: Record<string, { border: string; marker: string }> = {
  moss: {
    border: "border-t-[#a99f7f]",
    marker: "bg-[#ebe8de] text-[#635d46]",
  },
  rose: {
    border: "border-t-[#ddaea9]",
    marker: "bg-[#f3e4e2] text-[#8d4c45]",
  },
  sage: {
    border: "border-t-[#a8beb0]",
    marker: "bg-[#e8efe9] text-[#536e5a]",
  },
  sun: {
    border: "border-t-[#dccd79]",
    marker: "bg-[#f4edc5] text-[#74651e]",
  },
};

export function FeatureCard({ accent, id, marker, icon, title, summary, status }: FeatureCardProps) {
  const styles = cardStyles[accent] ?? cardStyles.sage;

  return (
    <article
      className={`min-h-48 rounded-md border border-[#ece7de] border-t-[1.5px] bg-[#fffdf9] p-6 shadow-[0_8px_30px_rgba(31,35,30,0.04)] ${styles.border}`}
      id={id}
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <span
          className={`inline-flex h-10 w-10 items-center justify-center rounded-md ${styles.marker}`}
        >
          {icon ?? <span className="text-[10px] font-bold uppercase tracking-normal">{marker}</span>}
        </span>
        {status ? (
          <span className="rounded-full border border-[#e1d8a5] bg-[#faf5dc] px-4 py-1 text-[10px] font-semibold uppercase tracking-normal text-[#6d6440]">
            {status}
          </span>
        ) : null}
      </div>
      <h3 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-[#686e6a]">{summary}</p>
    </article>
  );
}
