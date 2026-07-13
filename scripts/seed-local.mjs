import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import dotenv from "dotenv";

const root = resolve(import.meta.dirname, "..");
const values = dotenv.parse(await readFile(resolve(root, ".env.local"), "utf8"));
const url = values.NEXT_PUBLIC_CONVEX_URL ?? "http://127.0.0.1:3210";
const client = new ConvexHttpClient(url);
const seedLocal = makeFunctionReference("seed:seedLocal");

const keys = [
  ["openai", values.OPENAI_API_KEY],
  ["anthropic", values.ANTHROPIC_API_KEY],
  ["gemini", values.GEMINI_API_KEY],
].filter((entry) => Boolean(entry[1])).map(([provider, key]) => ({ provider, key }));

const result = await client.action(seedLocal, {
  email: values.TEST_USER_EMAIL ?? "developer@localhost",
  name: values.TEST_USER_NAME ?? "Local Developer",
  keys,
});

console.log(`[seed] local user ready (${result.userId}); ${result.keyCount} API key(s) stored`);
