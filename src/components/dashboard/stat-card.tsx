type StatCardProps = Readonly<{
  accent: string;
  label: string;
  value: string;
  detail: string;
}>;

const statStyles: Record<string, string> = {
  rose: "border-[#d7aaa5] bg-[#f7ecea]",
  sage: "border-[#b7c8ba] bg-[#edf3ee]",
  sun: "border-[#d9c77b] bg-[#faf3d9]",
};

export function StatCard({ accent, label, value, detail }: StatCardProps) {
  const style = statStyles[accent] ?? statStyles.sage;

  return (
    <div className={`rounded-md border p-5 ${style}`}>
      <p className="text-[11px] font-bold uppercase tracking-normal text-[#6a5b52]">{label}</p>
      <p className="mt-2 font-serif text-4xl font-semibold leading-none text-[#171a18]">{value}</p>
      <p className="mt-2 text-sm text-[#5f6662]">{detail}</p>
    </div>
  );
}
