import type { GameControl } from "@vega/spec";

export interface EngineInputBinding {
  name: string;
  keys: string[];
}

export function createInputBindings(controls: GameControl[]): EngineInputBinding[] {
  const bindings = new Map<string, string[]>();

  for (const control of controls) {
    const keys = bindings.get(control.action) ?? [];
    if (!keys.includes(control.key)) {
      keys.push(control.key);
    }
    bindings.set(control.action, keys);
  }

  return Array.from(bindings, ([name, keys]) => ({ name, keys }));
}
