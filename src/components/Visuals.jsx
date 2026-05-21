import { Player3D } from './Player3D';
import { Suspense } from 'react';

export const Visuals = () => {
  return (
    <Suspense fallback={<mesh><boxGeometry /><meshStandardMaterial color="gray" /></mesh>}>
      <Player3D />
    </Suspense>
  );
};

