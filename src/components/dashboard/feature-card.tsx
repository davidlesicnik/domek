type FeatureCardProps = Readonly<{
  id: string;
  title: string;
  summary: string;
  status: string;
}>;

export function FeatureCard({ id, title, summary, status }: FeatureCardProps) {
  return (
    <article
      className="min-h-52 rounded-md border border-[#d7dce2] bg-[#ffffff] p-5"
      id={id}
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-xl font-semibold tracking-normal text-[#161616]">{title}</h3>
        <span className="rounded-md bg-[#e0f2fe] px-2.5 py-1 text-xs font-semibold uppercase tracking-normal text-[#075985]">
          {status}
        </span>
      </div>
      <p className="mt-4 text-sm leading-6 text-[#4b5563]">{summary}</p>
    </article>
  );
}
