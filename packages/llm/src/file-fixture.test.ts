import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { createLLMClient } from "./index.js";
import { FileFixtureStore } from "./node.js";

describe("disk fixture replay", () => {
  it("records a raw response and replays it without a provider call", async () => {
    const directory = await mkdtemp(join(tmpdir(), "vega-fixtures-"));
    const fixtures = new FileFixtureStore(directory);
    const client = createLLMClient({
      fixtureStore: fixtures,
      transport: async () => '{"genre":"platformer"}',
    });
    const request = {
      apiKey: "test",
      fixtureId: "golden-platformer",
      jsonSchema: { type: "object" },
      messages: [{ role: "user" as const, content: "platformer" }],
      provider: "openai" as const,
      system: "JSON only",
      tier: "fast" as const,
    };

    await client.generate({ ...request, record: true });
    const replayed = await client.generate({ ...request, replay: true });

    expect(replayed.data).toEqual({ genre: "platformer" });
    expect(replayed.replayed).toBe(true);
    await rm(directory, { recursive: true, force: true });
  });
});
