import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth, { type NextAuthConfig } from "next-auth";

import { prisma } from "@/lib/db";
import { getAuthRuntimeConfig } from "@/lib/env";

const runtimeAuth = getAuthRuntimeConfig();

const providers: NextAuthConfig["providers"] = runtimeAuth
  ? [
      {
        id: "oidc",
        name: "OIDC",
        type: "oidc",
        issuer: runtimeAuth.OIDC_ISSUER,
        clientId: runtimeAuth.OIDC_CLIENT_ID,
        clientSecret: runtimeAuth.OIDC_CLIENT_SECRET,
        authorization: {
          params: {
            scope: "openid profile email groups",
          },
        },
        profile(profile) {
          return {
            id: profile.sub,
            name:
              profile.name ??
              profile.preferred_username ??
              profile.email ??
              "Household member",
            email: profile.email,
            image: profile.picture,
          };
        },
      },
    ]
  : [];

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers,
  secret: runtimeAuth?.AUTH_SECRET,
  trustHost: true,
  session: {
    strategy: "database",
  },
} satisfies NextAuthConfig);
