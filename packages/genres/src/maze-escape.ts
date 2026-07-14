import { starterAssetPack, type GameSpec } from "@vega/spec";

export const mazeEscapeSpec = {
  schemaVersion: "1",
  meta: {
    title: "Signal Labyrinth",
    genre: "maze-escape",
    description: "Navigate a neon labyrinth, cross a checkpoint, claim a signal bonus, and reach the exit.",
  },
  world: {
    mode: "3d",
    gravity: [0, 0, 0],
    bounds: {
      x: { min: -18, max: 18 },
      y: { min: 0, max: 8 },
      z: { min: -18, max: 18 },
    },
    theme: "neon",
  },
  player: {
    controller: "topdown",
    speed: 6.5,
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
  camera: { type: "fixed", smoothing: 0.14, shake: true },
  level: {
    generator: "authored",
    chunks: [{ id: "signal-maze", width: 32, depth: 32, difficulty: 2 }],
    entities: [
      {
        id: "maze-walls",
        type: "platform",
        positions: [
          [-5, 0.6, -2], [-4, 0.6, -2], [-3, 0.6, -2], [-2, 0.6, -2],
          [2, 0.6, 2], [3, 0.6, 2], [4, 0.6, 2], [5, 0.6, 2],
          [-2, 0.6, 4], [-2, 0.6, 5], [-2, 0.6, 6],
          [6, 0.6, -4], [6, 0.6, -3], [6, 0.6, -2],
        ],
      },
      { id: "midway-signal", type: "checkpoint", positions: [[0, 0.8, 0]], points: 100 },
      {
        id: "signal-bonus",
        type: "trigger",
        positions: [[4, 0.8, -5]],
        trigger: { once: true, actions: [{ type: "add-score", points: 75 }] },
      },
      { id: "static-fields", type: "hazard", positions: [[-7, 0.6, 5], [7, 0.6, 6]] },
      { id: "exit", type: "goal", positions: [[12, 0.8, 12]] },
    ],
  },
  rules: {
    winCondition: "Touch the exit beacon",
    loseCondition: "Lose all lives to static fields",
    scoring: [
      { event: "checkpoint", points: 100 },
      { event: "signal-bonus", points: 75 },
    ],
    timer: null,
  },
  visuals: {
    lighting: "neon-labyrinth",
    postfx: ["bloom", "vignette"],
    particles: [
      { event: "checkpoint", preset: "signal-ring" },
      { event: "win", preset: "portal-burst" },
    ],
    palette: ["#22d3ee", "#f472b6", "#312e81", "#080b20"],
  },
  audio: {
    musicStyle: "synthwave",
    sfx: ["hit", "checkpoint", "win", "lose"],
  },
  assets: starterAssetPack,
  scripts: { custom: [] },
} satisfies GameSpec;
