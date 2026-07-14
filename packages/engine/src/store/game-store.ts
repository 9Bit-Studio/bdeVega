import type { GameSpec } from "@vega/spec";
import { createStore, type StoreApi } from "zustand/vanilla";

export type GamePhase = "ready" | "playing" | "won" | "lost";

export interface Vector3State {
  x: number;
  y: number;
  z: number;
}

export interface GameStateSnapshot {
  phase: GamePhase;
  score: number;
  lives: number;
  timerRemaining: number | null;
  playerPosition: Vector3State;
  playerVelocity: Vector3State;
  checkpointId: string | null;
  checkpointPosition: Vector3State | null;
  respawnRevision: number;
}

export interface GameStateActions {
  activateCheckpoint: (checkpointId: string, position: Vector3State) => void;
  addScore: (points: number) => void;
  loseLife: (amount?: number) => void;
  reset: (nextSpec?: GameSpec) => void;
  setPhase: (phase: GamePhase) => void;
  setPlayerPosition: (position: Vector3State) => void;
  setPlayerVelocity: (velocity: Vector3State) => void;
  start: () => void;
  tick: (deltaSeconds: number) => void;
}

export type GameStoreState = GameStateSnapshot & GameStateActions;
export type GameStore = StoreApi<GameStoreState>;

const origin = (): Vector3State => ({ x: 0, y: 0, z: 0 });

function stateFromSpec(spec: GameSpec): GameStateSnapshot {
  return {
    phase: "ready",
    score: 0,
    lives: spec.player.lives,
    timerRemaining: spec.rules.timer,
    playerPosition: origin(),
    playerVelocity: origin(),
    checkpointId: null,
    checkpointPosition: null,
    respawnRevision: 0,
  };
}

export function createGameStore(initialSpec: GameSpec): GameStore {
  let activeSpec = initialSpec;

  return createStore<GameStoreState>()((set, get) => ({
    ...stateFromSpec(activeSpec),
    activateCheckpoint: (checkpointId, checkpointPosition) => set({
      checkpointId,
      checkpointPosition: { ...checkpointPosition },
    }),
    addScore: (points) => set((state) => ({ score: state.score + points })),
    loseLife: (amount = 1) =>
      set((state) => {
        const lives = Math.max(0, state.lives - Math.max(0, amount));
        return {
          lives,
          phase: lives === 0 ? "lost" : state.phase,
          respawnRevision: lives === 0 ? state.respawnRevision : state.respawnRevision + 1,
        };
      }),
    reset: (nextSpec = activeSpec) => {
      activeSpec = nextSpec;
      set(stateFromSpec(activeSpec));
    },
    setPhase: (phase) => set({ phase }),
    setPlayerPosition: (playerPosition) => set({ playerPosition: { ...playerPosition } }),
    setPlayerVelocity: (playerVelocity) => set({ playerVelocity: { ...playerVelocity } }),
    start: () => set({ phase: "playing" }),
    tick: (deltaSeconds) => {
      const state = get();
      if (state.phase !== "playing" || state.timerRemaining === null) return;

      const timerRemaining = Math.max(0, state.timerRemaining - Math.max(0, deltaSeconds));
      set({
        timerRemaining,
        phase: timerRemaining === 0 ? "lost" : state.phase,
      });
    },
  }));
}

export function getGameSnapshot(store: GameStore): GameStateSnapshot {
  const state = store.getState();
  return {
    phase: state.phase,
    score: state.score,
    lives: state.lives,
    timerRemaining: state.timerRemaining,
    playerPosition: { ...state.playerPosition },
    playerVelocity: { ...state.playerVelocity },
    checkpointId: state.checkpointId,
    checkpointPosition: state.checkpointPosition ? { ...state.checkpointPosition } : null,
    respawnRevision: state.respawnRevision,
  };
}
