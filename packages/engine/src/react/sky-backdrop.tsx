import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { GameAssetPack } from "@vega/spec";
import { useRef } from "react";
import { Group, SRGBColorSpace } from "three";

import { useGameStoreApi } from "./engine-context.js";

interface SkyBackdropProps {
  asset: GameAssetPack["background"];
}

/** Keeps a wide painted backdrop aligned with the side-follow camera. */
export function SkyBackdrop({ asset }: SkyBackdropProps) {
  const group = useRef<Group>(null);
  const store = useGameStoreApi();
  const texture = useTexture(asset.imageUrl);
  texture.colorSpace = SRGBColorSpace;

  useFrame(() => {
    if (!group.current) return;
    const player = store.getState().playerPosition;
    group.current.position.set(player.x + 3, 5.2, -4.5);
  });

  return (
    <group ref={group} renderOrder={-2}>
      <mesh>
        <planeGeometry args={[asset.width, asset.height]} />
        <meshBasicMaterial map={texture} toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  );
}
