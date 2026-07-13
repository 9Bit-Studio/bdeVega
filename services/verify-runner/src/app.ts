import { gameExpectationsSchema } from "@vega/spec";
import cors from "cors";
import express from "express";
import { z } from "zod";

import { verifyGame } from "./verifier.js";

const verifyRequestSchema = z.object({
  bundleUrl: z.string().url().refine((value) => value.startsWith("http://") || value.startsWith("https://"), {
    message: "bundleUrl must use http or https",
  }),
  expectations: gameExpectationsSchema.default({ fpsFloor: 30, assertions: [] }),
});

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(cors({ origin: true }));
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

    try {
      response.json(await verifyGame(parsed.data));
    } catch (error) {
      response.status(500).json({
        pass: false,
        failures: [{ type: "browser", message: error instanceof Error ? error.message : "Verification failed" }],
      });
    }
  });

  return app;
}
