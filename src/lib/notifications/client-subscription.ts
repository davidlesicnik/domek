type SubscriptionPayload = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

type VapidPublicKeyResponse = {
  publicKey?: string;
};

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

function toSubscriptionPayload(sub: PushSubscription): SubscriptionPayload {
  const json = sub.toJSON();

  return {
    endpoint: sub.endpoint,
    keys: {
      p256dh: json.keys?.p256dh ?? "",
      auth: json.keys?.auth ?? "",
    },
  };
}

export function isPushSupported() {
  return typeof window !== "undefined" && "PushManager" in window && "serviceWorker" in navigator;
}

export async function fetchVapidPublicKey() {
  const response = await fetch("/api/push/public-key", { method: "GET" });
  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as VapidPublicKeyResponse;
  return typeof payload.publicKey === "string" && payload.publicKey.length > 0 ? payload.publicKey : null;
}

export async function subscribeToPush(vapidKey: string) {
  // Firefox Android requires an explicit permission request before pushManager.subscribe()
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission not granted");
  }

  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToArrayBuffer(vapidKey),
  });

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toSubscriptionPayload(sub)),
  });

  return { sub, ok: res.ok };
}

export async function getCurrentSubscription() {
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}
