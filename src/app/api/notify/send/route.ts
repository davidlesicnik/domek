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
  if (authHeader !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendDailyNotifications();

  return Response.json(result);
}
