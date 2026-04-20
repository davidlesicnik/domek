import { spawn } from "node:child_process";

function runCommand(label, command, args) {
  return new Promise((resolve, reject) => {
    console.log(`\n▶ ${label}`);

    const child = spawn(command, args, {
      stdio: "inherit",
      env: process.env,
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${label} failed with exit code ${code ?? "unknown"}.`));
    });
  });
}

async function runDeployVerification() {
  await runCommand("Apply migrations", "./node_modules/.bin/prisma", [
    "migrate",
    "deploy",
  ]);

  await runCommand("Check migration status", "./node_modules/.bin/prisma", [
    "migrate",
    "status",
  ]);

  await runCommand("Run DB healthcheck", "node", ["scripts/db-healthcheck.mjs"]);

  console.log("\nDatabase deploy verification passed.");
}

runDeployVerification().catch((error) => {
  console.error("\nDatabase deploy verification failed.");
  console.error(error);
  process.exitCode = 1;
});
