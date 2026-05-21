import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store/useGameStore';
import * as THREE from 'three';

export const Parallax3DBackground = () => {
  const farMeshRef = useRef();
  const midMeshRef = useRef();
  const trafficMeshRef = useRef();
  const sunRef = useRef();

  const colors = useMemo(() => [
    new THREE.Color("#ff007f"), // Hot Pink
    new THREE.Color("#00f0ff"), // Cyber Cyan
    new THREE.Color("#7928ca"), // Neon Purple
    new THREE.Color("#18003c"), // Deep Shadow Blue
  ], []);

  // 1. Far Megastructures Data (Looming background giants)
  const farMonolithsCount = 20;
  const farMonoliths = useMemo(() => {
    const temp = [];
    for (let i = 0; i < farMonolithsCount; i++) {
      const isRightSide = Math.random() > 0.5;
      const zOffset = isRightSide
        ? Math.random() * 30 + 60   // Far Right (Z: 60 to 90)
        : -Math.random() * 30 - 60; // Far Left (Z: -60 to -90)
      
      const height = Math.random() * 80 + 60;
      const width = Math.random() * 15 + 8;
      const depth = Math.random() * 15 + 8;

      temp.push({
        offsetX: Math.random() * 200 - 100, // Looping window of 200
        offsetY: height / 2 - 12,           // Anchored slightly below baseline
        offsetZ: zOffset,
        scaleX: width,
        scaleY: height,
        scaleZ: depth,
        color: new THREE.Color(Math.random() > 0.5 ? "#120924" : "#070c14"),
      });
    }
    return temp;
  }, []);

  // 2. Mid Skyscrapers Data (Parallax side buildings)
  const midTowersCount = 45;
  const midTowers = useMemo(() => {
    const temp = [];
    for (let i = 0; i < midTowersCount; i++) {
      const isRightSide = Math.random() > 0.5;
      const zOffset = isRightSide
        ? Math.random() * 20 + 13   // Mid Right (Z: 13 to 33)
        : -Math.random() * 20 - 13; // Mid Left (Z: -13 to -33)

      const height = Math.random() * 30 + 10;
      const width = Math.random() * 4.5 + 2.0;
      const depth = Math.random() * 4.5 + 2.0;

      temp.push({
        offsetX: Math.random() * 120 - 60, // Looping window of 120
        offsetY: height / 2 - 2.5,
        offsetZ: zOffset,
        scaleX: width,
        scaleY: height,
        scaleZ: depth,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    return temp;
  }, [colors]);

  // 3. Sky Traffic Data (Futuristic flying neon streaks)
  const trafficCount = 55;
  const traffic = useMemo(() => {
    const temp = [];
    for (let i = 0; i < trafficCount; i++) {
      const isRightSide = Math.random() > 0.5;
      const zOffset = isRightSide
        ? Math.random() * 15 + 10   // Right air lanes
        : -Math.random() * 15 - 10; // Left air lanes

      temp.push({
        offsetX: Math.random() * 100 - 50,  // Looping window of 100
        offsetY: Math.random() * 16 + 6,    // Air lanes height
        offsetZ: zOffset,
        speed: Math.random() * 20 + 12,     // Custom travel velocity
        direction: Math.random() > 0.5 ? 1 : -1,
        scaleX: Math.random() * 4.5 + 2.5,  // Streak length
        scaleY: 0.15,
        scaleZ: 0.15,
        color: Math.random() > 0.5 ? new THREE.Color("#00f0ff") : new THREE.Color("#ff007f"),
      });
    }
    return temp;
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    const px = useGameStore.getState().playerPosition.x;
    const t = state.clock.getElapsedTime();

    // Disable frustum culling so background objects don't disappear when player runs far along X
    if (farMeshRef.current) farMeshRef.current.frustumCulled = false;
    if (midMeshRef.current) midMeshRef.current.frustumCulled = false;
    if (trafficMeshRef.current) trafficMeshRef.current.frustumCulled = false;

    // Translate Retro Horizon Sun X coordinate directly
    if (sunRef.current) {
      sunRef.current.position.x = px + 140;
    }

    // --- 1. FAR MONOLITHS (0.02 scroll speed) ---
    if (farMeshRef.current) {
      farMonoliths.forEach((m, i) => {
        let relativeX = (m.offsetX - px * 0.02) % 200;
        if (relativeX < -100) relativeX += 200;
        if (relativeX > 100) relativeX -= 200;

        dummy.position.set(px + relativeX, m.offsetY, m.offsetZ);
        dummy.scale.set(m.scaleX, m.scaleY, m.scaleZ);
        dummy.updateMatrix();

        farMeshRef.current.setMatrixAt(i, dummy.matrix);
        farMeshRef.current.setColorAt(i, m.color);
      });
      farMeshRef.current.instanceMatrix.needsUpdate = true;
      if (farMeshRef.current.instanceColor) farMeshRef.current.instanceColor.needsUpdate = true;
    }

    // --- 2. MID SKYSCRAPERS (0.08 scroll speed) ---
    if (midMeshRef.current) {
      midTowers.forEach((mt, i) => {
        let relativeX = (mt.offsetX - px * 0.08) % 120;
        if (relativeX < -60) relativeX += 120;
        if (relativeX > 60) relativeX -= 120;

        dummy.position.set(px + relativeX, mt.offsetY, mt.offsetZ);
        dummy.scale.set(mt.scaleX, mt.scaleY, mt.scaleZ);
        dummy.updateMatrix();

        midMeshRef.current.setMatrixAt(i, dummy.matrix);
        midMeshRef.current.setColorAt(i, mt.color);
      });
      midMeshRef.current.instanceMatrix.needsUpdate = true;
      if (midMeshRef.current.instanceColor) midMeshRef.current.instanceColor.needsUpdate = true;
    }

    // --- 3. SKY TRAFFIC (Dynamic scroll + active flight speed) ---
    if (trafficMeshRef.current) {
      traffic.forEach((tf, i) => {
        // Dynamic flying delta relative to current time
        const travelDistance = tf.direction * t * tf.speed;
        let relativeX = (tf.offsetX + travelDistance - px * 0.15) % 100;
        if (relativeX < -50) relativeX += 100;
        if (relativeX > 50) relativeX -= 100;

        dummy.position.set(px + relativeX, tf.offsetY, tf.offsetZ);
        dummy.scale.set(tf.scaleX, tf.scaleY, tf.scaleZ);
        dummy.updateMatrix();

        trafficMeshRef.current.setMatrixAt(i, dummy.matrix);
        trafficMeshRef.current.setColorAt(i, tf.color);
      });
      trafficMeshRef.current.instanceMatrix.needsUpdate = true;
      if (trafficMeshRef.current.instanceColor) trafficMeshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* 1. Far Monoliths Layer */}
      <instancedMesh ref={farMeshRef} args={[null, null, farMonolithsCount]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial 
          roughness={0.7} 
          metalness={0.8}
          toneMapped={true} 
        />
      </instancedMesh>

      {/* 2. Mid Skyscrapers Layer */}
      <instancedMesh ref={midMeshRef} args={[null, null, midTowersCount]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial 
          roughness={0.2} 
          metalness={0.9} 
          toneMapped={true} 
        />
      </instancedMesh>

      {/* 3. Flying Sky Traffic (Ultra-glow basic neon emission lines) */}
      <instancedMesh ref={trafficMeshRef} args={[null, null, trafficCount]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial 
          toneMapped={false} 
          transparent
          opacity={0.85}
        />
      </instancedMesh>

      {/* 4. Giant Concentric Retro-Synthwave Sun (horizon-locked at +140) */}
      <group ref={sunRef} position={[140, 10, 0]} rotation={[0, -Math.PI / 2, 0]}>
        {/* Core outer sun ring */}
        <mesh>
          <circleGeometry args={[22, 32]} />
          <meshBasicMaterial 
            color="#ff0055" 
            toneMapped={false} 
            transparent
            opacity={0.4}
          />
        </mesh>
        
        {/* Sun inner glowing core */}
        <mesh position={[0.1, 0, 0]}>
          <circleGeometry args={[16, 32]} />
          <meshBasicMaterial 
            color="#ff6000" 
            toneMapped={false} 
            transparent
            opacity={0.9}
          />
        </mesh>

        {/* Retro horizon line grid overlays */}
        <mesh position={[0.2, -6, 0]}>
          <boxGeometry args={[44, 0.4, 0.1]} />
          <meshBasicMaterial color="#0c0e1a" toneMapped={true} />
        </mesh>
        <mesh position={[0.2, -9, 0]}>
          <boxGeometry args={[44, 0.8, 0.1]} />
          <meshBasicMaterial color="#0c0e1a" toneMapped={true} />
        </mesh>
        <mesh position={[0.2, -12, 0]}>
          <boxGeometry args={[44, 1.4, 0.1]} />
          <meshBasicMaterial color="#0c0e1a" toneMapped={true} />
        </mesh>
        <mesh position={[0.2, -15, 0]}>
          <boxGeometry args={[44, 2.2, 0.1]} />
          <meshBasicMaterial color="#0c0e1a" toneMapped={true} />
        </mesh>
      </group>
    </group>
  );
};
