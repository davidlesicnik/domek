type OnboardingTooltipProps = Readonly<{
  children: string;
  className?: string;
}>;

export function OnboardingTooltip({ children, className }: OnboardingTooltipProps) {
  return (
    <div className={className}>
      <div className="absolute left-[-6px] top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 border-b border-l border-[var(--accent-sun-border)] bg-[var(--accent-sun-surface)]" />
      <div
        className="relative whitespace-nowrap rounded-md border border-[var(--accent-sun-border)] bg-[var(--accent-sun-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--accent-sun-text)] shadow-[var(--shadow-soft)]"
        style={{ animation: "tooltip-float 2.6s ease-in-out infinite" }}
      >
        {children}
      </div>
    </div>
  );
}
