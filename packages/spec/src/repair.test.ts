import { describe, expect, it, vi } from "vitest";

import { validateGameSpecWithRepair } from "./repair.js";

const fallback = {
  schemaVersion: "1" as const,
  meta: { title: "Test", genre: "platformer" as const, description: "A valid test game" },
  world: {
    mode: "2d" as const,
    gravity: [0, -20, 0] as [number, number, number],
    bounds: { x: { min: -10, max: 50 }, y: { min: -10, max: 20 }, z: { min: -1, max: 1 } },
    theme: "retro" as const,
  },
  player: {
    controller: "platformer" as const,
    speed: 6,
    jumpForce: 8,
    doubleJump: false,
    lives: 3,
    model: "capsule" as const,
  },
  controls: [{ key: "Space", action: "jump", purpose: "Jump" }],
  camera: { type: "side" as const, smoothing: 0.1, shake: true },
  level: { generator: "authored" as const, chunks: [], entities: [] },
  rules: { winCondition: "Reach goal", loseCondition: "Lose lives", scoring: [], timer: null },
  visuals: { lighting: "day", postfx: [], particles: [], palette: ["#ffffff", "#000000"] },
  audio: { musicStyle: "chiptune" as const, sfx: [] },
  scripts: { custom: [] },
};

describe("GameSpec repair loop", () => {
  it("returns a repaired spec before exhausting retries", async () => {
    const repair = vi.fn().mockResolvedValue(fallback);

    const result = await validateGameSpecWithRepair({ candidate: { broken: true }, fallback, repair });

    expect(result.defaulted).toBe(false);
    expect(result.repairAttempts).toBe(1);
    expect(repair).toHaveBeenCalledOnce();
  });

  it("uses the working genre fallback after failed repairs", async () => {
    const repair = vi.fn().mockResolvedValue({ still: "broken" });

    const result = await validateGameSpecWithRepair({
      candidate: null,
      fallback,
      maxAttempts: 2,
      repair,
    });

    expect(result.defaulted).toBe(true);
    expect(result.spec.meta.genre).toBe("platformer");
    expect(repair).toHaveBeenCalledTimes(2);
  });
});
