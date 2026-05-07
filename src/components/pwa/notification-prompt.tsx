"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { useTranslations } from "next-intl";

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

function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const buf = new ArrayBuffer(rawData.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < rawData.length; i++) {
    view[i] = rawData.charCodeAt(i);
  }
  return buf;
}

export function NotificationPrompt() {
  const t = useTranslations("notifications");
  const [isVisible, setIsVisible] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    if (!("PushManager" in window) || !("serviceWorker" in navigator)) return;
    if (Notification.permission !== "default") return;
    if (isDismissedRecently(Date.now())) return;

    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        if (!sub) setIsVisible(true);
      });
    });
  }, []);

  function dismiss() {
    saveDismissedAt(Date.now());
    setIsVisible(false);
  }

  async function handleEnable() {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey || isSubscribing) return;

    setIsSubscribing(true);

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToArrayBuffer(vapidKey),
      });

      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
        }),
      });

      if (!res.ok) {
        await sub.unsubscribe();
      }
    } catch {
      // permission denied or error — just dismiss
    } finally {
      setIsSubscribing(false);
      setIsVisible(false);
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
          <button
            className="mt-3 inline-flex h-9 items-center justify-center rounded-md border border-[var(--accent-sun-border)] bg-[var(--surface-primary)] px-3 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-secondary)] disabled:opacity-60"
            disabled={isSubscribing}
            onClick={() => void handleEnable()}
            type="button"
          >
            {t("promptCta")}
          </button>
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
