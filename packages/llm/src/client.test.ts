import { describe, expect, it, vi } from "vitest";

import { createLLMClient, MemoryFixtureStore, resolveModel } from "./index.js";

const request = {
  apiKey: "test-key",
  fixtureId: "golden-platformer",
  jsonSchema: { type: "object" },
  messages: [{ role: "user" as const, content: "Build a platformer" }],
  provider: "openai" as const,
  system: "Return JSON",
  tier: "strong" as const,
};

describe("LLM adapter", () => {
  it("forces cheap models when DEV_MODEL_TIER is enabled", () => {
    expect(resolveModel("openai", "strong", true)).toBe("gpt-4o-mini");
    expect(resolveModel("anthropic", "strong", true)).toContain("haiku");
    expect(resolveModel("gemini", "strong", true)).toContain("flash-lite");
  });

  it("records once and replays without calling the provider", async () => {
    const fixtures = new MemoryFixtureStore();
    const transport = vi.fn().mockResolvedValue('{"genre":"platformer"}');
    const client = createLLMClient({ fixtureStore: fixtures, transport });

    const recorded = await client.generate({ ...request, record: true });
    const replayed = await client.generate({ ...request, replay: true });

    expect(recorded.replayed).toBe(false);
    expect(replayed.replayed).toBe(true);
    expect(replayed.data).toEqual({ genre: "platformer" });
    expect(transport).toHaveBeenCalledOnce();
  });

  it("fails closed when a replay fixture is missing", async () => {
    const client = createLLMClient({ fixtureStore: new MemoryFixtureStore(), transport: vi.fn() });

    await expect(client.generate({ ...request, replay: true })).rejects.toThrow("Missing LLM replay fixture");
  });

  it("captures usage, estimated cost, and latency for provider calls", async () => {
    const client = createLLMClient({
      transport: vi.fn().mockResolvedValue({
        raw: '{"genre":"platformer"}',
        usage: { inputTokens: 1_000, outputTokens: 500 },
      }),
    });

    const response = await client.generate({ ...request, model: "gpt-4.1" });

    expect(response.usage).toEqual({ inputTokens: 1_000, outputTokens: 500 });
    expect(response.costUsd).toBe(0.006);
    expect(response.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("returns malformed structured output for caller-directed repair with usage intact", async () => {
    const client = createLLMClient({
      transport: vi.fn().mockResolvedValue({ raw: "not-json", usage: { inputTokens: 20, outputTokens: 4 } }),
    });

    const response = await client.generate({ ...request, model: "gpt-4.1" });

    expect(response.data).toBe("not-json");
    expect(response.usage).toEqual({ inputTokens: 20, outputTokens: 4 });
    expect(response.costUsd).toBeGreaterThan(0);
  });
});
