import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store/useGameStore';
import * as THREE from 'three';

export const CameraController = () => {
  const { dimension, playerPosition } = useGameStore();

  // Keep track of the lookAt target vector in a ref to lerp it smoothly
  const lerpedTarget = useRef(new THREE.Vector3(0, 0, 0));

  useFrame((state) => {
    const { x, y, z } = playerPosition;

    if (dimension === '2D') {
      // 2D Camera: smooth X/Y tracking, Z fixed
      const targetCamX = THREE.MathUtils.lerp(state.camera.position.x, x, 0.08);
      const targetCamY = THREE.MathUtils.lerp(state.camera.position.y, Math.max(0, y + 0.5), 0.08);
      
      state.camera.position.set(targetCamX, targetCamY, 10);

      // Smoothly lerp lookAt target
      lerpedTarget.current.x = THREE.MathUtils.lerp(lerpedTarget.current.x, targetCamX, 0.1);
      lerpedTarget.current.y = THREE.MathUtils.lerp(lerpedTarget.current.y, targetCamY, 0.1);
      lerpedTarget.current.z = THREE.MathUtils.lerp(lerpedTarget.current.z, 0, 0.1);

      state.camera.lookAt(lerpedTarget.current);
    } else {
      // 3D Camera: Cinematic behind-the-shoulder runner view!
      // The track extends along +X. So we place the camera to the left (-X) of the player.
      const targetCamX = THREE.MathUtils.lerp(state.camera.position.x, x - 7, 0.06);
      const targetCamY = THREE.MathUtils.lerp(state.camera.position.y, y + 4.5, 0.06);
      // Soften Z movement of camera so it doesn't slam side-to-side when lane-switching
      const targetCamZ = THREE.MathUtils.lerp(state.camera.position.z, z * 0.7, 0.04);
      
      state.camera.position.set(targetCamX, targetCamY, targetCamZ);

      // Smoothly lerp lookAt target, focused slightly ahead of the player (x + 3) to see upcoming hazards
      lerpedTarget.current.x = THREE.MathUtils.lerp(lerpedTarget.current.x, x + 3, 0.1);
      lerpedTarget.current.y = THREE.MathUtils.lerp(lerpedTarget.current.y, y + 0.5, 0.1);
      lerpedTarget.current.z = THREE.MathUtils.lerp(lerpedTarget.current.z, z * 0.5, 0.1);

      state.camera.lookAt(lerpedTarget.current);
    }
  });

  return null;
};
