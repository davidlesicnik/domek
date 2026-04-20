import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function assertDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL must be set for db healthcheck.");
  }

  const isLocalhost = /localhost|127\.0\.0\.1/.test(databaseUrl);

  if (process.env.NODE_ENV === "production" && isLocalhost) {
    throw new Error(
      "DATABASE_URL points to localhost in production. Refusing to continue.",
    );
  }
}

export async function runDatabaseHealthcheck() {
  assertDatabaseUrl();

  await prisma.$queryRaw`SELECT 1`;
  await prisma.$queryRaw`SELECT 1 FROM "_prisma_migrations" LIMIT 1`;

  console.log("Database healthcheck passed.");
}

runDatabaseHealthcheck()
  .catch((error) => {
    console.error("Database healthcheck failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
