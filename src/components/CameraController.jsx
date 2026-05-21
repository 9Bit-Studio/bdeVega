import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store/useGameStore';
import * as THREE from 'three';

export const CameraController = () => {
  const { dimension, playerPosition } = useGameStore();

  useFrame((state) => {
    const { x, y, z } = playerPosition;

    if (dimension === '2D') {
      // 2D Camera: smooth X/Y tracking, Z fixed
      const targetX = THREE.MathUtils.lerp(state.camera.position.x, x, 0.1);
      // Smooth Y but clamp to not go too far down
      const targetY = THREE.MathUtils.lerp(state.camera.position.y, Math.max(0, y + 1), 0.1);
      
      state.camera.position.set(targetX, targetY, 10);
      state.camera.lookAt(new THREE.Vector3(targetX, targetY, 0));
    } else {
      // 3D Camera: dynamic isometric follow
      const targetCamX = THREE.MathUtils.lerp(state.camera.position.x, x + 5, 0.05);
      const targetCamY = THREE.MathUtils.lerp(state.camera.position.y, y + 5, 0.05);
      const targetCamZ = THREE.MathUtils.lerp(state.camera.position.z, z + 10, 0.05);
      
      state.camera.position.set(targetCamX, targetCamY, targetCamZ);
      state.camera.lookAt(new THREE.Vector3(x, y + 1, z));
    }
  });

  return null;
};
