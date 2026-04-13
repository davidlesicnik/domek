type FeatureCardProps = Readonly<{
  accent: string;
  id: string;
  marker: string;
  title: string;
  summary: string;
  status: string;
}>;

const cardStyles: Record<string, { border: string; marker: string }> = {
  moss: {
    border: "border-t-[#9a8f6a]",
    marker: "bg-[#ebe8de] text-[#635d46]",
  },
  rose: {
    border: "border-t-[#d19a95]",
    marker: "bg-[#f3e4e2] text-[#8d4c45]",
  },
  sage: {
    border: "border-t-[#9bb6a4]",
    marker: "bg-[#e8efe9] text-[#536e5a]",
  },
  sun: {
    border: "border-t-[#d4bf50]",
    marker: "bg-[#f4edc5] text-[#74651e]",
  },
};

export function FeatureCard({ accent, id, marker, title, summary, status }: FeatureCardProps) {
  const styles = cardStyles[accent] ?? cardStyles.sage;

  return (
    <article
      className={`min-h-48 rounded-md border border-t-2 border-[#e0dcd4] bg-[#fffdf8] p-6 shadow-[0_12px_28px_rgba(31,35,30,0.08)] ${styles.border}`}
      id={id}
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <span
          className={`inline-flex h-10 min-w-10 items-center justify-center rounded-md px-2 text-[10px] font-bold uppercase tracking-normal ${styles.marker}`}
        >
          {marker}
        </span>
        <span className="rounded-full border border-[#d4bf50] bg-[#fbf2b9] px-4 py-1 text-[10px] font-semibold uppercase tracking-normal text-[#5f5318]">
          {status}
        </span>
      </div>
      <h3 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-[#686e6a]">{summary}</p>
    </article>
  );
}
