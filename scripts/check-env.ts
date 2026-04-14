import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

if (existsSync(".env")) {
  loadEnvFile(".env");
}

import { assertRuntimeEnv } from "../src/lib/env";

assertRuntimeEnv();
console.log("Environment configuration is valid.");
