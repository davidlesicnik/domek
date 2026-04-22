type OnboardingTooltipProps = Readonly<{
  children: string;
  className?: string;
}>;

export function OnboardingTooltip({ children, className }: OnboardingTooltipProps) {
  return (
    <div className={className}>
      <div className="absolute left-[-6px] top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 border-b border-l border-[#e8dcc7] bg-[#f7efe2]" />
      <div
        className="relative whitespace-nowrap rounded-md border border-[#e8dcc7] bg-[#f7efe2] px-2.5 py-1.5 text-xs font-medium text-[#4a4f4b] shadow-[0_6px_16px_rgba(31,35,30,0.10)]"
        style={{ animation: "tooltip-float 2.6s ease-in-out infinite" }}
      >
        {children}
      </div>
    </div>
  );
}
