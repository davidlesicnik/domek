"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  getCurrentSubscription,
  isPushSupported,
  subscribeToPush,
} from "@/lib/notifications/client-subscription";
import { MS_PER_DAY } from "@/lib/time-constants";

const DISMISS_STORAGE_KEY = "domek-notification-prompt-dismissed-at";
const DISMISS_DURATION_MS = 30 * MS_PER_DAY;

function isDismissedRecently(now: number) {
  if (typeof window === "undefined") return false;
  const storedValue = window.localStorage.getItem(DISMISS_STORAGE_KEY);
  if (!storedValue) return false;
  const dismissedAt = Number(storedValue);
  return Number.isFinite(dismissedAt) && now - dismissedAt < DISMISS_DURATION_MS;
}

function saveDismissedAt(now: number) {
  window.localStorage.setItem(DISMISS_STORAGE_KEY, String(now));
}

export function NotificationPrompt() {
  const t = useTranslations("notifications");
  const [isVisible, setIsVisible] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isDenied, setIsDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPushSupported()) return;
    if (Notification.permission !== "default") return;
    if (isDismissedRecently(Date.now())) return;

    getCurrentSubscription().then((sub) => {
      if (!sub) setIsVisible(true);
    });
  }, []);

  function dismiss() {
    saveDismissedAt(Date.now());
    setIsVisible(false);
  }

  async function handleEnable() {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (isSubscribing) return;
    if (!vapidKey) {
      setError(t("enableFailed"));
      return;
    }

    setError(null);
    setIsSubscribing(true);

    try {
      const { sub, ok } = await subscribeToPush(vapidKey);

      if (!ok) {
        await sub.unsubscribe();
        setError(t("enableFailed"));
        return;
      }

      setIsVisible(false);
    } catch {
      if (Notification.permission === "denied") {
        setIsDenied(true);
      } else {
        setError(t("enableFailed"));
      }
    } finally {
      setIsSubscribing(false);
    }
  }

  if (!isVisible) return null;

  return (
    <section className="border-b border-[var(--accent-sun-border)] bg-[var(--accent-sun-surface)]">
      <div className="mx-auto flex w-full max-w-[1280px] items-start gap-3 px-4 py-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--accent-sun-border)] bg-[var(--surface-primary)] text-[var(--accent-sun-text)]">
          <Bell aria-hidden className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--text-strong)]">{t("promptTitle")}</p>
          <p className="mt-1 text-sm leading-5 text-[var(--accent-sun-text)]">{t("promptBody")}</p>
          {isDenied ? (
            <p className="mt-2 text-xs text-[var(--text-muted)]">{t("permissionDenied")}</p>
          ) : (
            <>
              <button
                className="mt-3 inline-flex h-9 items-center justify-center rounded-md border border-[var(--accent-sun-border)] bg-[var(--surface-primary)] px-3 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-secondary)] disabled:opacity-60"
                disabled={isSubscribing}
                onClick={() => void handleEnable()}
                type="button"
              >
                {t("promptCta")}
              </button>
              {error ? <p className="mt-2 text-xs text-[var(--danger-text)]">{error}</p> : null}
            </>
          )}
        </div>
        <button
          aria-label={t("promptDismiss")}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[var(--accent-sun-text)] transition hover:bg-[var(--surface-secondary)]"
          onClick={dismiss}
          type="button"
        >
          <X aria-hidden className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
