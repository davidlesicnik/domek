import { NextResponse } from "next/server";

import { routing } from "@/i18n/routing";
import { getLocalizedAppEntryPath } from "@/lib/app-entry";

export async function GET() {
  return NextResponse.redirect(
    new URL(await getLocalizedAppEntryPath(routing.defaultLocale), "https://domek.local"),
    { status: 307 },
  );
}
