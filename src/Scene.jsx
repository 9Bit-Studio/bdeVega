import { PerspectiveCamera, Environment } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { useGameStore } from './store/useGameStore';
import { Suspense, useRef, useMemo } from 'react';
import { EndlessWorld } from './components/EndlessWorld';
import { CameraController } from './components/CameraController';
import { ParticleSystem } from './components/ParticleSystem';
import { Parallax3DBackground } from './components/Parallax3DBackground';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ----------------------------------------------------
// Glowing Neon Dust Particle System (HDR Atmosphere)
// ----------------------------------------------------
const GlowingDust = ({ count = 70 }) => {
  const mesh = useRef();

  // Generate random initial positions & speeds for dust particles
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      temp.push({
        offsetX: Math.random() * 40 - 20, // Spread around player X
        offsetY: Math.random() * 8 - 1,   // Y height spread
        offsetZ: Math.random() * 8 - 4,   // Z depth spread
        speedX: Math.random() * 0.4 + 0.1,
        speedY: Math.random() * 0.3 + 0.1,
        scale: Math.random() * 0.07 + 0.03,
        phase: Math.random() * Math.PI * 2,
      });
    }
    return temp;
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (!mesh.current) return;
    const t = state.clock.getElapsedTime();
    const px = useGameStore.getState().playerPosition.x;

    particles.forEach((p, i) => {
      // Drift the particles slowly
      let x = px + p.offsetX - (t * p.speedX * 3) % 40;
      // Wrap X position so they stay in a loop around the player
      if (x < px - 20) x += 40;
      if (x > px + 20) x -= 40;

      const y = p.offsetY + Math.sin(t * p.speedY + p.phase) * 0.8;
      const z = p.offsetZ + Math.cos(t * 0.2 + p.phase) * 0.4;

      dummy.position.set(x, y, z);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    });

    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[null, null, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial 
        color="#00f0ff" 
        toneMapped={false} 
        transparent 
        opacity={0.5}
      />
    </instancedMesh>
  );
};

export const Scene = ({ children }) => {
  const lightRef = useRef();

  useFrame(() => {
    if (lightRef.current) {
      const px = useGameStore.getState().playerPosition.x;
      lightRef.current.position.set(px - 10, 18, 8);
    }
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[5, 5, 10]} fov={50} />

      {/* Dynamic Camera tracking */}
      <CameraController />

      {/* Low ambient light for an immersive, high-contrast cyberpunk atmosphere */}
      <ambientLight intensity={0.12} color="#0c0c1e" />
      
      {/* Dynamic Moonlight that follows the player for endless real-time shadows */}
      <directionalLight 
        ref={lightRef}
        position={[-10, 18, 8]} 
        intensity={1.0} 
        color="#8ba3cf" 
        castShadow 
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={40}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-bias={-0.0008}
      />

      {/* Floating Neon AgX Embers/Atmospheric Dust particles */}
      <GlowingDust count={120} />
      
      {/* Cyberpunk Parallax looping background */}
      <Parallax3DBackground />
      
      <Environment preset="city" />

      <Suspense fallback={null}>
        <Physics gravity={[0, -22, 0]}>
          {children}
          
          {/* Procedural Endless levels spawner */}
          <EndlessWorld />
        </Physics>
      </Suspense>

      {/* High-fidelity WebGL Instanced Particle System */}
      <ParticleSystem />
    </>
  );
};


