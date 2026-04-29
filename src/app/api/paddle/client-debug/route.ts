import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase";

type PaddleClientDebugPayload = Readonly<{
  kind?: string;
  payload?: {
    appLocale?: string | null;
    checkoutId?: string | null;
    checkoutLocale?: string | null;
    code?: string | null;
    detail?: string | null;
    documentationUrl?: string | null;
    environment?: string | null;
    errors?: Array<{
      field?: string | null;
      message?: string | null;
    }>;
    phase?: string | null;
    priceId?: string | null;
    successHost?: string | null;
    tokenPrefix?: string | null;
    type?: string | null;
  };
}>;

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: PaddleClientDebugPayload | null = null;

  try {
    body = (await request.json()) as PaddleClientDebugPayload;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  console.error("[paddle-client-debug]", {
    eventKind: body?.kind ?? "unknown",
    payload: body?.payload ?? null,
    userId: user.id,
  });

  return NextResponse.json({ ok: true });
}
