import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { handleRouteError, jsonError, requireApiSession } from "@/lib/api-route";
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
  const session = await requireApiSession(request);
  if (session instanceof Response) return session;

  try {
    const input = billingLinkInputSchema.parse(await request.json());
    if (!session.user.email) {
      return jsonError("email_required", 400);
    }

    const publicOrigin = resolveAuthOrigin(request);
    const redirectTo = new URL("/auth/mobile", publicOrigin);
    redirectTo.searchParams.set("next", trialEndedPath(input.locale));

    const supabaseAdmin = createSupabaseAdminClient();
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: session.user.email,
      options: {
        redirectTo: redirectTo.toString(),
      },
    });

    if (error || !data.properties.action_link) {
      console.error("[POST /api/account/billing-link]", error);
      return jsonError("billing_link_failed", 500);
    }

    return NextResponse.json({
      url: data.properties.action_link,
    });
  } catch (error) {
    return handleRouteError(error, {
      invalidMessage: "Invalid billing link request.",
      logLabel: "[POST /api/account/billing-link]",
    });
  }
}
