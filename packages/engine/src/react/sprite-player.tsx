import { useTexture } from "@react-three/drei";
import type { GameAssetPack } from "@vega/spec";
import { NearestFilter, SRGBColorSpace } from "three";

interface SpritePlayerProps {
  asset: GameAssetPack["player"];
}

/** A visual-only sprite; collision and movement stay in PlayerController. */
export function SpritePlayer({ asset }: SpritePlayerProps) {
  const texture = useTexture(asset.imageUrl);
  texture.colorSpace = SRGBColorSpace;
  texture.magFilter = NearestFilter;

  return (
    <mesh castShadow position={[0, 0.2, 0.04]}>
      <planeGeometry args={[asset.width, asset.height]} />
      <meshBasicMaterial map={texture} transparent alphaTest={0.05} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}
