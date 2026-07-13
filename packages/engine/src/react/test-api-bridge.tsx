import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";

import { installGameTestApi } from "../core/test-api.js";
import { useGameStoreApi } from "./engine-context.js";

export function TestApiBridge() {
  const store = useGameStoreApi();
  const fps = useRef(60);
  const elapsed = useRef(0);
  const frames = useRef(0);

  useFrame((_state, delta) => {
    elapsed.current += delta;
    frames.current += 1;
    if (elapsed.current >= 0.5) {
      fps.current = frames.current / elapsed.current;
      elapsed.current = 0;
      frames.current = 0;
    }
  });

  useEffect(() => installGameTestApi(store, () => fps.current), [store]);

  return null;
}
