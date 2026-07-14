import { CuboidCollider, Physics, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import type { GameSpec, LevelEntity } from "@vega/spec";
import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";
import { useStore } from "zustand";

import { CameraController } from "./camera-controller.js";
import { movingPlatformPosition } from "../core/entity-motion.js";
import { executeTriggerActions } from "../core/trigger-actions.js";
import { CoinField, type CoinItem } from "./coin-field.js";
import { useGameStoreApi } from "./engine-context.js";
import { PlayerController } from "./player-controller.js";
import { SkyBackdrop } from "./sky-backdrop.js";
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

function MovingPlatform({ entity, position, color }: Pick<EntityMarkerProps, "entity" | "position"> & { color: string }) {
  const body = useRef<RapierRigidBody>(null);
  const motion = entity.motion ?? { offset: [0, 2, 0], duration: 3, phase: 0 };

  useFrame((state) => {
    const next = movingPlatformPosition(
      { x: position[0], y: position[1], z: position[2] },
      motion,
      state.clock.elapsedTime,
    );
    body.current?.setNextKinematicTranslation(next);
  });

  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false} position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[3, 0.4, 2.5]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.12} roughness={0.55} />
      </mesh>
      <CuboidCollider args={[1.5, 0.2, 1.25]} />
    </RigidBody>
  );
}

function GoalBeacon({ color }: { color: string }) {
  const ring = useRef<Group>(null);
  useFrame((state) => {
    if (!ring.current) return;
    ring.current.rotation.y = state.clock.elapsedTime * 1.2;
    ring.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.15;
  });
  return (
    <group ref={ring}>
      <mesh castShadow>
        <torusGeometry args={[0.55, 0.09, 12, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.4} metalness={0.6} roughness={0.2} />
      </mesh>
      <pointLight color={color} intensity={4} distance={6} />
    </group>
  );
}

function HazardSpike({ color }: { color: string }) {
  return (
    <mesh castShadow position={[0, -0.1, 0]}>
      <coneGeometry args={[0.4, 0.9, 6]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} roughness={0.35} metalness={0.3} />
    </mesh>
  );
}

function EnemyOrb({ color }: { color: string }) {
  const orb = useRef<Group>(null);
  useFrame((state) => {
    if (!orb.current) return;
    orb.current.position.y = Math.sin(state.clock.elapsedTime * 3) * 0.12;
  });
  return (
    <group ref={orb}>
      <mesh castShadow>
        <icosahedronGeometry args={[0.38, 1]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} roughness={0.25} metalness={0.5} />
      </mesh>
    </group>
  );
}

function CheckpointBeacon({ active, color }: { active: boolean; color: string }) {
  return (
    <group>
      <mesh castShadow>
        <cylinderGeometry args={[0.12, 0.16, 1.5, 10]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={active ? 1.5 : 0.25} />
      </mesh>
      <mesh castShadow position={[0.38, 0.45, 0]}>
        <planeGeometry args={[0.75, 0.5]} />
        <meshStandardMaterial color={active ? "#ffffff" : color} emissive={color} emissiveIntensity={active ? 1 : 0.2} side={2} />
      </mesh>
      {active ? <pointLight color={color} intensity={3} distance={5} /> : null}
    </group>
  );
}

function TriggerGate({ color, spent }: { color: string; spent: boolean }) {
  return (
    <mesh castShadow>
      <torusGeometry args={[0.7, 0.12, 8, 24]} />
      <meshStandardMaterial
        color={spent ? "#64748b" : color}
        emissive={color}
        emissiveIntensity={spent ? 0.05 : 0.8}
        transparent
        opacity={spent ? 0.35 : 0.8}
      />
    </mesh>
  );
}

function EntityMarker({ entity, index, position, spec }: EntityMarkerProps) {
  const store = useGameStoreApi();
  const [triggered, setTriggered] = useState(false);
  const checkpointId = `${entity.id}-${index}`;
  const active = useStore(store, (state) => state.checkpointId === checkpointId);

  const onEnter = () => {
    if (entity.type === "goal") {
      store.getState().setPhase("won");
    } else if (entity.type === "hazard" || entity.type === "enemy") {
      store.getState().loseLife();
    } else if (entity.type === "checkpoint") {
      const state = store.getState();
      if (state.checkpointId !== checkpointId) {
        state.activateCheckpoint(checkpointId, { x: position[0], y: position[1] + 1.2, z: position[2] });
        state.addScore(entity.points ?? spec.rules.scoring.find((rule) => rule.event === "checkpoint")?.points ?? 0);
      }
    } else if (entity.type === "trigger" && entity.trigger && !(triggered && entity.trigger.once)) {
      executeTriggerActions(store, entity.trigger.actions);
      if (entity.trigger.once) setTriggered(true);
    }
  };

  const isSensor = ["coin", "goal", "hazard", "enemy", "trigger", "checkpoint"].includes(entity.type);
  const goalColor = "#22c55e";
  const dangerColor = spec.visuals.palette[1] ?? "#ef4444";

  return (
    <RigidBody key={`${entity.id}-${index}`} type="fixed" colliders={false} position={position}>
      {entity.type === "goal" ? (
        <GoalBeacon color={goalColor} />
      ) : entity.type === "hazard" ? (
        <HazardSpike color="#ef4444" />
      ) : entity.type === "enemy" ? (
        <EnemyOrb color={dangerColor} />
      ) : entity.type === "checkpoint" ? (
        <CheckpointBeacon active={active} color={spec.visuals.palette[0] ?? "#2dd4bf"} />
      ) : entity.type === "trigger" ? (
        <TriggerGate color={spec.visuals.palette[0] ?? "#2dd4bf"} spent={triggered} />
      ) : (
        <mesh castShadow>
          <boxGeometry args={[0.7, 0.7, 0.7]} />
          <meshStandardMaterial color={dangerColor} emissive={dangerColor} emissiveIntensity={0.6} />
        </mesh>
      )}
      <CuboidCollider
        args={entity.type === "checkpoint" ? [0.65, 0.9, 0.65] : [0.45, 0.45, 0.45]}
        sensor={isSensor}
        onIntersectionEnter={(event) => {
          if (event.other.rigidBodyObject?.userData.kind === "player") onEnter();
        }}
      />
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
  const backgroundColor = spec.visuals.palette.at(-1) ?? "#090b0c";
  const groundColor = spec.visuals.palette[2] ?? "#1f2937";
  const coins: CoinItem[] = spec.level.entities
    .filter((entity) => entity.type === "coin")
    .flatMap((entity) => entityPositions(entity).map((position, index) => ({
      id: `${entity.id}-${index}`,
      points: entity.points ?? 10,
      position,
    })));

  return (
    <>
      <color attach="background" args={[backgroundColor]} />
      <fog attach="fog" args={[backgroundColor, 25, isCollector ? 70 : 90]} />
      <hemisphereLight args={["#bfd9ff", groundColor, 0.55]} />
      <directionalLight
        castShadow
        intensity={1.8}
        position={[8, 16, 8]}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-bias={-0.0002}
      />
      <CameraController spec={spec} />
      <TestApiBridge />
      {spec.camera.type === "side" ? <SkyBackdrop asset={spec.assets.background} /> : null}
      <Physics gravity={spec.world.gravity}>
        <RigidBody type="fixed" colliders={false} position={isCollector ? [0, 0, 0] : [groundSize[0] / 2 - 10, -0.5, 0]}>
          <mesh receiveShadow>
            <boxGeometry args={groundSize} />
            <meshStandardMaterial
              color={groundColor}
              emissive={spec.visuals.palette[0] ?? "#3ddc97"}
              emissiveIntensity={0.04}
              roughness={0.85}
              metalness={0.1}
            />
          </mesh>
          <CuboidCollider args={[groundSize[0] / 2, groundSize[1] / 2, groundSize[2] / 2]} />
        </RigidBody>
        <PlayerController spec={spec} />
        <CoinField color="#facc15" items={coins} />
        {spec.level.entities.filter((entity) => entity.type !== "coin").flatMap((entity) =>
          entityPositions(entity).map((position, index) => (
            entity.type === "moving-platform" ? (
              <MovingPlatform key={`${entity.id}-${index}`} entity={entity} position={position} color={spec.visuals.palette[0] ?? "#2dd4bf"} />
            ) : (
              <EntityMarker key={`${entity.id}-${index}`} entity={entity} index={index} position={position} spec={spec} />
            )
          )),
        )}
      </Physics>
    </>
  );
}
