import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseRuntimeConfig } from "@/lib/env";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const runtime = getSupabaseRuntimeConfig();

  return createServerClient(
    runtime.NEXT_PUBLIC_SUPABASE_URL,
    runtime.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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
