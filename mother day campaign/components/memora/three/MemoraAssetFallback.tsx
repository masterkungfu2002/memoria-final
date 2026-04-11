"use client";

export function MemoraAssetFallback() {
  return (
    <group position={[0, 0.35, 0]}>
      <mesh>
        <boxGeometry args={[1.4, 1.9, 0.08]} />
        <meshStandardMaterial color="#121018" roughness={0.9} metalness={0.05} />
      </mesh>
      <pointLight position={[2, 3, 2]} intensity={1.6} color="#e8c48a" />
    </group>
  );
}
