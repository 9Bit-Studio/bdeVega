import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "./app.js";

const token = "test-service-token-that-is-at-least-32-characters";
const options = {
  token,
  allowedOrigins: new Set(["http://127.0.0.1:3000"]),
  allowPrivateAddresses: true,
};

describe("verify-runner HTTP API", () => {
  it("reports health without launching a browser", async () => {
    const response = await request(createApp(options)).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, service: "verify-runner" });
  });

  it("rejects malformed verification requests", async () => {
    const response = await request(createApp(options)).post("/verify").set("authorization", `Bearer ${token}`).send({ bundleUrl: "file:///tmp/game" });

    expect(response.status).toBe(400);
    expect(response.body.pass).toBe(false);
  });

  it("requires the service bearer token", async () => {
    const response = await request(createApp(options)).post("/verify").send({ bundleUrl: "http://127.0.0.1:3000/play/game" });

    expect(response.status).toBe(401);
  });

  it("rejects targets outside the exact app-origin allowlist", async () => {
    const response = await request(createApp(options))
      .post("/verify")
      .set("authorization", `Bearer ${token}`)
      .send({ bundleUrl: "https://example.com/play/game" });

    expect(response.status).toBe(400);
    expect(response.body.failures[0].message).toContain("not allowed");
  });

  it("blocks private targets unless the development exception is explicit", async () => {
    const response = await request(createApp({ ...options, allowPrivateAddresses: false }))
      .post("/verify")
      .set("authorization", `Bearer ${token}`)
      .send({ bundleUrl: "http://127.0.0.1:3000/play/game" });

    expect(response.status).toBe(400);
    expect(response.body.failures[0].message).toContain("Private or internal");
  });

  it("runs an allowed request without launching Chromium in the HTTP test", async () => {
    const app = createApp({
      ...options,
      verify: async () => ({ pass: true, failures: [], metrics: { fps: 60, durationMs: 1 } }),
    });
    const response = await request(app)
      .post("/verify")
      .set("authorization", `Bearer ${token}`)
      .send({ bundleUrl: "http://127.0.0.1:3000/play/game" });

    expect(response.status).toBe(200);
    expect(response.body.pass).toBe(true);
  });

  it("rate limits service calls", async () => {
    const app = createApp({
      ...options,
      rateLimitPerMinute: 1,
      verify: async () => ({ pass: true, failures: [], metrics: { fps: 60, durationMs: 1 } }),
    });
    const send = () => request(app)
      .post("/verify")
      .set("authorization", `Bearer ${token}`)
      .send({ bundleUrl: "http://127.0.0.1:3000/play/game" });

    expect((await send()).status).toBe(200);
    expect((await send()).status).toBe(429);
  });

  it("rejects work above the concurrency limit", async () => {
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => { release = resolve; });
    let markStarted!: () => void;
    const started = new Promise<void>((resolve) => { markStarted = resolve; });
    const app = createApp({
      ...options,
      maxConcurrent: 1,
      verify: async () => {
        markStarted();
        await blocked;
        return { pass: true, failures: [], metrics: { fps: 60, durationMs: 1 } };
      },
    });
    const send = () => request(app)
      .post("/verify")
      .set("authorization", `Bearer ${token}`)
      .send({ bundleUrl: "http://127.0.0.1:3000/play/game" });

    const first = send().then((response) => response);
    await started;
    expect((await send()).status).toBe(429);
    release();
    expect((await first).status).toBe(200);
  });
});
