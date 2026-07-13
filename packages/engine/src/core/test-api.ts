import { getGameSnapshot, type GameStore } from "../store/game-store.js";

export interface GameTestApi {
  fastForward: (seconds: number) => void;
  getFps: () => number;
  getState: () => ReturnType<typeof getGameSnapshot>;
  version: "1";
}

declare global {
  interface Window {
    __gameTestApi?: GameTestApi;
  }
}

export function installGameTestApi(store: GameStore, getFps: () => number): () => void {
  if (typeof window === "undefined") return () => undefined;

  const api: GameTestApi = Object.freeze({
    fastForward: (seconds: number) => store.getState().tick(Math.max(0, seconds)),
    getFps,
    getState: () => getGameSnapshot(store),
    version: "1",
  });

  window.__gameTestApi = api;
  return () => {
    if (window.__gameTestApi === api) delete window.__gameTestApi;
  };
}
