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

function readOptionalEnv(name: string): string | undefined {
  const value = readEnv(name)?.trim();
  return value ? value : undefined;
}

function readBooleanEnv(name: string): boolean {
  const value = readOptionalEnv(name);

  if (!value) {
    return false;
  }

  return /^(1|true|yes|on)$/i.test(value);
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

const paddleRuntimeSchema = z.object({
  clientToken: z.string().regex(/^(test|live)_/, "PADDLE_CLIENT_TOKEN must start with test_ or live_."),
  priceId: z.string().min(1),
  webhookSecretKey: z.string().min(1),
});

const paddleServerSchema = z.object({
  apiKey: z.string().regex(/^pdl_/, "PADDLE_API_KEY must start with pdl_."),
  clientToken: z.string().regex(/^(test|live)_/, "PADDLE_CLIENT_TOKEN must start with test_ or live_."),
});

const developmentAccessBypassSchema = z
  .object({
    accessCode: z.string().min(1).optional(),
    enabled: z.boolean(),
    nodeEnv: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.enabled && value.nodeEnv === "production") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Development access bypass cannot be enabled in production.",
        path: ["enabled"],
      });
    }

    if (value.enabled && !value.accessCode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "DEVELOPMENT_ACCESS_CODE is required when ENABLE_DEVELOPMENT_ACCESS_BYPASS is enabled.",
        path: ["accessCode"],
      });
    }
  });

export type DevelopmentAccessBypassConfig = Readonly<{
  accessCode: string | null;
  enabled: boolean;
}>;

export function getEmailConfig() {
  return emailSchema.parse({
    resendApiKey: readOptionalEnv("RESEND_API_KEY"),
    fromEmail: readOptionalEnv("FROM_EMAIL"),
  });
}

export function getOptionalEmailConfig() {
  const resendApiKey = readOptionalEnv("RESEND_API_KEY");

  if (!resendApiKey) {
    return null;
  }

  return emailSchema.parse({
    resendApiKey,
    fromEmail: readOptionalEnv("FROM_EMAIL"),
  });
}

export function getPaddleRuntimeConfig() {
  return paddleRuntimeSchema.parse({
    clientToken: readOptionalEnv("PADDLE_CLIENT_TOKEN"),
    priceId: readOptionalEnv("PADDLE_PRICE_ID"),
    webhookSecretKey: readOptionalEnv("PADDLE_WEBHOOK_SECRET"),
  });
}

export function getOptionalPaddleRuntimeConfig() {
  const clientToken = readOptionalEnv("PADDLE_CLIENT_TOKEN");
  const priceId = readOptionalEnv("PADDLE_PRICE_ID");
  const webhookSecretKey = readOptionalEnv("PADDLE_WEBHOOK_SECRET");

  if (!clientToken && !priceId && !webhookSecretKey) {
    return null;
  }

  return paddleRuntimeSchema.parse({
    clientToken,
    priceId,
    webhookSecretKey,
  });
}

export function getPaddleServerConfig() {
  return paddleServerSchema.parse({
    apiKey: readOptionalEnv("PADDLE_API_KEY"),
    clientToken: readOptionalEnv("PADDLE_CLIENT_TOKEN"),
  });
}

export function getOptionalPaddleServerConfig() {
  const apiKey = readOptionalEnv("PADDLE_API_KEY");
  const clientToken = readOptionalEnv("PADDLE_CLIENT_TOKEN");

  if (!apiKey && !clientToken) {
    return null;
  }

  if (!apiKey || !clientToken) {
    return null;
  }

  return paddleServerSchema.parse({
    apiKey,
    clientToken,
  });
}

export function getDevelopmentAccessBypassConfig(): DevelopmentAccessBypassConfig {
  const parsed = developmentAccessBypassSchema.parse({
    accessCode: readOptionalEnv("DEVELOPMENT_ACCESS_CODE"),
    enabled: readBooleanEnv("ENABLE_DEVELOPMENT_ACCESS_BYPASS"),
    nodeEnv: readEnv("NODE_ENV"),
  });

  return {
    accessCode: parsed.enabled ? parsed.accessCode ?? null : null,
    enabled: parsed.enabled,
  };
}

const vapidSchema = z.object({
  publicKey: z.string().min(1),
  privateKey: z.string().min(1),
  mailto: z.string().min(1),
});

const notifySchema = z.object({
  secret: z.string().min(1),
});

const googleCalendarConfigSchema = z
  .object({
    enabled: z.boolean(),
    clientId: z.string().min(1).optional(),
    clientSecret: z.string().min(1).optional(),
    redirectUri: z.string().url().optional(),
    tokenEncryptionKey: z.string().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.enabled) {
      return;
    }

    if (!value.clientId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "GOOGLE_CALENDAR_CLIENT_ID is required when GOOGLE_CALENDAR_ENABLED is true.",
        path: ["clientId"],
      });
    }

    if (!value.clientSecret) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "GOOGLE_CALENDAR_CLIENT_SECRET is required when GOOGLE_CALENDAR_ENABLED is true.",
        path: ["clientSecret"],
      });
    }

    if (!value.tokenEncryptionKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY is required when GOOGLE_CALENDAR_ENABLED is true.",
        path: ["tokenEncryptionKey"],
      });
    }
  });

export function getVapidConfig() {
  return vapidSchema.parse({
    publicKey: readOptionalEnv("VAPID_PUBLIC_KEY"),
    privateKey: readOptionalEnv("VAPID_PRIVATE_KEY"),
    mailto: readOptionalEnv("VAPID_MAILTO"),
  });
}

export function getOptionalVapidConfig() {
  const publicKey = readOptionalEnv("VAPID_PUBLIC_KEY");
  const privateKey = readOptionalEnv("VAPID_PRIVATE_KEY");
  const mailto = readOptionalEnv("VAPID_MAILTO");

  if (!publicKey || !privateKey || !mailto) {
    return null;
  }

  return vapidSchema.parse({ publicKey, privateKey, mailto });
}

export function getNotifyConfig() {
  return notifySchema.parse({
    secret: readOptionalEnv("NOTIFY_SECRET"),
  });
}

export function getGoogleCalendarConfig() {
  return googleCalendarConfigSchema.parse({
    clientId: readOptionalEnv("GOOGLE_CALENDAR_CLIENT_ID"),
    clientSecret: readOptionalEnv("GOOGLE_CALENDAR_CLIENT_SECRET"),
    enabled: readBooleanEnv("GOOGLE_CALENDAR_ENABLED"),
    redirectUri: readOptionalEnv("GOOGLE_CALENDAR_REDIRECT_URI"),
    tokenEncryptionKey: readOptionalEnv("GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY"),
  });
}

export function assertRuntimeEnv() {
  return {
    supabase: supabaseRuntimeSchema.parse(getSupabaseEnv()),
    app: getAppRuntimeConfig(),
    database: databaseSchema.parse({
      DATABASE_URL: process.env.DATABASE_URL,
    }),
    email: getOptionalEmailConfig(),
    paddle: getOptionalPaddleRuntimeConfig(),
    paddleServer: getOptionalPaddleServerConfig(),
    developmentAccessBypass: getDevelopmentAccessBypassConfig(),
    vapid: getOptionalVapidConfig(),
    googleCalendar: getGoogleCalendarConfig(),
  };
}
