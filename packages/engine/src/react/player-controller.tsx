import { useKeyboardControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { CapsuleCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import type { GameSpec } from "@vega/spec";
import { useRef } from "react";

import { useGameStoreApi } from "./engine-context.js";

interface PlayerControllerProps {
  spec: GameSpec;
}

export function PlayerController({ spec }: PlayerControllerProps) {
  const body = useRef<RapierRigidBody>(null);
  const [, getKeys] = useKeyboardControls();
  const store = useGameStoreApi();
  const spawnY = spec.player.controller === "topdown" ? 0.8 : 2;

  useFrame(() => {
    const rigidBody = body.current;
    const state = store.getState();
    if (!rigidBody || state.phase !== "playing") return;

    const keys = getKeys() as Record<string, boolean>;
    const velocity = rigidBody.linvel();
    const position = rigidBody.translation();
    const speed = spec.player.speed;
    const left = keys.left ? 1 : 0;
    const right = keys.right ? 1 : 0;
    const up = keys.up ? 1 : 0;
    const down = keys.down ? 1 : 0;

    if (spec.player.controller === "runner") {
      rigidBody.setLinvel({ x: speed, y: velocity.y, z: (right - left) * speed }, true);
    } else if (spec.player.controller === "topdown") {
      rigidBody.setLinvel({ x: (right - left) * speed, y: 0, z: (down - up) * speed }, true);
    } else {
      rigidBody.setLinvel({ x: (right - left) * speed, y: velocity.y, z: 0 }, true);
    }

    const isGrounded = Math.abs(velocity.y) < 0.12;
    if (keys.jump && isGrounded && spec.player.jumpForce > 0) {
      rigidBody.applyImpulse({ x: 0, y: spec.player.jumpForce, z: 0 }, true);
    }

    state.setPlayerPosition({ x: position.x, y: position.y, z: position.z });
    state.setPlayerVelocity({ x: velocity.x, y: velocity.y, z: velocity.z });

    if (position.y < spec.world.bounds.y.min) {
      state.loseLife();
      rigidBody.setTranslation({ x: 0, y: spawnY, z: 0 }, true);
      rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
  });

  const enabledTranslations: [boolean, boolean, boolean] =
    spec.player.controller === "topdown" ? [true, false, true] : [true, true, spec.world.mode !== "2d"];

  return (
    <RigidBody
      ref={body}
      colliders={false}
      enabledRotations={[false, false, false]}
      enabledTranslations={enabledTranslations}
      position={[0, spawnY, 0]}
    >
      <mesh castShadow>
        <capsuleGeometry args={[0.35, 0.8, 8, 16]} />
        <meshStandardMaterial
          color={spec.visuals.palette[0]}
          emissive={spec.visuals.palette[0]}
          emissiveIntensity={0.35}
          metalness={0.45}
          roughness={0.3}
        />
      </mesh>
      <CapsuleCollider args={[0.4, 0.35]} />
    </RigidBody>
  );
}
