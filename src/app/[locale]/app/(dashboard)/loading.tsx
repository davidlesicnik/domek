function SkeletonLine({ className = "" }: Readonly<{ className?: string }>) {
  return <div className={`animate-pulse rounded-md bg-[#e9e4da] ${className}`} />;
}

export default function Loading() {
  return (
    <section aria-busy="true" aria-label="Loading section" className="space-y-6">
      <div className="space-y-3">
        <SkeletonLine className="h-4 w-24 bg-[#dfe9e2]" />
        <SkeletonLine className="h-9 w-56 max-w-full" />
        <SkeletonLine className="h-4 w-full max-w-xl" />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SkeletonLine className="h-24 bg-[#edf3ed]" />
        <SkeletonLine className="h-24 bg-[#f2e8e4]" />
        <SkeletonLine className="h-24 bg-[#f1eddc]" />
      </div>

      <div className="space-y-3 rounded-md border border-[#e4dfd4] bg-[#fffdf8] p-4">
        <SkeletonLine className="h-4 w-32" />
        <SkeletonLine className="h-12 w-full" />
        <SkeletonLine className="h-12 w-full" />
        <SkeletonLine className="h-12 w-11/12" />
      </div>
    </section>
  );
}
