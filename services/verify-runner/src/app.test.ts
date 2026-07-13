import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "./app.js";

describe("verify-runner HTTP API", () => {
  it("reports health without launching a browser", async () => {
    const response = await request(createApp()).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, service: "verify-runner" });
  });

  it("rejects malformed verification requests", async () => {
    const response = await request(createApp()).post("/verify").send({ bundleUrl: "file:///tmp/game" });

    expect(response.status).toBe(400);
    expect(response.body.pass).toBe(false);
  });
});
