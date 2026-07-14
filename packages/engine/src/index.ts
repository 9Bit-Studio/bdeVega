export { createInputBindings, type EngineInputBinding } from "./core/input.js";
export { movingPlatformPosition } from "./core/entity-motion.js";
export { executeTriggerActions } from "./core/trigger-actions.js";
export { installGameTestApi, type GameTestApi } from "./core/test-api.js";
export {
  createEngineRuntimeApi,
  type EngineEffects,
  type EngineRuntimeApi,
} from "./core/runtime-api.js";
export {
  createGameStore,
  getGameSnapshot,
  type GamePhase,
  type GameStateActions,
  type GameStateSnapshot,
  type GameStore,
  type GameStoreState,
  type Vector3State,
} from "./store/game-store.js";
export { GameRoot, type GameRootProps } from "./react/game-root.js";
