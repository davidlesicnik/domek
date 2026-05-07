"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import {
  getCurrentSubscription,
  isPushSupported,
  subscribeToPush,
} from "@/lib/notifications/client-subscription";

type State = "unsupported" | "denied" | "subscribed" | "unsubscribed" | "loading";

function getInitialState(): State {
  if (typeof window === "undefined") return "loading";
  if (!isPushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  return "loading";
}

export function NotificationToggle() {
  const t = useTranslations("notifications");
  const [state, setState] = useState<State>(getInitialState);

  useEffect(() => {
    if (state !== "loading") return;

    getCurrentSubscription().then((sub) => {
      setState(sub ? "subscribed" : "unsubscribed");
    });
  }, [state]);

  async function subscribe() {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return;

    setState("loading");

    try {
      const { sub, ok } = await subscribeToPush(vapidKey);

      if (!ok) {
        await sub.unsubscribe();
        setState("unsubscribed");
        return;
      }

      setState("subscribed");
    } catch {
      setState(Notification.permission === "denied" ? "denied" : "unsubscribed");
    }
  }

  async function unsubscribe() {
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
    <button
      className="inline-flex h-9 items-center rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] px-4 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-secondary)] disabled:opacity-50"
      disabled={state === "loading"}
      onClick={state === "subscribed" ? unsubscribe : subscribe}
      type="button"
    >
      {state === "subscribed" ? t("disableButton") : t("enableButton")}
    </button>
  );
}
