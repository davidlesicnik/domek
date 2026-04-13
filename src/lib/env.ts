import { z } from "zod";

const authRuntimeSchema = z.object({
  AUTH_SECRET: z.string().min(32),
  AUTH_URL: z.string().url(),
  OIDC_ISSUER: z.string().url(),
  OIDC_CLIENT_ID: z.string().min(1),
  OIDC_CLIENT_SECRET: z.string().min(1),
});

const databaseSchema = z.object({
  DATABASE_URL: z.string().min(1),
});

export const authEnv = {
  AUTH_SECRET: process.env.AUTH_SECRET,
  AUTH_URL: process.env.AUTH_URL,
  OIDC_ISSUER: process.env.OIDC_ISSUER,
  OIDC_CLIENT_ID: process.env.OIDC_CLIENT_ID,
  OIDC_CLIENT_SECRET: process.env.OIDC_CLIENT_SECRET,
};

export function hasAuthRuntimeConfig() {
  return authRuntimeSchema.safeParse(authEnv).success;
}

export function getAuthRuntimeConfig() {
  const parsed = authRuntimeSchema.safeParse(authEnv);
  return parsed.success ? parsed.data : null;
}

export function assertRuntimeEnv() {
  return {
    auth: authRuntimeSchema.parse(authEnv),
    database: databaseSchema.parse({
      DATABASE_URL: process.env.DATABASE_URL,
    }),
  };
}
