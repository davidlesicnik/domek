import assert from "node:assert/strict";

import { resolveSubscriptionInitState } from "@/lib/notifications/toggle-state";

async function run() {
  const failed = await resolveSubscriptionInitState(
    async () => {
      throw new Error("service worker unavailable");
    },
    "Could not enable notifications. Please try again.",
  );

  assert.equal(failed.state, "unsubscribed");
  assert.equal(failed.error, "Could not enable notifications. Please try again.");

  const success = await resolveSubscriptionInitState(async () => null, "unused");

  assert.equal(success.state, "unsubscribed");
  assert.equal(success.error, null);

  console.log("PASS verify-notification-toggle-init-failure");
}

run().catch((error: unknown) => {
  console.error("FAIL verify-notification-toggle-init-failure");
  console.error(error);
  process.exit(1);
});
