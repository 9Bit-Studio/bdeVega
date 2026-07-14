import { describe, expect, it } from "vitest";

import {
  engineCapabilityMatrix,
  gameExpectationsSchema,
  gameSpecJsonSchema,
  gameSpecPatchJsonSchema,
  starterAssetPack,
  validateGameSpec,
  validateGameSpecForEngine,
} from "./index.js";

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
    expect(gameSpecPatchJsonSchema.type).toBe("object");
  });

  it("defaults verification settings for local playtests", () => {
    expect(gameExpectationsSchema.parse({})).toEqual({ fpsFloor: 30, assertions: [] });
  });

  it("publishes explicit runtime support and rejects inert entity features", () => {
    expect(engineCapabilityMatrix.checkpoints.status).toBe("supported");
    expect(engineCapabilityMatrix["moving-platforms"]).toMatchObject({ status: "supported", policy: "allow" });
    expect(engineCapabilityMatrix["trigger-actions"]).toMatchObject({ status: "supported", policy: "allow" });

    const result = validateGameSpecForEngine({
      ...validSpec,
      level: {
        ...validSpec.level,
        entities: [{ id: "scripted", type: "platform", positions: [[4, 1, 0]] }],
      },
      scripts: { custom: [{ hook: "onStart", code: "score.add(100)" }] },
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.issues[0]).toMatchObject({ feature: "custom-scripts", severity: "error" });
  });

  it("warns when a supported fallback exists", () => {
    const result = validateGameSpecForEngine({
      ...validSpec,
      player: { ...validSpec.player, doubleJump: true },
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.warnings).toEqual([
      expect.objectContaining({ feature: "double-jump", severity: "warning" }),
    ]);
  });

  it("rejects asset URLs that did not come from the approved pipeline", () => {
    const result = validateGameSpecForEngine({
      ...validSpec,
      assets: {
        ...starterAssetPack,
        id: "stellar-trail-starter",
        player: { ...starterAssetPack.player, imageUrl: "https://unapproved.example/player.png" },
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.issues[0]).toMatchObject({ feature: "custom-assets" });
  });
});
