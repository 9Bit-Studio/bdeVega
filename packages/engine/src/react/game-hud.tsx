import { useGameStore } from "./engine-context.js";

export function GameHud() {
  const phase = useGameStore((state) => state.phase);
  const score = useGameStore((state) => state.score);
  const lives = useGameStore((state) => state.lives);
  const timer = useGameStore((state) => state.timerRemaining);
  const reset = useGameStore((state) => state.reset);
  const start = useGameStore((state) => state.start);

  return (
    <div className="vega-hud" data-game-phase={phase}>
      <span>Score {score}</span>
      <span>Lives {lives}</span>
      {timer === null ? null : <span>Time {Math.ceil(timer)}</span>}
      {phase === "ready" ? <button onClick={start}>Play</button> : null}
      {phase === "won" || phase === "lost" ? <button onClick={() => { reset(); start(); }}>Play again</button> : null}
      {phase === "won" ? <strong>You win</strong> : null}
      {phase === "lost" ? <strong>Game over</strong> : null}
    </div>
  );
}
