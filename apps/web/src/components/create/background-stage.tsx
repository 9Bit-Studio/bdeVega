"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import type { Group } from "three";

const SHAPES = [
  { kind: "torus", position: [-4.2, 1.6, -3], color: "#ff6b4a", scale: 0.9, speed: 0.22 },
  { kind: "icosahedron", position: [4.4, 2.2, -4], color: "#ffb347", scale: 0.8, speed: 0.31 },
  { kind: "box", position: [-3.1, -2.2, -2], color: "#ffb347", scale: 0.6, speed: 0.27 },
  { kind: "torus", position: [3.4, -1.8, -3.5], color: "#ff8f6b", scale: 0.7, speed: 0.19 },
  { kind: "icosahedron", position: [0.6, 3.1, -5], color: "#ff6b4a", scale: 0.55, speed: 0.24 },
  { kind: "box", position: [5.6, 0.2, -6], color: "#ff6b4a", scale: 0.75, speed: 0.16 },
  { kind: "icosahedron", position: [-5.8, -0.6, -5], color: "#ffb347", scale: 0.65, speed: 0.29 },
  { kind: "torus", position: [-1.6, -3, -4], color: "#ffb347", scale: 0.5, speed: 0.34 },
] as const;

function FloatingShapes() {
  const group = useRef<Group>(null);
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      pointer.current = {
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: (event.clientY / window.innerHeight) * 2 - 1,
      };
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame((state) => {
    const root = group.current;
    if (!root) return;
    const time = state.clock.elapsedTime;
    // Slow parallax toward the pointer
    root.position.x += (pointer.current.x * 0.6 - root.position.x) * 0.02;
    root.position.y += (-pointer.current.y * 0.4 - root.position.y) * 0.02;
    root.children.forEach((child, index) => {
      const shape = SHAPES[index % SHAPES.length];
      child.rotation.x = time * shape.speed * 0.4;
      child.rotation.y = time * shape.speed;
      child.position.y = shape.position[1] + Math.sin(time * shape.speed + index) * 0.35;
    });
  });

  return (
    <group ref={group}>
      {SHAPES.map((shape, index) => (
        <mesh key={index} position={[...shape.position]} scale={shape.scale}>
          {shape.kind === "torus" ? <torusGeometry args={[1, 0.36, 20, 48]} /> : shape.kind === "box" ? <boxGeometry args={[1.3, 1.3, 1.3]} /> : <icosahedronGeometry args={[1, 0]} />}
          <meshStandardMaterial color={shape.color} roughness={0.35} metalness={0.15} />
        </mesh>
      ))}
    </group>
  );
}

export function BackgroundStage() {
  const [mounted, setMounted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setMounted(true);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applyMedia = () => setReducedMotion(media.matches);
    applyMedia();
    media.addEventListener("change", applyMedia);
    const applyVisibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", applyVisibility);
    return () => {
      media.removeEventListener("change", applyMedia);
      document.removeEventListener("visibilitychange", applyVisibility);
    };
  }, []);

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0" style={{ background: "radial-gradient(90% 70% at 50% 20%, #241a1d 0%, #121014 65%)" }} />
      {mounted && !reducedMotion ? (
        <div className="absolute inset-0 opacity-30">
          <Canvas frameloop={paused ? "never" : "always"} camera={{ position: [0, 0, 6], fov: 50 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[4, 6, 5]} intensity={1.4} color="#ffb347" />
            <directionalLight position={[-5, -2, 4]} intensity={0.7} color="#ff6b4a" />
            <FloatingShapes />
          </Canvas>
        </div>
      ) : null}
      <div className="absolute inset-0" style={{ background: "radial-gradient(80% 60% at 50% 55%, transparent 30%, rgba(18,16,20,0.7) 100%)" }} />
    </div>
  );
}
