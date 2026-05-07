"use client";

import { useEffect, useState } from "react";

import { Link, useRouter } from "@/i18n/navigation";

type PaymentSuccessStatusProps = Readonly<{
  backHref: "/onboarding/payment";
  delayNote: string;
  fallbackBackLabel: string;
  fallbackDescription: string;
  fallbackRetryLabel: string;
  fallbackSupportLabel: string;
  fallbackSupportHref: string;
  intervalMs?: number;
  timeoutMs?: number;
}>;

export function PaymentSuccessStatus({
  backHref,
  delayNote,
  fallbackBackLabel,
  fallbackDescription,
  fallbackRetryLabel,
  fallbackSupportLabel,
  fallbackSupportHref,
  intervalMs = 3000,
  timeoutMs = 60000,
}: PaymentSuccessStatusProps) {
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      router.refresh();
    }, intervalMs);

    const timeoutId = window.setTimeout(() => {
      setTimedOut(true);
    }, timeoutMs);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [intervalMs, router, timeoutMs]);

  if (!timedOut) {
    return (
      <>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#d9d6ce] bg-[#f8f6f1]">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#c9d7ca] border-t-[#526c56]" />
        </div>
        <p className="mt-6 text-xs leading-5 text-[#9ea49f]">{delayNote}</p>
      </>
    );
  }

  return (
    <div className="mt-6 rounded-md border border-[#e5ddd1] bg-[#fff7ee] p-4 text-left">
      <p className="text-sm text-[#6c5a42]">{fallbackDescription}</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          className="h-9 rounded-md border border-[#d9d6ce] bg-[#fffdf8] px-3 text-xs font-semibold text-[#3c413e] transition hover:border-[#bfc9bd] hover:bg-[#f8f6f1]"
          onClick={() => router.refresh()}
          type="button"
        >
          {fallbackRetryLabel}
        </button>
        <Link
          className="inline-flex h-9 items-center rounded-md border border-[#d9d6ce] bg-[#fffdf8] px-3 text-xs font-semibold text-[#3c413e] transition hover:border-[#bfc9bd] hover:bg-[#f8f6f1]"
          href={backHref}
        >
          {fallbackBackLabel}
        </Link>
        <a
          className="inline-flex h-9 items-center rounded-md border border-[#d9d6ce] bg-[#fffdf8] px-3 text-xs font-semibold text-[#3c413e] transition hover:border-[#bfc9bd] hover:bg-[#f8f6f1]"
          href={fallbackSupportHref}
        >
          {fallbackSupportLabel}
        </a>
      </div>
    </div>
  );
}
