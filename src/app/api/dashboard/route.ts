import { getCurrentAppSession } from "@/lib/authz";
import { getDashboardData } from "@/lib/dashboard";

export async function GET(request: Request) {
  const session = await getCurrentAppSession(request);

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getDashboardData(session.user.id);

  if (!data) {
    return Response.json({ error: "Household not found." }, { status: 404 });
  }

  return Response.json(data);
}
