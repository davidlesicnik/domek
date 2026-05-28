import { Prisma } from "@prisma/client";

import { getCurrentAppSession } from "@/lib/authz";
import { redeemInvite } from "@/lib/invites";

type RouteContext = Readonly<{
  params: Promise<{ token: string }>;
}>;

export async function POST(request: Request, context: RouteContext) {
  const session = await getCurrentAppSession(request);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await context.params;

  try {
    const result = await redeemInvite({ token, userId: session.user.id });
    if (!result.ok) {
      const status =
        result.reason === "not_found"
          ? 404
          : result.reason === "expired"
            ? 410
            : result.reason === "email_mismatch"
              ? 403
              : result.reason === "already_used" ||
                  result.reason === "already_member"
                ? 409
                : 400;
      return Response.json({ error: result.reason }, { status });
    }

    return Response.json({ ok: true, householdId: result.householdId });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return Response.json({ error: "already_member" }, { status: 409 });
    }

    console.error("[POST /api/invite/[token]/accept]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
