"use client";

import { Float, RoundedBox } from "@react-three/drei";

export function ClimaxScene({ onCassetteTap }: { onCassetteTap: () => void }) {
  function tap(e: { stopPropagation: () => void }) {
    e.stopPropagation();
    onCassetteTap();
  }

  return (
    <group>
      <mesh position={[0, -0.38, -0.55]}>
        <boxGeometry args={[3.5, 2.5, 0.18]} />
        <meshStandardMaterial color="#0c0c0e" metalness={0.35} roughness={0.55} />
      </mesh>
      <mesh position={[0, -0.38, -0.44]}>
        <planeGeometry args={[3.15, 2.2]} />
        <meshStandardMaterial color="#050508" emissive="#0a1020" emissiveIntensity={0.35} />
      </mesh>

      <pointLight position={[1.2, 1.8, 2.8]} intensity={2.2} distance={12} decay={2} />
      <pointLight position={[-2, 0.5, 2.5]} intensity={0.9} distance={10} decay={2} />
      <pointLight position={[0, 1.2, 3.2]} intensity={0.7} distance={14} decay={2} />

      <Float speed={1.4} rotationIntensity={0.55} floatIntensity={1.25}>
        <group position={[0, 0.42, 1]}>
          <RoundedBox
            args={[1.42, 0.9, 0.22]}
            radius={0.07}
            smoothness={4}
            onClick={tap}
            onPointerDown={tap}
          >
            <meshStandardMaterial color="#2a2a34" metalness={0.35} roughness={0.42} />
          </RoundedBox>

          <mesh position={[-0.4, 0, 0.13]} rotation={[Math.PI / 2, 0, 0]} onClick={tap} onPointerDown={tap}>
            <cylinderGeometry args={[0.2, 0.2, 0.06, 32]} />
            <meshStandardMaterial color="#8b7355" metalness={0.65} roughness={0.28} />
          </mesh>
          <mesh position={[0.4, 0, 0.13]} rotation={[Math.PI / 2, 0, 0]} onClick={tap} onPointerDown={tap}>
            <cylinderGeometry args={[0.2, 0.2, 0.06, 32]} />
            <meshStandardMaterial color="#8b7355" metalness={0.65} roughness={0.28} />
          </mesh>

          <mesh position={[0, 0, 0.12]} onClick={tap} onPointerDown={tap}>
            <planeGeometry args={[1, 0.38]} />
            <meshStandardMaterial color="#dcd6ce" roughness={0.75} metalness={0.05} />
          </mesh>
        </group>
      </Float>
    </group>
  );
}
