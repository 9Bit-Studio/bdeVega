import { getGenreSpec } from "@vega/genres";
import { describe, expect, it, vi } from "vitest";

import {
  createEngineRuntimeApi,
  executeTriggerActions,
  createGameStore,
  createInputBindings,
  getGameSnapshot,
  movingPlatformPosition,
} from "./index.js";

describe("engine state", () => {
  it("initializes and resets from a GameSpec", () => {
    const runner = getGenreSpec("endless-runner");
    const collector = getGenreSpec("top-down-collector");
    const store = createGameStore(runner);

    store.getState().start();
    store.getState().addScore(50);
    store.getState().loseLife();
    store.getState().reset(collector);

    expect(getGameSnapshot(store)).toMatchObject({
      phase: "ready",
      score: 0,
      lives: collector.player.lives,
      timerRemaining: 120,
    });
  });

  it("ends a timed game when the clock reaches zero", () => {
    const store = createGameStore(getGenreSpec("top-down-collector"));

    store.getState().start();
    store.getState().tick(120);

    expect(store.getState().phase).toBe("lost");
    expect(store.getState().timerRemaining).toBe(0);
  });

  it("stores a checkpoint and requests a respawn after a non-terminal death", () => {
    const store = createGameStore(getGenreSpec("platformer"));
    store.getState().start();
    store.getState().activateCheckpoint("midway", { x: 24, y: 2.2, z: 0 });
    store.getState().loseLife();

    expect(getGameSnapshot(store)).toMatchObject({
      checkpointId: "midway",
      checkpointPosition: { x: 24, y: 2.2, z: 0 },
      lives: 2,
      phase: "playing",
      respawnRevision: 1,
    });
  });

  it("does not request a respawn after the final life is lost", () => {
    const spec = structuredClone(getGenreSpec("platformer"));
    spec.player.lives = 1;
    const store = createGameStore(spec);
    store.getState().start();
    store.getState().loseLife();

    expect(store.getState()).toMatchObject({ lives: 0, phase: "lost", respawnRevision: 0 });
  });
});

describe("engine runtime API", () => {
  it("exposes a frozen API and delegates effects", () => {
    const store = createGameStore(getGenreSpec("platformer"));
    const shake = vi.fn();
    const api = createEngineRuntimeApi(store, { shake });

    api.score.add(25);
    api.player.teleport({ x: 2, y: 3, z: 0 });
    api.fx.shake(0.5);

    expect(Object.isFrozen(api)).toBe(true);
    expect(Object.isFrozen(api.player)).toBe(true);
    expect(api.score.get()).toBe(25);
    expect(api.player.getPosition()).toEqual({ x: 2, y: 3, z: 0 });
    expect(shake).toHaveBeenCalledWith(0.5);
  });
});

describe("input bindings", () => {
  it("groups multiple keys assigned to one action", () => {
    const bindings = createInputBindings([
      { key: "KeyA", action: "left", purpose: "Move left" },
      { key: "ArrowLeft", action: "left", purpose: "Move left" },
    ]);

    expect(bindings).toEqual([{ name: "left", keys: ["KeyA", "ArrowLeft"] }]);
  });
});

describe("entity motion", () => {
  it("moves from the origin to the declared offset and back deterministically", () => {
    const motion = { offset: [8, 2, 0] as [number, number, number], duration: 4, phase: 0 };
    const origin = { x: 10, y: 1, z: 0 };

    expect(movingPlatformPosition(origin, motion, 0)).toEqual(origin);
    expect(movingPlatformPosition(origin, motion, 2)).toEqual({ x: 18, y: 3, z: 0 });
    expect(movingPlatformPosition(origin, motion, 4).x).toBeCloseTo(10);
  });
});

describe("trigger actions", () => {
  it("executes only the bounded declarative action set", () => {
    const store = createGameStore(getGenreSpec("platformer"));
    store.getState().start();

    executeTriggerActions(store, [
      { type: "add-score", points: 25 },
      { type: "lose-life", amount: 1 },
      { type: "set-phase", phase: "won" },
    ]);

    expect(store.getState()).toMatchObject({ score: 25, lives: 2, phase: "won" });
  });
});
