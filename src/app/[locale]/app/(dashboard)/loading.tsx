function SkeletonLine({ className = "" }: Readonly<{ className?: string }>) {
  return (
    <div
      className={`animate-pulse rounded-md bg-[color:var(--surface-secondary)] ${className}`}
    />
  );
}

export default function Loading() {
  return (
    <section aria-busy="true" aria-label="Loading section" className="space-y-6">
      <div className="space-y-3">
        <SkeletonLine className="h-4 w-24 bg-[color:var(--accent-sage-surface)]" />
        <SkeletonLine className="h-9 w-56 max-w-full" />
        <SkeletonLine className="h-4 w-full max-w-xl" />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SkeletonLine className="h-24 bg-[color:var(--accent-sage-surface)]" />
        <SkeletonLine className="h-24 bg-[color:var(--accent-rose-soft)]" />
        <SkeletonLine className="h-24 bg-[color:var(--accent-sun-surface)]" />
      </div>

      <div className="space-y-3 rounded-md border border-[color:var(--border-default)] bg-[color:var(--surface-primary)] p-4 shadow-[var(--shadow-soft)]">
        <SkeletonLine className="h-4 w-32" />
        <SkeletonLine className="h-12 w-full" />
        <SkeletonLine className="h-12 w-full" />
        <SkeletonLine className="h-12 w-11/12" />
      </div>
    </section>
  );
}
