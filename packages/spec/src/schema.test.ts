import { describe, expect, it } from "vitest";

import { gameSpecJsonSchema, validateGameSpec } from "./index.js";

const validSpec = {
  schemaVersion: "1",
  meta: {
    title: "Neon Run",
    genre: "endless-runner",
    description: "Dodge hazards and collect energy cores.",
  },
  world: {
    mode: "3d",
    gravity: [0, -22, 0],
    bounds: {
      x: { min: -20, max: 500 },
      y: { min: -10, max: 50 },
      z: { min: -3, max: 3 },
    },
    theme: "neon",
  },
  player: {
    controller: "runner",
    speed: 7.5,
    jumpForce: 7.2,
    doubleJump: false,
    lives: 3,
    model: "capsule",
  },
  controls: [
    { key: "KeyA", action: "left", purpose: "Move to the left lane" },
    { key: "KeyD", action: "right", purpose: "Move to the right lane" },
    { key: "Space", action: "jump", purpose: "Jump over hazards" },
  ],
  camera: { type: "follow", smoothing: 0.08, shake: true },
  level: {
    generator: "endless",
    chunks: [{ id: "flat", weight: 3 }],
    entities: [
      {
        id: "starter-coins",
        type: "coin",
        points: 10,
        positions: [[4, 1, 0]],
      },
    ],
  },
  rules: {
    winCondition: "Reach 500 points",
    loseCondition: "Lose all lives",
    scoring: [{ event: "coin", points: 10 }],
    timer: null,
  },
  visuals: {
    lighting: "neon-night",
    postfx: ["bloom", "vignette"],
    particles: [{ event: "coin", preset: "gold-burst" }],
    palette: ["#00f0ff", "#ff007f", "#090b0c"],
  },
  audio: {
    musicStyle: "synthwave",
    sfx: ["jump", "coin", "hit", "win"],
  },
  scripts: { custom: [] },
} as const;

describe("GameSpec", () => {
  it("accepts a complete valid spec", () => {
    const result = validateGameSpec(validSpec);

    expect(result.success).toBe(true);
  });

  it("returns field-level issues for invalid input", () => {
    const result = validateGameSpec({
      ...validSpec,
      player: { ...validSpec.player, lives: 0 },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues[0]?.path).toEqual(["player", "lives"]);
    }
  });

  it("exports a provider-ready JSON Schema", () => {
    expect(gameSpecJsonSchema.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
    expect(gameSpecJsonSchema.type).toBe("object");
  });
});
