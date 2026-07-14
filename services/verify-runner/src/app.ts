import { gameExpectationsSchema } from "@vega/spec";
import { timingSafeEqual } from "node:crypto";
import express from "express";
import { z } from "zod";

import { verifyGame } from "./verifier.js";
import { assertSafeTarget, parseAllowedOrigins, TargetPolicyError, type TargetPolicy } from "./security.js";

const verifyRequestSchema = z.object({
  bundleUrl: z.string().url().refine((value) => value.startsWith("http://") || value.startsWith("https://"), {
    message: "bundleUrl must use http or https",
  }),
  expectations: gameExpectationsSchema.default({ fpsFloor: 30, assertions: [] }),
});

interface AppOptions {
  token?: string;
  allowedOrigins?: ReadonlySet<string>;
  allowPrivateAddresses?: boolean;
  maxConcurrent?: number;
  rateLimitPerMinute?: number;
  verify?: typeof verifyGame;
}

function authorized(header: string | undefined, token: string): boolean {
  if (!header?.startsWith("Bearer ") || token.length < 32) return false;
  const supplied = Buffer.from(header.slice(7));
  const expected = Buffer.from(token);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function positiveInteger(value: number | string | undefined, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value ?? fallback);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error("Verifier limits must be positive integers");
  return parsed;
}

export function createApp(options: AppOptions = {}) {
  const app = express();
  const token = options.token ?? process.env.VERIFY_RUNNER_TOKEN ?? "";
  const targetPolicy: TargetPolicy = {
    allowedOrigins: options.allowedOrigins ?? parseAllowedOrigins(process.env.VERIFY_ALLOWED_APP_ORIGINS),
    allowPrivateAddresses: options.allowPrivateAddresses ?? process.env.VERIFY_ALLOW_PRIVATE_ADDRESSES === "true",
  };
  const maxConcurrent = positiveInteger(options.maxConcurrent ?? process.env.VERIFY_MAX_CONCURRENT, 2);
  const rateLimitPerMinute = positiveInteger(options.rateLimitPerMinute ?? process.env.VERIFY_RATE_LIMIT_PER_MINUTE, 30);
  const runVerify = options.verify ?? verifyGame;
  const requestTimes: number[] = [];
  let active = 0;

  app.disable("x-powered-by");
  app.use("/verify", (request, response, next) => {
    if (!authorized(request.header("authorization"), token)) {
      response.status(401).json({ pass: false, failures: [{ type: "auth", message: "Unauthorized" }] });
      return;
    }
    next();
  });
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_request, response) => {
    response.json({ ok: true, service: "verify-runner" });
  });

  app.post("/verify", async (request, response) => {
    const parsed = verifyRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ pass: false, failures: parsed.error.issues });
      return;
    }
    const now = Date.now();
    while (requestTimes.length > 0 && requestTimes[0] <= now - 60_000) requestTimes.shift();
    if (requestTimes.length >= rateLimitPerMinute || active >= maxConcurrent) {
      response.setHeader("retry-after", "60");
      response.status(429).json({ pass: false, failures: [{ type: "rate_limit", message: "Verifier capacity exceeded" }] });
      return;
    }
    requestTimes.push(now);
    active += 1;

    try {
      await assertSafeTarget(parsed.data.bundleUrl, targetPolicy);
      response.json(await runVerify(parsed.data, targetPolicy));
    } catch (error) {
      response.status(error instanceof TargetPolicyError ? 400 : 500).json({
        pass: false,
        failures: [{ type: "browser", message: error instanceof Error ? error.message : "Verification failed" }],
      });
    } finally {
      active -= 1;
    }
  });

  return app;
}
