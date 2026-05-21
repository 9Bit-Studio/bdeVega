import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store/useGameStore';
import * as THREE from 'three';

export const CameraController = () => {
  // Keep track of the lookAt target vector in a ref to lerp it smoothly
  const lerpedTarget = useRef(new THREE.Vector3(0, 0, 0));
  
  // Cyber-Juice refs for camera shake and speed zoom
  const lastProcessedTriggerId = useRef(null);
  const shakeIntensity = useRef(0);
  const additionalFov = useRef(0);

  useFrame((state) => {
    const { dimension, playerPosition, particleTrigger } = useGameStore.getState();
    const { x, y, z } = playerPosition;

    // Check for game juice trigger events
    if (particleTrigger && particleTrigger.id !== lastProcessedTriggerId.current) {
      lastProcessedTriggerId.current = particleTrigger.id;
      if (particleTrigger.type === 'spike') {
        shakeIntensity.current = 0.85; // Heavy hit shake
      } else if (particleTrigger.type === 'trampoline') {
        shakeIntensity.current = 0.45; // Medium jump-pad bounce shake
        additionalFov.current = 10;   // Wide speed zoom out
      } else if (particleTrigger.type === 'jump') {
        shakeIntensity.current = 0.18; // Soft jump launch kick
        additionalFov.current = 4;    // Subtle zoom out
      } else if (particleTrigger.type === 'coin') {
        shakeIntensity.current = 0.08; // Delicate collect pulse
      }
    }

    // Decay juice variables back to base levels
    shakeIntensity.current = THREE.MathUtils.lerp(shakeIntensity.current, 0, 0.1);
    additionalFov.current = THREE.MathUtils.lerp(additionalFov.current, 0, 0.08);

    // Apply FOV breath changes
    state.camera.fov = 50 + additionalFov.current;
    state.camera.updateProjectionMatrix();

    if (dimension === '2D') {
      // 2D Camera: smooth X/Y tracking, Z fixed
      const targetCamX = THREE.MathUtils.lerp(state.camera.position.x, x, 0.08);
      const targetCamY = THREE.MathUtils.lerp(state.camera.position.y, Math.max(0, y + 0.5), 0.08);
      
      state.camera.position.set(targetCamX, targetCamY, 10);

      // Apply screen shake offsets directly
      if (shakeIntensity.current > 0.005) {
        state.camera.position.x += (Math.random() - 0.5) * shakeIntensity.current;
        state.camera.position.y += (Math.random() - 0.5) * shakeIntensity.current;
      }

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

      // Apply screen shake offsets directly in 3D
      if (shakeIntensity.current > 0.005) {
        state.camera.position.x += (Math.random() - 0.5) * shakeIntensity.current;
        state.camera.position.y += (Math.random() - 0.5) * shakeIntensity.current;
        state.camera.position.z += (Math.random() - 0.5) * shakeIntensity.current;
      }

      // Smoothly lerp lookAt target, focused slightly ahead of the player (x + 3) to see upcoming hazards
      lerpedTarget.current.x = THREE.MathUtils.lerp(lerpedTarget.current.x, x + 3, 0.1);
      lerpedTarget.current.y = THREE.MathUtils.lerp(lerpedTarget.current.y, y + 0.5, 0.1);
      lerpedTarget.current.z = THREE.MathUtils.lerp(lerpedTarget.current.z, z * 0.5, 0.1);

      state.camera.lookAt(lerpedTarget.current);
    }
  });

  return null;
};
