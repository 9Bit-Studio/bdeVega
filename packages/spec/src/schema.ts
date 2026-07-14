import { z } from "zod";

const vector3Schema = z.tuple([z.number(), z.number(), z.number()]);
const boundedNumberSchema = z.object({
  min: z.number(),
  max: z.number(),
});

const assetUrlSchema = z.string().trim().min(1).max(500);

/**
 * The built-in pack keeps every generated game playable before a creator has
 * uploaded or generated a bespoke pack. Asset URLs are deliberately supplied
 * by the trusted asset pipeline, never invented by the language model.
 */
export const starterAssetPack = {
  id: "stellar-trail-starter",
  artDirection: "Original polished pixel-art skyport adventure with teal, coral, and midnight-blue contrast.",
  player: {
    imageUrl: "/assets/stellar-trail/courier.png",
    width: 1.9,
    height: 2.4,
  },
  background: {
    imageUrl: "/assets/stellar-trail/skyport.png",
    width: 28,
    height: 15.75,
  },
  audio: {
    musicUrl: null,
    volume: 0.18,
  },
} as const;

export const gameAssetPackSchema = z.object({
  id: z.string().trim().min(1).max(80),
  artDirection: z.string().trim().min(1).max(300),
  player: z.object({
    imageUrl: assetUrlSchema,
    width: z.number().positive().max(10),
    height: z.number().positive().max(10),
  }),
  background: z.object({
    imageUrl: assetUrlSchema,
    width: z.number().positive().max(100),
    height: z.number().positive().max(100),
  }),
  audio: z.object({
    // A null URL tells the engine to use the style-aware procedural preview.
    // A generated/uploaded audio file replaces it without an engine change.
    musicUrl: assetUrlSchema.nullable(),
    volume: z.number().min(0).max(1),
  }),
});

export const gameGenreSchema = z.enum([
  "platformer",
  "endless-runner",
  "top-down-collector",
]);

export const controlSchema = z.object({
  key: z.string().trim().min(1).max(40),
  action: z.string().trim().min(1).max(40),
  purpose: z.string().trim().min(1).max(160),
});

export const levelEntitySchema = z.object({
  id: z.string().trim().min(1).max(80),
  type: z.enum([
    "checkpoint",
    "coin",
    "enemy",
    "goal",
    "hazard",
    "moving-platform",
    "platform",
    "trigger",
  ]),
  points: z.number().int().optional(),
  positions: z.array(vector3Schema).max(500).optional(),
  pattern: z
    .object({
      type: z.enum(["arc", "grid", "line", "random", "sequence"]),
      origin: vector3Schema,
      count: z.number().int().min(1).max(500),
      spacing: vector3Schema,
    })
    .optional(),
  properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export const customScriptSchema = z.object({
  hook: z.enum(["onStart", "onUpdate", "onCollect", "onDeath", "onWin"]),
  code: z.string().trim().min(1).max(2_000),
});

export const gameSpecSchema = z.object({
  schemaVersion: z.literal("1"),
  meta: z.object({
    title: z.string().trim().min(1).max(80),
    genre: gameGenreSchema,
    description: z.string().trim().min(1).max(500),
  }),
  world: z.object({
    mode: z.enum(["2d", "2.5d", "3d"]),
    gravity: vector3Schema,
    bounds: z.object({
      x: boundedNumberSchema,
      y: boundedNumberSchema,
      z: boundedNumberSchema,
    }),
    theme: z.enum(["neon", "pastel", "voxel", "retro", "realistic"]),
  }),
  player: z.object({
    controller: z.enum(["platformer", "topdown", "runner"]),
    speed: z.number().positive().max(50),
    jumpForce: z.number().min(0).max(100),
    doubleJump: z.boolean(),
    lives: z.number().int().min(1).max(99),
    model: z.enum(["capsule", "sprite", "glb-ref"]),
  }),
  controls: z.array(controlSchema).min(1).max(16),
  camera: z.object({
    type: z.enum(["side", "follow", "orbit", "fixed"]),
    smoothing: z.number().min(0).max(1),
    shake: z.boolean(),
  }),
  level: z.object({
    generator: z.enum(["authored", "endless"]),
    chunks: z.array(z.record(z.string(), z.unknown())).max(100),
    entities: z.array(levelEntitySchema).max(1_000),
  }),
  rules: z.object({
    winCondition: z.string().trim().min(1).max(240),
    loseCondition: z.string().trim().min(1).max(240),
    scoring: z
      .array(
        z.object({
          event: z.string().trim().min(1).max(80),
          points: z.number().int(),
        }),
      )
      .max(32),
    timer: z.number().positive().max(86_400).nullable(),
  }),
  visuals: z.object({
    lighting: z.string().trim().min(1).max(80),
    postfx: z.array(z.enum(["bloom", "chromatic-aberration", "vignette"])).max(3),
    particles: z
      .array(
        z.object({
          event: z.string().trim().min(1).max(80),
          preset: z.string().trim().min(1).max(80),
        }),
      )
      .max(32),
    palette: z.array(z.string().regex(/^#[0-9a-f]{6}$/i)).min(2).max(12),
  }),
  audio: z.object({
    musicStyle: z.enum(["synthwave", "chiptune", "ambient", "orchestral-lite"]),
    sfx: z.array(z.enum(["jump", "coin", "hit", "win", "lose", "checkpoint"])).max(12),
  }),
  assets: gameAssetPackSchema.default(starterAssetPack),
  scripts: z.object({
    custom: z.array(customScriptSchema).max(12),
  }),
});

export type GameGenre = z.infer<typeof gameGenreSchema>;
export type GameSpec = z.infer<typeof gameSpecSchema>;
export type GameControl = z.infer<typeof controlSchema>;
export type LevelEntity = z.infer<typeof levelEntitySchema>;
export type GameAssetPack = z.infer<typeof gameAssetPackSchema>;
export type CustomScript = z.infer<typeof customScriptSchema>;

export const expectationAssertionSchema = z.object({
  id: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(240),
  input: z
    .object({
      key: z.string().trim().min(1).max(40),
      durationMs: z.number().int().min(16).max(5_000).default(120),
    })
    .optional(),
  path: z.string().trim().min(1).max(160),
  operator: z.enum(["changed", "increased", "decreased", "equals", "greater-than", "less-than", "truthy"]),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
});

export const gameExpectationsSchema = z.object({
  fpsFloor: z.number().positive().max(240).default(30),
  assertions: z.array(expectationAssertionSchema).max(32).default([]),
});

export type ExpectationAssertion = z.infer<typeof expectationAssertionSchema>;
export type GameExpectations = z.infer<typeof gameExpectationsSchema>;
