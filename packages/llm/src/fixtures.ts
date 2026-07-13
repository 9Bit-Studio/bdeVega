import type { FixtureRecord, FixtureStore } from "./types.js";

export class MemoryFixtureStore implements FixtureStore {
  readonly fixtures = new Map<string, FixtureRecord>();

  constructor(initial: Record<string, FixtureRecord> = {}) {
    for (const [id, fixture] of Object.entries(initial)) this.fixtures.set(id, fixture);
  }

  async read(id: string): Promise<FixtureRecord | undefined> {
    return this.fixtures.get(id);
  }

  async write(id: string, fixture: FixtureRecord): Promise<void> {
    this.fixtures.set(id, fixture);
  }
}
