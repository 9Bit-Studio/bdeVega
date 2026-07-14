import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { FixtureRecord, FixtureStore } from "./types.js";
export { generateOpenAIArtPack, type GeneratedArtImage, type OpenAIArtRequest } from "./art.js";

export class FileFixtureStore implements FixtureStore {
  constructor(private readonly directory: string) {}

  private pathFor(id: string) {
    const safeId = id.replace(/[^a-z0-9-_]/gi, "-");
    return join(this.directory, `${safeId}.json`);
  }

  async read(id: string): Promise<FixtureRecord | undefined> {
    try {
      return JSON.parse(await readFile(this.pathFor(id), "utf8")) as FixtureRecord;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw error;
    }
  }

  async write(id: string, fixture: FixtureRecord): Promise<void> {
    const path = this.pathFor(id);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(fixture, null, 2)}\n`, "utf8");
  }
}
