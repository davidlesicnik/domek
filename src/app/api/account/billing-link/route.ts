import { randomUUID } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, requireApiSession } from "@/lib/api-route";
import { resolveAuthOrigin } from "@/lib/origin";
import { createSupabaseAdminClient } from "@/lib/supabase";

const billingLinkInputSchema = z
  .object({
    locale: z.enum(["en", "sl"]).default("en"),
  })
  .strict();

function trialEndedPath(locale: "en" | "sl"): string {
  return locale === "sl" ? "/sl/trial-ended" : "/en-US/trial-ended";
}

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  const session = await requireApiSession(request);
  if (session instanceof Response) return session;

  try {
    const input = billingLinkInputSchema.parse(await request.json());
    if (!session.user.email) {
      return jsonError("email_required", 400, { requestId });
    }

    const publicOrigin = resolveAuthOrigin(request);
    const callbackUrl = new URL("/auth/callback", publicOrigin);
    callbackUrl.searchParams.set("next", trialEndedPath(input.locale));

    const supabaseAdmin = createSupabaseAdminClient();
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: session.user.email,
    });

    if (
      error ||
      !data.properties.hashed_token ||
      !data.properties.verification_type
    ) {
      console.error("[POST /api/account/billing-link]", {
        requestId,
        message:
          error?.message ??
          "Missing hashed_token or verification_type in Supabase response.",
        name: error?.name ?? null,
        status: error?.status ?? null,
      });
      return jsonError("billing_link_failed", 500, { requestId });
    }

    callbackUrl.searchParams.set("token_hash", data.properties.hashed_token);
    callbackUrl.searchParams.set("type", data.properties.verification_type);

    return NextResponse.json({
      url: callbackUrl.toString(),
    });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof z.ZodError) {
      return jsonError("Invalid billing link request.", 400, { requestId });
    }

    console.error("[POST /api/account/billing-link]", {
      requestId,
      error,
    });
    return jsonError("Internal server error", 500, { requestId });
  }
}
