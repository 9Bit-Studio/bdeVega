import { PerspectiveCamera, OrthographicCamera, Environment } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { useGameStore } from './store/useGameStore';
import { Suspense } from 'react';
import { EndlessWorld } from './components/EndlessWorld';
import { CameraController } from './components/CameraController';

export const Scene = ({ children }) => {
  const dimension = useGameStore((state) => state.dimension);
  const playerPosition = useGameStore((state) => state.playerPosition);

  // Position the shadow-casting directional light relative to the player
  // to ensure shadow maps remain high-resolution and never clip out along the infinite track.
  const lightPosition = [playerPosition.x - 10, 18, 8];

  return (
    <>
      {dimension === '3D' ? (
        <PerspectiveCamera makeDefault position={[5, 5, 10]} fov={50} />
      ) : (
        <OrthographicCamera makeDefault position={[0, 0, 10]} zoom={50} />
      )}

      {/* Dynamic Camera tracking */}
      <CameraController />

      {/* Low ambient light for an immersive, high-contrast cyberpunk atmosphere */}
      <ambientLight intensity={0.15} color="#0c0c1e" />
      
      {/* Dynamic Moonlight that follows the player for endless real-time shadows */}
      <directionalLight 
        position={lightPosition} 
        intensity={1.2} 
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
      
      <Environment preset="city" />

      <Suspense fallback={null}>
        <Physics gravity={[0, -22, 0]}>
          {children}
          
          {/* Procedural Endless levels spawner */}
          <EndlessWorld />
        </Physics>
      </Suspense>
    </>
  );
};
