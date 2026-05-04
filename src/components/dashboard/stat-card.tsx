type StatCardProps = Readonly<{
  accent: string;
  count?: string | null;
  detail: string;
  emphasis?: "soft" | "strong";
  label: string;
  value?: string | null;
}>;

const statStyles: Record<string, string> = {
  rose: "border-[var(--accent-rose-border)] bg-[var(--accent-rose-soft)]",
  sage: "border-[var(--accent-sage-border)] bg-[var(--accent-sage-surface)]",
  sun: "border-[var(--accent-sun-border)] bg-[var(--accent-sun-surface)]",
};

export function StatCard({
  accent,
  count = null,
  detail,
  emphasis = "soft",
  label,
  value = null,
}: StatCardProps) {
  const style = statStyles[accent] ?? statStyles.sage;
  const emphasisClass =
    emphasis === "strong"
      ? "shadow-[var(--shadow-soft)] ring-1 ring-inset ring-white/10"
      : "";
  const displayValue = value ?? count;

  return (
    <div className={`rounded-md border p-3 sm:p-5 ${style} ${emphasisClass}`}>
      <p className="text-[10px] font-bold uppercase tracking-normal text-[var(--text-muted)] sm:text-[11px]">
        {label}
      </p>
      {displayValue ? (
        <p className="mt-2 flex items-baseline gap-1">
          <span className="font-serif text-3xl font-semibold leading-none text-[var(--text-strong)] sm:text-4xl">
            {displayValue}
          </span>
          <span className="text-[10px] font-medium leading-none text-[var(--text-muted)] sm:text-[11px]">
            {detail}
          </span>
        </p>
      ) : (
        <p className="mt-3 text-xs text-[var(--text-muted)] sm:text-sm">{detail}</p>
      )}
    </div>
  );
}
