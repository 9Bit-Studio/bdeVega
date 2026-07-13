import { createContext, useContext, type PropsWithChildren } from "react";
import { useStore } from "zustand";

import type { GameStore, GameStoreState } from "../store/game-store.js";

const GameStoreContext = createContext<GameStore | null>(null);

interface GameStoreProviderProps extends PropsWithChildren {
  store: GameStore;
}

export function GameStoreProvider({ children, store }: GameStoreProviderProps) {
  return <GameStoreContext.Provider value={store}>{children}</GameStoreContext.Provider>;
}

export function useGameStoreApi(): GameStore {
  const store = useContext(GameStoreContext);
  if (!store) throw new Error("useGameStoreApi must be used inside GameStoreProvider");
  return store;
}

export function useGameStore<T>(selector: (state: GameStoreState) => T): T {
  return useStore(useGameStoreApi(), selector);
}
