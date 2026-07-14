import { describe, expect, it } from "vitest";

import { applyGameSpecPatch } from "./patch.js";
import { starterAssetPack, type GameSpec } from "./schema.js";

const spec: GameSpec = {
  schemaVersion: "1",
  meta: { title: "Test", genre: "platformer", description: "A valid test game" },
  world: {
    mode: "2d",
    gravity: [0, -20, 0],
    bounds: { x: { min: -10, max: 50 }, y: { min: -10, max: 20 }, z: { min: -1, max: 1 } },
    theme: "retro",
  },
  player: { controller: "platformer", speed: 6, jumpForce: 8, doubleJump: false, lives: 3, model: "capsule" },
  controls: [{ key: "Space", action: "jump", purpose: "Jump" }],
  camera: { type: "side", smoothing: 0.1, shake: true },
  level: { generator: "authored", chunks: [], entities: [] },
  rules: { winCondition: "Reach goal", loseCondition: "Lose lives", scoring: [], timer: null },
  visuals: { lighting: "day", postfx: [], particles: [], palette: ["#ffffff", "#000000"] },
  audio: { musicStyle: "chiptune", sfx: [] },
  assets: starterAssetPack,
  scripts: { custom: [] },
};

describe("structured GameSpec patches", () => {
  it("applies typed JSON Pointer operations and validates the result", () => {
    const result = applyGameSpecPatch(spec, {
      operations: [
        { op: "replace", path: "/player/speed", value: 9 },
        { op: "replace", path: "/player/doubleJump", value: true },
      ],
    });

    expect(result.player.speed).toBe(9);
    expect(result.player.doubleJump).toBe(true);
    expect(spec.player.speed).toBe(6);
  });

  it("rejects changes to trusted assets", () => {
    expect(() => applyGameSpecPatch(spec, {
      operations: [{ op: "replace", path: "/assets/player/imageUrl", value: "https://untrusted.invalid/player.png" }],
    })).toThrow("cannot change /assets");
  });

  it("rejects a patch that makes the final spec invalid", () => {
    expect(() => applyGameSpecPatch(spec, {
      operations: [{ op: "replace", path: "/player/speed", value: 500 }],
    })).toThrow();
  });
});
