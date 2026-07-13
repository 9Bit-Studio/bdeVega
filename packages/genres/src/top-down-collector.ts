import type { GameSpec } from "@vega/spec";

export const topDownCollectorSpec = {
  schemaVersion: "1",
  meta: {
    title: "Lantern Grove",
    genre: "top-down-collector",
    description: "Explore a moonlit grove and gather every wandering light before time expires.",
  },
  world: {
    mode: "3d",
    gravity: [0, 0, 0],
    bounds: {
      x: { min: -18, max: 18 },
      y: { min: 0, max: 8 },
      z: { min: -18, max: 18 },
    },
    theme: "voxel",
  },
  player: {
    controller: "topdown",
    speed: 6,
    jumpForce: 0,
    doubleJump: false,
    lives: 3,
    model: "capsule",
  },
  controls: [
    { key: "KeyW", action: "up", purpose: "Move north" },
    { key: "KeyS", action: "down", purpose: "Move south" },
    { key: "KeyA", action: "left", purpose: "Move west" },
    { key: "KeyD", action: "right", purpose: "Move east" },
  ],
  camera: { type: "fixed", smoothing: 0.12, shake: true },
  level: {
    generator: "authored",
    chunks: [{ id: "grove", width: 36, depth: 36, difficulty: 1 }],
    entities: [
      {
        id: "wandering-lights",
        type: "coin",
        points: 25,
        pattern: { type: "random", origin: [-14, 0.8, -14], count: 12, spacing: [2.5, 0, 2.5] },
      },
      {
        id: "patrols",
        type: "enemy",
        positions: [[-8, 0.6, 4], [7, 0.6, -5]],
        properties: { ai: "patrol", damage: 1 },
      },
    ],
  },
  rules: {
    winCondition: "Collect all 12 wandering lights",
    loseCondition: "Run out of time or lose all lives",
    scoring: [
      { event: "coin", points: 25 },
      { event: "time-remaining", points: 5 },
    ],
    timer: 120,
  },
  visuals: {
    lighting: "moonlit-grove",
    postfx: ["bloom", "vignette"],
    particles: [
      { event: "coin", preset: "firefly-swirl" },
      { event: "hit", preset: "leaf-burst" },
    ],
    palette: ["#86efac", "#fde68a", "#60a5fa", "#172554"],
  },
  audio: {
    musicStyle: "ambient",
    sfx: ["coin", "hit", "win", "lose"],
  },
  scripts: { custom: [] },
} satisfies GameSpec;
