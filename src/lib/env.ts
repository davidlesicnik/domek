import { z } from "zod";

const supabaseRuntimeSchema = z.object({
  supabaseAnonKey: z.string().min(1),
  supabaseUrl: z.string().url(),
});

const databaseSchema = z.object({
  DATABASE_URL: z.string().min(1),
});

function readEnv(name: string): string | undefined {
  return process.env[name];
}

function getSupabaseEnv() {
  const supabaseUrl =
    readEnv("SUPABASE_URL") ?? readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseAnonKey =
    readEnv("SUPABASE_ANON_KEY") ??
    readEnv("SUPABASE_PUBLISHABLE_KEY") ??
    readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") ??
    readEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

  return {
    supabaseAnonKey,
    supabaseUrl,
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
