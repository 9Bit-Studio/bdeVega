import { spawn } from "node:child_process";
import { readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import dotenv from "dotenv";

const root = resolve(import.meta.dirname, "..");
const convexEnvPath = resolve(root, ".convex.env.local");

function run(command, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: "inherit" });
    child.once("exit", (code) => code === 0 ? resolvePromise() : reject(new Error(`${command} exited with ${code}`)));
  });
}

try {
  const values = dotenv.parse(await readFile(resolve(root, ".env.local"), "utf8"));
  const allowedKeys = [
    "API_KEY_ENCRYPTION_SECRET",
    "APP_URL",
    "DEV_MODEL_TIER",
    "JWKS",
    "JWT_PRIVATE_KEY",
    "SITE_URL",
    "LLM_RECORD",
    "LLM_REPLAY",
    "PUBLISH_DRY_RUN",
    "VERCEL_TOKEN",
    "VERCEL_TEAM_ID",
    "VERIFY_RUNNER_URL",
  ];
  const convexEnv = allowedKeys
    .filter((key) => values[key] !== undefined)
    .map((key) => `${key}='${values[key]}'`)
    .join("\n");
  await writeFile(convexEnvPath, `${convexEnv}\n`, "utf8");
  await run("pnpm", ["exec", "convex", "env", "set", "--from-file", convexEnvPath]);
  await run("node", ["scripts/seed-local.mjs"]);
  console.log("[convex-bootstrap] environment synced and local data seeded");
} catch (error) {
  console.error("[convex-bootstrap]", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await rm(convexEnvPath, { force: true });
}
