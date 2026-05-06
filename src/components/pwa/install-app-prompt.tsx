"use client";

import { useEffect, useState } from "react";
import { Download, Share2, X } from "lucide-react";
import { useTranslations } from "next-intl";

const DISMISS_STORAGE_KEY = "domek-install-prompt-dismissed-at";
const DISMISS_DURATION_MS = 14 * 24 * 60 * 60 * 1000;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isDismissedRecently(now: number) {
  if (typeof window === "undefined") {
    return false;
  }

  const storedValue = window.localStorage.getItem(DISMISS_STORAGE_KEY);
  if (!storedValue) {
    return false;
  }

  const dismissedAt = Number(storedValue);
  return Number.isFinite(dismissedAt) && now - dismissedAt < DISMISS_DURATION_MS;
}

function saveDismissedAt(now: number) {
  window.localStorage.setItem(DISMISS_STORAGE_KEY, String(now));
}

export function InstallAppPrompt() {
  const t = useTranslations("installPrompt");
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIosSafari, setIsIosSafari] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    const now = Date.now();
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: minimal-ui)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (standalone || isDismissedRecently(now)) {
      return;
    }

    const userAgent = window.navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !/CriOS|FxiOS|EdgiOS/.test(userAgent);

    if (isIos && isSafari) {
      setIsIosSafari(true);
      setIsVisible(true);
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setIsVisible(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  function dismissPrompt() {
    const now = Date.now();
    saveDismissedAt(now);
    setIsVisible(false);
  }

  async function handleInstall() {
    if (!installEvent || isInstalling) {
      return;
    }

    setIsInstalling(true);

    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;

      if (choice.outcome === "accepted") {
        setIsVisible(false);
      } else {
        dismissPrompt();
      }
    } finally {
      setInstallEvent(null);
      setIsInstalling(false);
    }
  }

  if (!isVisible) {
    return null;
  }

  return (
    <section className="border-b border-[var(--accent-sage-border)] bg-[var(--accent-sage-surface)] sm:hidden">
      <div className="mx-auto flex w-full max-w-[1280px] items-start gap-3 px-4 py-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--accent-sage-border)] bg-[var(--surface-primary)] text-[var(--accent-sage-text)]">
          {isIosSafari ? <Share2 aria-hidden className="h-4 w-4" /> : <Download aria-hidden className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--text-strong)]">{t("title")}</p>
          <p className="mt-1 text-sm leading-5 text-[var(--accent-sage-text)]">
            {isIosSafari ? t("iosBody") : t("body")}
          </p>
          {installEvent ? (
            <button
              className="mt-3 inline-flex h-9 items-center justify-center rounded-md border border-[var(--accent-sage-border)] bg-[var(--surface-primary)] px-3 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-secondary)] disabled:opacity-60"
              disabled={isInstalling}
              onClick={() => void handleInstall()}
              type="button"
            >
              {isInstalling ? t("installing") : t("cta")}
            </button>
          ) : null}
        </div>
        <button
          aria-label={t("dismiss")}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[var(--accent-sage-text)] transition hover:bg-[var(--surface-secondary)]"
          onClick={dismissPrompt}
          type="button"
        >
          <X aria-hidden className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
