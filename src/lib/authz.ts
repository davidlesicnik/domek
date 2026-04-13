import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { hasAuthRuntimeConfig } from "@/lib/env";

export async function requireAppSession() {
  const authConfigured = hasAuthRuntimeConfig();
  const session = authConfigured ? await auth() : null;

  if (authConfigured && !session?.user) {
    redirect("/api/auth/signin");
  }

  return {
    authConfigured,
    session,
  };
}
