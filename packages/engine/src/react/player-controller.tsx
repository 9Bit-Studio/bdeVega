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
  const lastGroundedAt = useRef(0);
  const lastJumpAt = useRef(-1);

  useFrame((frame, delta) => {
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
    // exponential smoothing toward the target velocity so movement accelerates
    // and stops with momentum instead of snapping
    const blend = 1 - Math.exp(-14 * delta);
    const steer = (current: number, target: number) => current + (target - current) * blend;

    if (spec.player.controller === "runner") {
      rigidBody.setLinvel({ x: speed, y: velocity.y, z: steer(velocity.z, (right - left) * speed) }, true);
    } else if (spec.player.controller === "topdown") {
      let moveX = right - left;
      let moveZ = down - up;
      const magnitude = Math.hypot(moveX, moveZ);
      if (magnitude > 1) {
        moveX /= magnitude;
        moveZ /= magnitude;
      }
      rigidBody.setLinvel({ x: steer(velocity.x, moveX * speed), y: 0, z: steer(velocity.z, moveZ * speed) }, true);
    } else {
      rigidBody.setLinvel({ x: steer(velocity.x, (right - left) * speed), y: velocity.y, z: 0 }, true);
    }

    const now = frame.clock.elapsedTime;
    if (Math.abs(velocity.y) < 0.12) lastGroundedAt.current = now;
    // 120ms coyote window so jumps at platform edges still register
    const canJump = now - lastGroundedAt.current < 0.12 && now - lastJumpAt.current > 0.25;
    if (keys.jump && canJump && spec.player.jumpForce > 0) {
      lastJumpAt.current = now;
      rigidBody.applyImpulse({ x: 0, y: spec.player.jumpForce, z: 0 }, true);
    }
    // shorter hop when jump is released early — variable jump height
    if (!keys.jump && velocity.y > 2) {
      rigidBody.setLinvel({ x: velocity.x, y: velocity.y * Math.exp(-6 * delta), z: velocity.z }, true);
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
