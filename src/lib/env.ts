import { z } from "zod";

const supabaseRuntimeSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const databaseSchema = z.object({
  DATABASE_URL: z.string().min(1),
});

function getSupabaseEnv() {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

export function getSupabaseRuntimeConfig() {
  return supabaseRuntimeSchema.parse(getSupabaseEnv());
}

export function assertRuntimeEnv() {
  return {
    supabase: supabaseRuntimeSchema.parse(getSupabaseEnv()),
    database: databaseSchema.parse({
      DATABASE_URL: process.env.DATABASE_URL,
    }),
  };
}
