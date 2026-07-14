import { starterAssetPack, type GameSpec } from "@vega/spec";

export const platformerSpec = {
  schemaVersion: "1",
  meta: {
    title: "Skyline Sprint",
    genre: "platformer",
    description: "Cross floating rooftops, collect stars, and reach the exit beacon.",
  },
  world: {
    mode: "2.5d",
    gravity: [0, -20, 0],
    bounds: {
      x: { min: -12, max: 90 },
      y: { min: -10, max: 30 },
      z: { min: -2, max: 2 },
    },
    theme: "pastel",
  },
  player: {
    controller: "platformer",
    speed: 7,
    jumpForce: 8.5,
    doubleJump: false,
    lives: 3,
    model: "sprite",
  },
  controls: [
    { key: "KeyA", action: "left", purpose: "Run left" },
    { key: "KeyD", action: "right", purpose: "Run right" },
    { key: "Space", action: "jump", purpose: "Jump" },
  ],
  camera: { type: "side", smoothing: 0.1, shake: true },
  level: {
    generator: "authored",
    chunks: [
      { id: "intro", length: 24, difficulty: 1 },
      { id: "midway", length: 30, difficulty: 2 },
      { id: "final-climb", length: 28, difficulty: 3 },
    ],
    entities: [
      {
        id: "star-line",
        type: "coin",
        points: 10,
        pattern: { type: "arc", origin: [4, 2, 0], count: 8, spacing: [2, 0.45, 0] },
      },
      {
        id: "midway-checkpoint",
        type: "checkpoint",
        points: 100,
        positions: [[30, 1, 0]],
      },
      {
        id: "moving-lift",
        type: "moving-platform",
        positions: [[46, 0.5, 0]],
        motion: { offset: [0, 3, 0], duration: 3.5, phase: 0 },
      },
      { id: "exit-beacon", type: "goal", positions: [[78, 1, 0]] },
    ],
  },
  rules: {
    winCondition: "Touch the exit beacon",
    loseCondition: "Lose all lives by falling or touching hazards",
    scoring: [
      { event: "coin", points: 10 },
      { event: "checkpoint", points: 100 },
    ],
    timer: null,
  },
  visuals: {
    lighting: "soft-sunrise",
    postfx: ["bloom", "vignette"],
    particles: [
      { event: "jump", preset: "cloud-puff" },
      { event: "coin", preset: "star-burst" },
    ],
    palette: ["#2dd4bf", "#fb923c", "#15233d", "#070d1d"],
  },
  audio: {
    musicStyle: "chiptune",
    sfx: ["jump", "coin", "hit", "checkpoint", "win", "lose"],
  },
  assets: starterAssetPack,
  scripts: { custom: [] },
} satisfies GameSpec;
