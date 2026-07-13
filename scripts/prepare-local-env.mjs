import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import dotenv from "dotenv";

const root = resolve(import.meta.dirname, "..");
const sourcePath = resolve(root, ".env.local");
const destinationPath = resolve(root, "apps/web/.env.local");

let source;
try {
  source = await readFile(sourcePath, "utf8");
} catch {
  throw new Error("Missing .env.local. Copy .env.example to .env.local before running pnpm dev.");
}

const values = dotenv.parse(source);
const publicValues = {
  NEXT_PUBLIC_CONVEX_URL: values.NEXT_PUBLIC_CONVEX_URL ?? "http://127.0.0.1:3210",
};

await writeFile(
  destinationPath,
  `${Object.entries(publicValues).map(([key, value]) => `${key}=${value}`).join("\n")}\n`,
  "utf8",
);

console.log(`[local-env] wrote ${destinationPath}`);
