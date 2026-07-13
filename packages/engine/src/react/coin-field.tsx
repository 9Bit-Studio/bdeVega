import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { InstancedMesh, Object3D, Vector3 } from "three";

import { useGameStoreApi } from "./engine-context.js";

export interface CoinItem {
  id: string;
  points: number;
  position: [number, number, number];
}

interface CoinFieldProps {
  color: string;
  items: CoinItem[];
}

export function CoinField({ color, items }: CoinFieldProps) {
  const mesh = useRef<InstancedMesh>(null);
  const store = useGameStoreApi();
  const collected = useRef(new Set<string>());
  const dummy = useMemo(() => new Object3D(), []);
  const player = useMemo(() => new Vector3(), []);
  const positions = useMemo(() => items.map((item) => new Vector3(...item.position)), [items]);

  useEffect(() => {
    if (!mesh.current) return;
    items.forEach((item, index) => {
      dummy.position.set(...item.position);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      mesh.current?.setMatrixAt(index, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  }, [dummy, items]);

  useFrame((frame) => {
    const state = store.getState();
    if (!mesh.current || state.phase !== "playing") return;
    player.set(state.playerPosition.x, state.playerPosition.y, state.playerPosition.z);
    const time = frame.clock.elapsedTime;

    items.forEach((item, index) => {
      if (collected.current.has(item.id)) return;
      if (player.distanceToSquared(positions[index]) <= 1.1) {
        collected.current.add(item.id);
        state.addScore(item.points);
        dummy.position.set(...item.position);
        dummy.scale.setScalar(0);
      } else {
        dummy.position.set(
          item.position[0],
          item.position[1] + Math.sin(time * 2.4 + index * 0.7) * 0.1,
          item.position[2],
        );
        dummy.rotation.set(0, time * 1.8 + index * 0.5, 0);
        dummy.scale.setScalar(1);
      }
      dummy.updateMatrix();
      mesh.current?.setMatrixAt(index, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, items.length]} castShadow>
      <octahedronGeometry args={[0.32, 0]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} metalness={0.6} roughness={0.25} />
    </instancedMesh>
  );
}
