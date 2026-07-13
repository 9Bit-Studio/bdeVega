import { KeyboardControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type { GameSpec } from "@vega/spec";
import { Suspense, useEffect, useMemo } from "react";
import { ACESFilmicToneMapping } from "three";

import { createInputBindings } from "../core/input.js";
import { createGameStore } from "../store/game-store.js";
import { GameStoreProvider } from "./engine-context.js";
import { GameHud } from "./game-hud.js";
import { GameScene } from "./game-scene.js";

const engineStyles = `
.vega-game-root{position:relative;width:100%;height:100%;min-height:320px;overflow:hidden;background:#090b0c;color:#fff;font-family:ui-sans-serif,system-ui,sans-serif}
.vega-canvas{position:absolute;inset:0}
.vega-hud{position:absolute;z-index:2;top:14px;left:14px;display:flex;align-items:center;gap:12px;padding:8px 12px;border:1px solid rgb(255 255 255/12%);border-radius:10px;background:rgb(5 8 9/72%);backdrop-filter:blur(12px);font-size:13px}
.vega-hud button{border:0;border-radius:6px;padding:5px 9px;background:#3ddc97;color:#062116;cursor:pointer;font:inherit;font-weight:700}
`;

export interface GameRootProps {
  autoStart?: boolean;
  className?: string;
  spec: GameSpec;
}

export function GameRoot({ autoStart = true, className, spec }: GameRootProps) {
  const store = useMemo(() => createGameStore(spec), [spec]);
  const bindings = useMemo(() => createInputBindings(spec.controls), [spec.controls]);

  useEffect(() => {
    if (autoStart) store.getState().start();
  }, [autoStart, store]);

  return (
    <GameStoreProvider store={store}>
      <KeyboardControls map={bindings}>
        <section className={`vega-game-root${className ? ` ${className}` : ""}`} aria-label={spec.meta.title}>
          <style>{engineStyles}</style>
          <GameHud />
          <div className="vega-canvas" data-game-canvas>
            <Canvas
              camera={{ fov: 50, position: [0, 5, 12] }}
              dpr={[1, 1.5]}
              gl={{ antialias: true, powerPreference: "high-performance", toneMapping: ACESFilmicToneMapping }}
              shadows
            >
              <Suspense fallback={null}>
                <GameScene spec={spec} />
              </Suspense>
            </Canvas>
          </div>
        </section>
      </KeyboardControls>
    </GameStoreProvider>
  );
}
