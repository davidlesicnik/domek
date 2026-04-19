import { z } from "zod";

const supabaseRuntimeSchema = z.object({
  supabaseAnonKey: z.string().min(1),
  supabaseUrl: z.string().url(),
});

const appRuntimeSchema = z
  .object({
    appUrl: z.string().url().optional(),
    nodeEnv: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.nodeEnv === "production" && !value.appUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "APP_URL is required when NODE_ENV=production.",
        path: ["appUrl"],
      });
    }
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

export function getAppRuntimeConfig() {
  return appRuntimeSchema.parse({
    appUrl: readEnv("APP_URL"),
    nodeEnv: readEnv("NODE_ENV"),
  });
}

const emailSchema = z.object({
  resendApiKey: z.string().min(1),
  fromEmail: z.string().min(1).default("Domek <onboarding@resend.dev>"),
});

export function getEmailConfig() {
  return emailSchema.parse({
    resendApiKey: readEnv("RESEND_API_KEY"),
    fromEmail: readEnv("FROM_EMAIL"),
  });
}

export function assertRuntimeEnv() {
  return {
    supabase: supabaseRuntimeSchema.parse(getSupabaseEnv()),
    app: getAppRuntimeConfig(),
    database: databaseSchema.parse({
      DATABASE_URL: process.env.DATABASE_URL,
    }),
    email: emailSchema.parse({
      resendApiKey: readEnv("RESEND_API_KEY"),
      fromEmail: readEnv("FROM_EMAIL"),
    }),
  };
}
