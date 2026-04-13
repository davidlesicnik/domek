import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaDatabaseUrl?: string;
};

const databaseUrl = process.env.DATABASE_URL;

export const prisma =
  globalForPrisma.prisma && globalForPrisma.prismaDatabaseUrl === databaseUrl
    ? globalForPrisma.prisma
    : new PrismaClient(
        databaseUrl
          ? {
              datasources: {
                db: {
                  url: databaseUrl,
                },
              },
            }
          : undefined,
      );

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaDatabaseUrl = databaseUrl;
}
