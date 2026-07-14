import { starterAssetPack, type GameSpec } from "@vega/spec";

export const endlessRunnerSpec = {
  schemaVersion: "1",
  meta: {
    title: "Neon Run",
    genre: "endless-runner",
    description: "Switch lanes, vault hazards, and chase a rising high score.",
  },
  world: {
    mode: "3d",
    gravity: [0, -22, 0],
    bounds: {
      x: { min: -20, max: 100000 },
      y: { min: -10, max: 40 },
      z: { min: -2.4, max: 2.4 },
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
    { key: "KeyA", action: "left", purpose: "Move toward the left lane" },
    { key: "KeyD", action: "right", purpose: "Move toward the right lane" },
    { key: "Space", action: "jump", purpose: "Jump over gaps and hazards" },
  ],
  camera: { type: "follow", smoothing: 0.08, shake: true },
  level: {
    generator: "endless",
    chunks: [
      { id: "flat", weight: 4, difficulty: 1 },
      { id: "crates", weight: 3, difficulty: 2 },
      { id: "gap", weight: 2, difficulty: 2 },
      { id: "spikes", weight: 2, difficulty: 3 },
    ],
    entities: [
      {
        id: "coin-wave",
        type: "coin",
        points: 10,
        pattern: { type: "sequence", origin: [4, 1, 0], count: 10, spacing: [3, 0, 0] },
      },
      {
        id: "speed-gate-bonus",
        type: "trigger",
        positions: [[28, 1, 0]],
        trigger: { once: true, actions: [{ type: "add-score", points: 50 }] },
      },
    ],
  },
  rules: {
    winCondition: "Reach 1000 points",
    loseCondition: "Lose all lives by falling or touching hazards",
    scoring: [
      { event: "coin", points: 10 },
      { event: "distance-10m", points: 5 },
    ],
    timer: null,
  },
  visuals: {
    lighting: "neon-night",
    postfx: ["bloom", "chromatic-aberration", "vignette"],
    particles: [
      { event: "jump", preset: "cyan-kick" },
      { event: "coin", preset: "gold-burst" },
      { event: "hit", preset: "red-shards" },
    ],
    palette: ["#00f0ff", "#ff007f", "#7928ca", "#090b0c"],
  },
  audio: {
    musicStyle: "synthwave",
    sfx: ["jump", "coin", "hit", "win", "lose"],
  },
  assets: starterAssetPack,
  scripts: { custom: [] },
} satisfies GameSpec;
