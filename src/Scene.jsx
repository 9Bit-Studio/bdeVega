import { PerspectiveCamera, OrthographicCamera, Environment, ContactShadows } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { useGameStore } from './store/useGameStore';
import { Suspense } from 'react';
import { EndlessWorld } from './components/EndlessWorld';
import { CameraController } from './components/CameraController';

export const Scene = ({ children }) => {
  const dimension = useGameStore((state) => state.dimension);

  return (
    <>
      {dimension === '3D' ? (
        <PerspectiveCamera makeDefault position={[5, 5, 10]} fov={50} />
      ) : (
        <OrthographicCamera makeDefault position={[0, 0, 10]} zoom={50} />
      )}

      {/* Dynamic Camera tracking */}
      <CameraController />

      <ambientLight intensity={0.6} />
      <pointLight position={[15, 15, 15]} intensity={1.5} castShadow />
      <directionalLight position={[-10, 20, 10]} intensity={1.0} castShadow />
      
      <Environment preset="city" />

      <Suspense fallback={null}>
        <Physics gravity={[0, -20, 0]}>
          {children}
          
          {/* Procedural Endless levels spawner */}
          <EndlessWorld />
        </Physics>
      </Suspense>

      <ContactShadows opacity={0.6} scale={40} blur={1.5} far={15} resolution={512} color="#000000" />
    </>
  );
};
