import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseRuntimeConfig } from "@/lib/env";

export function createSupabaseAdminClient() {
  const runtime = getSupabaseRuntimeConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }
  return createClient(runtime.supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const runtime = getSupabaseRuntimeConfig();

  return createServerClient(
    runtime.supabaseUrl,
    runtime.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, options, value }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot set cookies; the request proxy refreshes sessions.
          }
        },
      },
    },
  );
}
