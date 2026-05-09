import { sendEventNotifications } from "@/lib/notifications/event-sender";

const EVENT_NOTIFICATION_INTERVAL_MS = 5 * 60 * 1000;

const schedulerState = globalThis as typeof globalThis & {
  domekEventNotificationTimer?: ReturnType<typeof setInterval>;
  domekEventNotificationInFlight?: boolean;
};

async function runEventNotificationTick() {
  if (schedulerState.domekEventNotificationInFlight) {
    return;
  }

  schedulerState.domekEventNotificationInFlight = true;

  try {
    await sendEventNotifications();
  } catch (error) {
    console.error("[notifications] Event scheduler tick failed", error);
  } finally {
    schedulerState.domekEventNotificationInFlight = false;
  }
}

export function registerNodeInstrumentation() {
  if (schedulerState.domekEventNotificationTimer) {
    return;
  }

  void runEventNotificationTick();

  const timer = setInterval(() => {
    void runEventNotificationTick();
  }, EVENT_NOTIFICATION_INTERVAL_MS);

  timer.unref?.();
  schedulerState.domekEventNotificationTimer = timer;
}
