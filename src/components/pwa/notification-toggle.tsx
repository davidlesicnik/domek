"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type State = "unsupported" | "denied" | "subscribed" | "unsubscribed" | "loading";

function getInitialState(): State {
  if (typeof window === "undefined") return "loading";
  if (!("PushManager" in window) || !("serviceWorker" in navigator)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  return "loading";
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

export function NotificationToggle() {
  const t = useTranslations("notifications");
  const [state, setState] = useState<State>(getInitialState);

  useEffect(() => {
    if (state !== "loading") return;

    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setState(sub ? "subscribed" : "unsubscribed");
      });
    });
  }, [state]);

  async function subscribe() {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return;

    setState("loading");

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
        setState("unsubscribed");
        return;
      }

      setState("subscribed");
    } catch {
      setState("unsubscribed");
    }
  }

  async function unsubscribe() {
    setState("loading");

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();

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
