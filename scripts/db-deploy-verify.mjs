import { spawn } from "node:child_process";

function getUrlDetails(value) {
  if (!value) {
    return null;
  }

  try {
    const parsed = new URL(value);
    const port = parsed.port || (parsed.protocol === "postgresql:" ? "5432" : "");

    return {
      hostname: parsed.hostname,
      port,
      sslmode: parsed.searchParams.get("sslmode"),
    };
  } catch {
    return null;
  }
}

function assertMigrationEnvironment() {
  const databaseUrl = getUrlDetails(process.env.DATABASE_URL);
  const directUrl = getUrlDetails(process.env.DIRECT_URL);

  if (!databaseUrl) {
    throw new Error("DATABASE_URL must be set and valid before running deploy verification.");
  }

  if (!directUrl) {
    throw new Error(
      "DIRECT_URL must be set and valid for migration deploys. Without DIRECT_URL Prisma may use pooled DATABASE_URL and stall/fail during migrations.",
    );
  }

  console.log(
    `Migration DB targets: DATABASE_URL=${databaseUrl.hostname}:${databaseUrl.port || "default"}, DIRECT_URL=${directUrl.hostname}:${directUrl.port || "default"}`,
  );
}

function printP1001Hints() {
  const databaseUrl = getUrlDetails(process.env.DATABASE_URL);
  const directUrl = getUrlDetails(process.env.DIRECT_URL);

  console.error("\nP1001 troubleshooting:");
  console.error("- Confirm the DB host is reachable from Railway.");
  console.error("- For Supabase, include `sslmode=require` on direct (5432) URLs.");
  console.error("- Keep app runtime on pooler (6543) in DATABASE_URL.");

  if (databaseUrl) {
    console.error(
      `- DATABASE_URL host: ${databaseUrl.hostname}:${databaseUrl.port || "default"}`,
    );
  }

  if (directUrl) {
    console.error(
      `- DIRECT_URL host: ${directUrl.hostname}:${directUrl.port || "default"} (sslmode=${directUrl.sslmode ?? "missing"})`,
    );
  } else {
    console.error("- DIRECT_URL is missing; Prisma migrate deploy may be using DATABASE_URL.");
  }
}

function runCommand(label, command, args, timeoutMs = 300000) {
  return new Promise((resolve, reject) => {
    console.log(`\n▶ ${label}`);

    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });
    let output = "";
    let didTimeout = false;
    let forceKillTimer;
    const timer = setTimeout(() => {
      didTimeout = true;
      child.kill("SIGTERM");
      forceKillTimer = setTimeout(() => {
        child.kill("SIGKILL");
      }, 5000);
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stderr.write(text);
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (forceKillTimer) {
        clearTimeout(forceKillTimer);
      }

      if (didTimeout) {
        const error = new Error(
          `${label} timed out after ${Math.floor(timeoutMs / 1000)}s. This can happen if migrations are waiting on a lock or if DIRECT_URL cannot be reached.`,
        );
        error.commandOutput = output;
        reject(error);
        return;
      }

      if (code === 0) {
        resolve();
        return;
      }

      const error = new Error(`${label} failed with exit code ${code ?? "unknown"}.`);
      error.commandOutput = output;
      reject(error);
    });
  });
}

async function runDeployVerification() {
  assertMigrationEnvironment();

  await runCommand("Apply migrations", "./node_modules/.bin/prisma", [
    "migrate",
    "deploy",
  ], Number(process.env.MIGRATION_DEPLOY_TIMEOUT_MS || 300000));

  await runCommand("Check migration status", "./node_modules/.bin/prisma", [
    "migrate",
    "status",
  ]);

  await runCommand("Run DB healthcheck", "node", ["scripts/db-healthcheck.mjs"]);

  console.log("\nDatabase deploy verification passed.");
}

runDeployVerification().catch((error) => {
  if (typeof error?.commandOutput === "string" && error.commandOutput.includes("P1001")) {
    printP1001Hints();
  }

  if (error instanceof Error && error.message.includes("timed out")) {
    console.error("\nTimeout troubleshooting:");
    console.error("- Confirm no second deploy is running migrations concurrently.");
    console.error("- Confirm DIRECT_URL points to a reachable non-pooled/session endpoint.");
    console.error("- Increase MIGRATION_DEPLOY_TIMEOUT_MS for large migrations.");
  }

  console.error("\nDatabase deploy verification failed.");
  console.error(error);
  process.exitCode = 1;
});
