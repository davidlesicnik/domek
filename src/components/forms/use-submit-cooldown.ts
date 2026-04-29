"use client";

import { useEffect, useState } from "react";

function readCooldownUntil(storageKey: string): number {
  if (typeof window === "undefined") {
    return 0;
  }

  const rawValue = window.sessionStorage.getItem(storageKey);
  const until = rawValue ? Number(rawValue) : 0;

  return Number.isFinite(until) ? until : 0;
}

export function useSubmitCooldown(storageKey: string, cooldownMs: number) {
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    const syncRemaining = () => {
      const until = readCooldownUntil(storageKey);
      const nextRemaining = Math.max(0, until - Date.now());

      setRemainingMs(nextRemaining);
    };

    syncRemaining();

    if (remainingMs === 0) {
      return;
    }

    const intervalId = window.setInterval(syncRemaining, 1000);

    return () => window.clearInterval(intervalId);
  }, [remainingMs, storageKey]);

  const startCooldown = () => {
    if (typeof window === "undefined") {
      return;
    }

    const until = Date.now() + cooldownMs;
    window.sessionStorage.setItem(storageKey, String(until));
    setRemainingMs(cooldownMs);
  };

  return {
    isCoolingDown: remainingMs > 0,
    remainingSeconds: Math.max(1, Math.ceil(remainingMs / 1000)),
    startCooldown,
  };
}
