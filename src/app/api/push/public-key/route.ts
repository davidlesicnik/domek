import { getVapidConfig } from "@/lib/env";

export async function GET() {
  try {
    const config = getVapidConfig();
    return Response.json({ publicKey: config.publicKey });
  } catch {
    return Response.json({ error: "VAPID public key is not configured" }, { status: 503 });
  }
}
