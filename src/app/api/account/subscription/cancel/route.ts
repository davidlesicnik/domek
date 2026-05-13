import { getCurrentAppSession } from "@/lib/authz";
import { cancelAccountSubscription } from "@/lib/account-settings";

export async function POST(request: Request) {
  const session = await getCurrentAppSession(request);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await cancelAccountSubscription(session.user.id);
    if (!result.ok) {
      return Response.json({ error: result.reason }, { status: 400 });
    }

    return Response.json({ subscription: result.subscription });
  } catch (error) {
    console.error("[POST /api/account/subscription/cancel]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
