import { useFrame, useThree } from "@react-three/fiber";
import type { GameSpec } from "@vega/spec";
import { useRef } from "react";
import { Vector3 } from "three";

import { useGameStoreApi } from "./engine-context.js";

interface CameraControllerProps {
  spec: GameSpec;
}

export function CameraController({ spec }: CameraControllerProps) {
  const store = useGameStoreApi();
  const camera = useThree((state) => state.camera);
  const target = useRef(new Vector3());

  useFrame(() => {
    const player = store.getState().playerPosition;
    const smoothing = Math.max(0.01, spec.camera.smoothing);

    if (spec.camera.type === "side") {
      camera.position.lerp(new Vector3(player.x, player.y + 3, 12), smoothing);
      target.current.set(player.x + 2, player.y, 0);
    } else if (spec.player.controller === "topdown") {
      camera.position.lerp(new Vector3(player.x, 18, player.z + 10), smoothing);
      target.current.set(player.x, 0, player.z);
    } else {
      camera.position.lerp(new Vector3(player.x - 8, player.y + 5, player.z + 7), smoothing);
      target.current.set(player.x + 4, player.y, player.z);
    }

    camera.lookAt(target.current);
  });

  return null;
}
