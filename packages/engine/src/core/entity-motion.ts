import type { EntityMotion } from "@vega/spec";

import type { Vector3State } from "../store/game-store.js";

export function movingPlatformPosition(
  origin: Vector3State,
  motion: EntityMotion,
  elapsedSeconds: number,
): Vector3State {
  const cycle = elapsedSeconds / motion.duration + motion.phase;
  const progress = (1 - Math.cos(cycle * Math.PI * 2)) / 2;
  return {
    x: origin.x + motion.offset[0] * progress,
    y: origin.y + motion.offset[1] * progress,
    z: origin.z + motion.offset[2] * progress,
  };
}
