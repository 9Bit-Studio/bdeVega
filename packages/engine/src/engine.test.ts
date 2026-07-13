import { getGenreSpec } from "@vega/genres";
import { describe, expect, it, vi } from "vitest";

import {
  createEngineRuntimeApi,
  createGameStore,
  createInputBindings,
  getGameSnapshot,
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
