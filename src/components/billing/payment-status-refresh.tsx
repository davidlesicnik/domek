"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

type PaymentStatusRefreshProps = Readonly<{
  intervalMs?: number;
}>;

export function PaymentStatusRefresh({
  intervalMs = 3000,
}: PaymentStatusRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      router.refresh();
    }, intervalMs);

    return () => window.clearInterval(intervalId);
  }, [intervalMs, router]);

  return null;
}
