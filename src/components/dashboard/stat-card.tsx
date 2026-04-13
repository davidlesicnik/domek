type StatCardProps = Readonly<{
  label: string;
  value: string;
  detail: string;
}>;

export function StatCard({ label, value, detail }: StatCardProps) {
  return (
    <div className="rounded-md border border-[#d7dce2] bg-white p-4">
      <p className="text-sm font-medium text-[#0f766e]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[#161616]">{value}</p>
      <p className="mt-1 text-sm text-[#4b5563]">{detail}</p>
    </div>
  );
}
