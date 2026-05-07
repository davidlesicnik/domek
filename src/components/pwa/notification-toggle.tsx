"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import {
  fetchVapidPublicKey,
  getCurrentSubscription,
  isPushSupported,
  subscribeToPush,
} from "@/lib/notifications/client-subscription";
import {
  resolveSubscriptionInitState,
  type NotificationToggleState as State,
} from "@/lib/notifications/toggle-state";

function getInitialState(): State {
  if (typeof window === "undefined") return "loading";
  if (!isPushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  return "loading";
}

export function NotificationToggle() {
  const t = useTranslations("notifications");
  const [state, setState] = useState<State>(getInitialState);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (state !== "loading") return;

    resolveSubscriptionInitState(getCurrentSubscription, t("enableFailed")).then((result) => {
      setState(result.state);
      setError(result.error);
    });
  }, [state, t]);

  async function subscribe() {
    const vapidKey = await fetchVapidPublicKey();
    if (!vapidKey) {
      setError(t("enableFailed"));
      return;
    }

    setError(null);
    setState("loading");

    try {
      const { sub, ok } = await subscribeToPush(vapidKey);

      if (!ok) {
        await sub.unsubscribe();
        setState("unsubscribed");
        setError(t("enableFailed"));
        return;
      }

      setState("subscribed");
    } catch {
      setState(Notification.permission === "denied" ? "denied" : "unsubscribed");
      if (Notification.permission !== "denied") {
        setError(t("enableFailed"));
      }
    }
  }

  async function unsubscribe() {
    setError(null);
    setState("loading");

    try {
      const sub = await getCurrentSubscription();

      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }

      setState("unsubscribed");
    } catch {
      setState("subscribed");
    }
  }

  if (state === "unsupported") {
    return <p className="text-xs text-[var(--text-muted)]">{t("unsupported")}</p>;
  }

  if (state === "denied") {
    return <p className="text-xs text-[var(--text-muted)]">{t("permissionDenied")}</p>;
  }

  return (
    <div className="space-y-2">
      <button
        className="inline-flex h-9 items-center rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] px-4 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-secondary)] disabled:opacity-50"
        disabled={state === "loading"}
        onClick={state === "subscribed" ? unsubscribe : subscribe}
        type="button"
      >
        {state === "subscribed" ? t("disableButton") : t("enableButton")}
      </button>
      {error ? <p className="text-xs text-[var(--danger-text)]">{error}</p> : null}
    </div>
  );
}
