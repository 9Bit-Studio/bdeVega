import { CuboidCollider, Physics, RigidBody } from "@react-three/rapier";
import type { GameSpec, LevelEntity } from "@vega/spec";
import { useState } from "react";

import { CameraController } from "./camera-controller.js";
import { CoinField, type CoinItem } from "./coin-field.js";
import { useGameStoreApi } from "./engine-context.js";
import { PlayerController } from "./player-controller.js";
import { TestApiBridge } from "./test-api-bridge.js";

interface GameSceneProps {
  spec: GameSpec;
}

interface EntityMarkerProps {
  entity: LevelEntity;
  index: number;
  position: [number, number, number];
  spec: GameSpec;
}

function EntityMarker({ entity, index, position, spec }: EntityMarkerProps) {
  const [collected, setCollected] = useState(false);
  const store = useGameStoreApi();
  if (collected) return null;

  const onEnter = () => {
    if (entity.type === "coin") {
      store.getState().addScore(entity.points ?? 10);
      setCollected(true);
    } else if (entity.type === "goal") {
      store.getState().setPhase("won");
    } else if (entity.type === "hazard" || entity.type === "enemy") {
      store.getState().loseLife();
    }
  };

  const isSensor = ["coin", "goal", "hazard", "enemy", "trigger", "checkpoint"].includes(entity.type);
  const color = entity.type === "goal" ? "#22c55e" : "#ef4444";

  return (
    <RigidBody key={`${entity.id}-${index}`} type="fixed" colliders={false} position={position}>
      <mesh>
        <boxGeometry args={[0.7, 0.7, 0.7]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
      </mesh>
      <CuboidCollider args={[0.45, 0.45, 0.45]} sensor={isSensor} onIntersectionEnter={onEnter} />
    </RigidBody>
  );
}

function entityPositions(entity: LevelEntity): [number, number, number][] {
  if (entity.positions) return entity.positions;
  if (!entity.pattern) return [];

  return Array.from({ length: entity.pattern.count }, (_, index) => [
    entity.pattern!.origin[0] + entity.pattern!.spacing[0] * index,
    entity.pattern!.origin[1] + entity.pattern!.spacing[1] * index,
    entity.pattern!.origin[2] + entity.pattern!.spacing[2] * index,
  ]);
}

export function GameScene({ spec }: GameSceneProps) {
  const isCollector = spec.player.controller === "topdown";
  const groundSize: [number, number, number] = isCollector ? [36, 0.5, 36] : [220, 0.5, 8];
  const coins: CoinItem[] = spec.level.entities
    .filter((entity) => entity.type === "coin")
    .flatMap((entity) => entityPositions(entity).map((position, index) => ({
      id: `${entity.id}-${index}`,
      points: entity.points ?? 10,
      position,
    })));

  return (
    <>
      <color attach="background" args={[spec.visuals.palette.at(-1) ?? "#090b0c"]} />
      <ambientLight intensity={0.5} />
      <directionalLight intensity={1.8} position={[8, 16, 8]} />
      <CameraController spec={spec} />
      <TestApiBridge />
      <Physics gravity={spec.world.gravity}>
        <RigidBody type="fixed" colliders={false} position={isCollector ? [0, 0, 0] : [groundSize[0] / 2 - 10, -0.5, 0]}>
          <mesh>
            <boxGeometry args={groundSize} />
            <meshStandardMaterial color={spec.visuals.palette[2] ?? "#1f2937"} roughness={0.65} />
          </mesh>
          <CuboidCollider args={[groundSize[0] / 2, groundSize[1] / 2, groundSize[2] / 2]} />
        </RigidBody>
        <PlayerController spec={spec} />
        <CoinField color="#facc15" items={coins} />
        {spec.level.entities.filter((entity) => entity.type !== "coin").flatMap((entity) =>
          entityPositions(entity).map((position, index) => (
            <EntityMarker key={`${entity.id}-${index}`} entity={entity} index={index} position={position} spec={spec} />
          )),
        )}
      </Physics>
    </>
  );
}
