import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture, useKeyboardControls } from '@react-three/drei';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { useGameStore } from '../store/useGameStore';
import * as THREE from 'three';

export const Player2D = ({ spriteUrl = '/sprite.png' }) => {
  const rb = useRef();
  const meshGroup = useRef();
  const [, getKeys] = useKeyboardControls();
  
  // Zustand Store
  const setPlayerPosition = useGameStore((state) => state.setPlayerPosition);
  const loseLife = useGameStore((state) => state.loseLife);
  const respawnCount = useGameStore((state) => state.respawnCount);
  const gameState = useGameStore((state) => state.gameState);
  const triggerParticles = useGameStore((state) => state.triggerParticles);

  // Particles & movement refs
  const runParticleTimer = useRef(0);

  // Load the generated cute player texture
  const texture = useTexture(spriteUrl);
  texture.magFilter = THREE.NearestFilter; // Maintain pixel art sharpness
  texture.minFilter = THREE.NearestFilter;

  // Handle Respawning
  const lastRespawn = useRef(0);
  useEffect(() => {
    if (rb.current && respawnCount > lastRespawn.current) {
      rb.current.setTranslation({ x: 0, y: 3, z: 0 }, true);
      rb.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      lastRespawn.current = respawnCount;
    }
  }, [respawnCount]);

  useFrame((state, delta) => {
    if (!rb.current || gameState !== 'PLAYING') return;

    const { left, right, jump } = getKeys();
    const velocity = rb.current.linvel();
    const pos = rb.current.translation();
    const speed = 7.5; // Matches the 3D character speed

    // Track position in store for camera & spawner
    setPlayerPosition({ x: pos.x, y: pos.y, z: 0 });

    // Pit Death Detection
    if (pos.y < -6) {
      loseLife();
      return;
    }

    // Auto-Runner 2D Movement:
    // Automatically runs to the right along the X-axis.
    // Left/Right keys allow the player to accelerate or brake/dodge obstacles horizontally on screen.
    const targetVelX = speed + (right ? 3.0 : 0) - (left ? 3.0 : 0);
    const lerpFactor = 0.15;
    const nextVelX = THREE.MathUtils.lerp(velocity.x, targetVelX, lerpFactor);

    // Orientation flipping (cute retro look)
    if (left) {
      if (meshGroup.current) meshGroup.current.rotation.y = Math.PI; // Flip sprite to face left
    } else {
      if (meshGroup.current) meshGroup.current.rotation.y = 0; // Face right (default running direction)
    }

    // Jumping Mechanics & Jump Particle Spawner
    const isOnGround = Math.abs(velocity.y) < 0.15;
    if (jump && isOnGround) {
      rb.current.applyImpulse({ x: 0, y: 7.5, z: 0 }, true);
      triggerParticles({ x: pos.x, y: pos.y, z: 0 }, 'jump');
    }

    rb.current.setLinvel({ x: nextVelX, y: velocity.y, z: 0 }, true);

    // High fidelity running dust trail particle trigger
    if (isOnGround && nextVelX > 1.0) {
      runParticleTimer.current += delta;
      if (runParticleTimer.current >= 0.08) {
        runParticleTimer.current = 0;
        triggerParticles({ x: pos.x, y: pos.y - 0.4, z: 0 }, 'run');
      }
    } else {
      runParticleTimer.current = 0;
    }

    // --- GAME JUICE (Programmatic Animations) ---
    if (meshGroup.current) {
      const time = state.clock.getElapsedTime();
      
      // Basic scales
      let scaleX = 1.3;
      let scaleY = 1.3;

      // Squash and stretch based on vertical velocity
      if (Math.abs(velocity.y) > 0.2) {
        scaleY = 1.3 + velocity.y * 0.04;
        scaleX = 1.3 - velocity.y * 0.04;
      } else if (Math.abs(nextVelX) > 0.1) {
        // Walking bobbing effect
        scaleY = 1.3 + Math.sin(time * 18) * 0.1;
        scaleX = 1.3 - Math.sin(time * 18) * 0.05;
      }

      meshGroup.current.scale.set(scaleX, scaleY, 1.3);
    }
  });

  return (
    <RigidBody 
      ref={rb} 
      colliders={false} 
      enabledRotations={[false, false, false]} 
      position={[0, 2, 0]}
      lockTranslations={[false, false, true]} // Lock Z translation for true 2D
    >
      <group ref={meshGroup}>
        <mesh castShadow>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={texture} transparent={true} alphaTest={0.3} side={THREE.DoubleSide} />
        </mesh>
      </group>
      <CuboidCollider args={[0.45, 0.5, 0.45]} />
      {/* 2D Player Emissive Aura */}
      <pointLight 
        position={[0, 0, 0.8]} 
        intensity={4.5} 
        color="#00f0ff" 
        distance={10} 
        decay={1.5} 
      />
    </RigidBody>
  );
};
