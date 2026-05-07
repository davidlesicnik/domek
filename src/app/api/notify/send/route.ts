import { timingSafeEqual } from "crypto";
import { getNotifyConfig } from "@/lib/env";
import { sendDailyNotifications } from "@/lib/notifications/sender";

export async function POST(request: Request) {
  let secret: string;
  try {
    secret = getNotifyConfig().secret;
  } catch {
    return Response.json({ error: "Notification cron not configured" }, { status: 503 });
  }

  const authHeader = request.headers.get("Authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const provided = authHeader;
  const isValid =
    provided.length === expected.length &&
    timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  if (!isValid) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendDailyNotifications();

  return Response.json(result);
}
