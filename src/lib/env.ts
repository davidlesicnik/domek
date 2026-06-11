import { z } from "zod";

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

const authRuntimeSchema = z.object({
  secret: z.string().min(32, "AUTH_SECRET must be at least 32 characters."),
});

const databaseSchema = z.object({
  DATABASE_URL: z.string().min(1),
});

const smtpSchema = z.object({
  from: z.string().min(1),
  host: z.string().min(1),
  password: z.string().min(1).optional(),
  port: z.coerce.number().int().positive(),
  secure: z.boolean().default(false),
  user: z.string().min(1).optional(),
});

const vapidSchema = z.object({
  publicKey: z.string().min(1),
  privateKey: z.string().min(1),
  mailto: z.string().min(1),
});

const notifySchema = z.object({
  secret: z.string().min(1),
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

export function getAppRuntimeConfig() {
  return appRuntimeSchema.parse({
    appUrl: readEnv("APP_URL"),
    nodeEnv: readEnv("NODE_ENV"),
  });
}

export function getAuthConfig() {
  return authRuntimeSchema.parse({
    secret: readOptionalEnv("AUTH_SECRET"),
  });
}

export function getDatabaseConfig() {
  return databaseSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
  });
}

export function getEmailConfig() {
  return smtpSchema.parse({
    from: readOptionalEnv("SMTP_FROM"),
    host: readOptionalEnv("SMTP_HOST"),
    password: readOptionalEnv("SMTP_PASSWORD"),
    port: readOptionalEnv("SMTP_PORT"),
    secure: readBooleanEnv("SMTP_SECURE"),
    user: readOptionalEnv("SMTP_USER"),
  });
}

export function getOptionalEmailConfig() {
  const host = readOptionalEnv("SMTP_HOST");
  const port = readOptionalEnv("SMTP_PORT");
  const from = readOptionalEnv("SMTP_FROM");

  if (!host && !port && !from) {
    return null;
  }

  return smtpSchema.parse({
    from,
    host,
    password: readOptionalEnv("SMTP_PASSWORD"),
    port,
    secure: readBooleanEnv("SMTP_SECURE"),
    user: readOptionalEnv("SMTP_USER"),
  });
}

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

export function assertRuntimeEnv() {
  return {
    app: getAppRuntimeConfig(),
    auth: getAuthConfig(),
    database: getDatabaseConfig(),
    email: getOptionalEmailConfig(),
    vapid: getOptionalVapidConfig(),
  };
}
