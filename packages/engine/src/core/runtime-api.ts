import type { LevelEntity } from "@vega/spec";

import {
  getGameSnapshot,
  type GameStateSnapshot,
  type GameStore,
  type Vector3State,
} from "../store/game-store.js";

export interface EngineEffects {
  burst?: (preset: string, position: Vector3State) => void;
  shake?: (intensity: number) => void;
  spawn?: (entity: LevelEntity) => void;
}

export interface EngineRuntimeApi {
  readonly player: {
    getPosition: () => Vector3State;
    getVelocity: () => Vector3State;
    teleport: (position: Vector3State) => void;
  };
  readonly score: {
    add: (points: number) => void;
    get: () => number;
  };
  readonly lives: {
    get: () => number;
    lose: (amount?: number) => void;
  };
  readonly fx: {
    burst: (preset: string, position?: Vector3State) => void;
    shake: (intensity?: number) => void;
  };
  readonly game: {
    getState: () => GameStateSnapshot;
    lose: () => void;
    win: () => void;
  };
  spawn: (entity: LevelEntity) => void;
}

export function createEngineRuntimeApi(
  store: GameStore,
  effects: EngineEffects = {},
): Readonly<EngineRuntimeApi> {
  const player = Object.freeze({
    getPosition: () => ({ ...store.getState().playerPosition }),
    getVelocity: () => ({ ...store.getState().playerVelocity }),
    teleport: (position: Vector3State) => store.getState().setPlayerPosition(position),
  });
  const score = Object.freeze({
    add: (points: number) => store.getState().addScore(points),
    get: () => store.getState().score,
  });
  const lives = Object.freeze({
    get: () => store.getState().lives,
    lose: (amount = 1) => store.getState().loseLife(amount),
  });
  const fx = Object.freeze({
    burst: (preset: string, position = player.getPosition()) => effects.burst?.(preset, position),
    shake: (intensity = 0.25) => effects.shake?.(Math.max(0, intensity)),
  });
  const game = Object.freeze({
    getState: () => getGameSnapshot(store),
    lose: () => store.getState().setPhase("lost"),
    win: () => store.getState().setPhase("won"),
  });

  return Object.freeze({
    player,
    score,
    lives,
    fx,
    game,
    spawn: (entity: LevelEntity) => effects.spawn?.(structuredClone(entity)),
  });
}
