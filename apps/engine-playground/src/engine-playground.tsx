import { GameRoot } from "@vega/engine";
import { genreSpecs } from "@vega/genres";
import { validateGameSpecForEngine, type GameGenre, type GameSpec } from "@vega/spec";
import { useEffect, useMemo, useState } from "react";

const formatSpec = (spec: GameSpec) => JSON.stringify(spec, null, 2);

export function EnginePlayground() {
  const [genre, setGenre] = useState<GameGenre>("platformer");
  const [source, setSource] = useState(() => formatSpec(genreSpecs.platformer));
  const [playableSpec, setPlayableSpec] = useState<GameSpec>(() => structuredClone(genreSpecs.platformer));

  const validation = useMemo(() => {
    try {
      const result = validateGameSpecForEngine(JSON.parse(source));
      return result.success
        ? {
            errors: [],
            spec: result.data,
            warnings: result.warnings.map((issue) => `${issue.path.join(".") || "spec"}: ${issue.message}`),
          }
        : { errors: result.issues.map((issue) => `${issue.path.join(".") || "spec"}: ${issue.message}`), warnings: [] };
    } catch (error) {
      return { errors: [error instanceof Error ? error.message : "Invalid JSON"], warnings: [] };
    }
  }, [source]);

  useEffect(() => {
    if (validation.spec) setPlayableSpec(validation.spec);
  }, [validation]);

  const errors = validation.errors;
  const warnings = validation.warnings;

  const selectGenre = (nextGenre: GameGenre) => {
    const nextSpec = structuredClone(genreSpecs[nextGenre]);
    setGenre(nextGenre);
    setSource(formatSpec(nextSpec));
    setPlayableSpec(nextSpec);
  };

  return (
    <main className="playground-shell">
      <header>
        <div>
          <p>DEV TOOL</p>
          <h1>Engine Playground</h1>
        </div>
        <label>
          Sample spec
          <select value={genre} onChange={(event) => selectGenre(event.target.value as GameGenre)}>
            <option value="platformer">Platformer</option>
            <option value="precision-platformer">Precision platformer</option>
            <option value="obstacle-course">Obstacle course</option>
            <option value="endless-runner">Endless runner</option>
            <option value="arcade-racer">Arcade racer</option>
            <option value="top-down-collector">Top-down collector</option>
            <option value="score-attack">Score attack</option>
            <option value="maze-escape">Maze escape</option>
            <option value="puzzle-escape">Puzzle escape</option>
            <option value="dungeon-escape">Dungeon escape</option>
            <option value="survival-dodge">Survival dodge</option>
            <option value="exploration">Exploration</option>
          </select>
        </label>
      </header>
      <div className="workspace">
        <section className="preview" aria-label="Playable engine preview">
          <GameRoot spec={playableSpec} />
        </section>
        <section className="editor-panel">
          <div className="editor-heading">
            <h2>GameSpec JSON</h2>
            <span className={errors.length ? "invalid" : "valid"}>
              {errors.length ? `${errors.length} errors` : warnings.length ? `Valid with ${warnings.length} warnings` : "Valid"}
            </span>
          </div>
          <textarea
            aria-label="GameSpec JSON editor"
            onChange={(event) => setSource(event.target.value)}
            spellCheck={false}
            value={source}
          />
          <div className="errors" aria-live="polite">
            {errors.slice(0, 8).map((error) => <p key={error}>{error}</p>)}
            {warnings.slice(0, 8).map((warning) => <p key={warning}>Warning: {warning}</p>)}
          </div>
        </section>
      </div>
    </main>
  );
}
