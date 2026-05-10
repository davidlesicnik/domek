"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

function readCooldownUntil(storageKey: string): number {
  if (typeof window === "undefined") {
    return 0;
  }

  const rawValue = window.sessionStorage.getItem(storageKey);
  const until = rawValue ? Number(rawValue) : 0;

  return Number.isFinite(until) ? until : 0;
}

export function useSubmitCooldown(storageKey: string, cooldownMs: number) {
  const [remainingMs, setRemainingMs] = useState(() => {
    if (typeof window === "undefined") {
      return 0;
    }

    const until = readCooldownUntil(storageKey);
    return Math.max(0, until - Date.now());
  });

  const syncRemaining = useCallback(() => {
    const until = readCooldownUntil(storageKey);
    const nextRemaining = Math.max(0, until - Date.now());
    setRemainingMs((previous) => (previous === nextRemaining ? previous : nextRemaining));
  }, [storageKey]);

  useEffect(() => {
    const intervalId = window.setInterval(syncRemaining, 1000);
    return () => window.clearInterval(intervalId);
  }, [syncRemaining]);

  const startCooldown = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    const until = Date.now() + cooldownMs;
    window.sessionStorage.setItem(storageKey, String(until));
    setRemainingMs(cooldownMs);
  }, [cooldownMs, storageKey]);

  return useMemo(
    () => ({
      isCoolingDown: remainingMs > 0,
      remainingSeconds: Math.max(1, Math.ceil(remainingMs / 1000)),
      startCooldown,
    }),
    [remainingMs, startCooldown],
  );
}
