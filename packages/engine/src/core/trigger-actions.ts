import type { TriggerAction } from "@vega/spec";

import type { GameStore } from "../store/game-store.js";

export function executeTriggerActions(store: GameStore, actions: TriggerAction[]): void {
  for (const action of actions) {
    if (action.type === "add-score") {
      store.getState().addScore(action.points);
    } else if (action.type === "lose-life") {
      store.getState().loseLife(action.amount);
    } else {
      store.getState().setPhase(action.phase);
    }
  }
}
