"use client";

import { useState, useTransition } from "react";
import { useLocale } from "next-intl";

import { usePathname } from "@/i18n/navigation";

type GoogleCalendarControlsProps = Readonly<{
  connected: boolean;
  connectLabel: string;
  syncLabel: string;
  syncingLabel: string;
  disconnectLabel: string;
  confirmTitle: string;
  confirmBody: string;
  confirmButton: string;
  cancelButton: string;
}>;

export function GoogleCalendarControls({
  connected,
  connectLabel,
  syncLabel,
  syncingLabel,
  disconnectLabel,
  confirmTitle,
  confirmBody,
  confirmButton,
  cancelButton,
}: GoogleCalendarControlsProps) {
  const locale = useLocale();
  const pathname = usePathname();
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const accountPath = pathname.startsWith(`/${locale}`) ? pathname : `/${locale}/app/account`;

  function runConnect() {
    window.location.href = "/api/google-calendar/connect";
  }

  function runSync() {
    startTransition(async () => {
      const response = await fetch("/api/google-calendar/sync", {
        method: "POST",
      });

      const search = response.ok ? "googleCalendar=sync_success" : "error=google_calendar_sync_failed";
      window.location.assign(`${accountPath}?${search}`);
    });
  }

  function runDisconnect() {
    startTransition(async () => {
      const response = await fetch("/api/google-calendar/disconnect", {
        method: "POST",
      });

      const search = response.ok ? "googleCalendar=disconnected" : "error=google_calendar_sync_failed";
      window.location.assign(`${accountPath}?${search}`);
    });
  }

  const primaryLabel = connected ? (isPending ? syncingLabel : syncLabel) : connectLabel;

  return (
    <>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--accent-sage-border)] bg-[var(--accent-sage-surface)] px-3 text-xs font-semibold text-[var(--accent-sage-text)] transition hover:bg-[var(--accent-sage-soft)] disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isPending}
          onClick={connected ? runSync : runConnect}
          type="button"
        >
          {primaryLabel}
        </button>
        {connected ? (
          <button
            className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--accent-rose-border)] bg-[var(--accent-rose-soft)] px-3 text-xs font-semibold text-[var(--accent-rose-text)] transition hover:bg-[var(--accent-rose-surface)] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isPending}
            onClick={() => setShowDisconnectConfirm(true)}
            type="button"
          >
            {disconnectLabel}
          </button>
        ) : null}
      </div>

      {showDisconnectConfirm ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4"
          role="dialog"
        >
          <div className="w-full max-w-sm rounded-md border border-[var(--accent-rose-border)] bg-[var(--surface-primary)] p-4 shadow-[var(--shadow-soft)]">
            <h3 className="text-sm font-semibold text-[var(--text-strong)]">{confirmTitle}</h3>
            <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">{confirmBody}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-muted)]"
                onClick={() => setShowDisconnectConfirm(false)}
                type="button"
              >
                {cancelButton}
              </button>
              <button
                className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--accent-rose-border)] bg-[var(--accent-rose-soft)] px-3 text-xs font-semibold text-[var(--accent-rose-text)] transition hover:bg-[var(--accent-rose-surface)] disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isPending}
                onClick={runDisconnect}
                type="button"
              >
                {confirmButton}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
