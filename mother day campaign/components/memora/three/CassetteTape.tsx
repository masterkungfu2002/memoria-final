"use client";

import { RoundedBox } from "@react-three/drei";
import { ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";

const SLOT = new THREE.Vector3(0.05, 0.38, 0.95);
const SLOT_TOLERANCE = 0.42;

export function CassetteTape({
  active,
  inserted,
  onInserted,
}: {
  active: boolean;
  inserted: boolean;
  onInserted: () => void;
}) {
  const group = useRef<THREE.Group>(null);
  const dragging = useRef(false);
  const { camera, gl } = useThree();
  const domRef = useRef<HTMLCanvasElement | null>(null);
  const raycaster = useRef(new THREE.Raycaster());
  const plane = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), -1.35));
  const target = useRef(new THREE.Vector3());
  const [colorHue] = useState(() => Math.random() * 0.08);

  useEffect(() => {
    domRef.current = gl.domElement;
  }, [gl]);

  const projectPointer = useCallback(
    (clientX: number, clientY: number) => {
      const rect = gl.domElement.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.current.setFromCamera(new THREE.Vector2(x, y), camera);
      if (raycaster.current.ray.intersectPlane(plane.current, target.current)) {
        return target.current.clone();
      }
      return null;
    },
    [camera, gl],
  );

  const onPointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!active || inserted) return;
      e.stopPropagation();
      dragging.current = true;
      if (domRef.current) domRef.current.style.cursor = "grabbing";
    },
    [active, inserted],
  );

  useFrame(() => {
    const g = group.current;
    if (!g || inserted) return;
    if (!active) return;
    if (dragging.current) return;
    g.position.lerp(new THREE.Vector3(0.85, 0.02, 2.2), 0.04);
  });

  if (!active) return null;

  if (inserted) {
    return (
      <group position={[SLOT.x, SLOT.y, SLOT.z + 0.02]} rotation={[0, 0, 0.04]}>
        <RoundedBox args={[1.05, 0.66, 0.18]} radius={0.06} smoothness={3}>
          <meshStandardMaterial
            color={new THREE.Color().setHSL(0.08 + colorHue, 0.08, 0.22)}
            metalness={0.35}
            roughness={0.45}
          />
        </RoundedBox>
        <mesh position={[0, 0, 0.11]}>
          <planeGeometry args={[0.68, 0.34]} />
          <meshStandardMaterial color="#e9e0d4" roughness={0.78} metalness={0.02} />
        </mesh>
      </group>
    );
  }

  return (
    <group
      ref={group}
      position={[0.85, 0.02, 2.2]}
      rotation={[0.1, -0.35, 0]}
      onPointerDown={onPointerDown}
      onPointerMove={(e) => {
        if (!dragging.current || inserted) return;
        e.stopPropagation();
        const p = projectPointer(e.clientX, e.clientY);
        if (!p || !group.current) return;
        group.current.position.x = THREE.MathUtils.clamp(p.x, -2.2, 2.2);
        group.current.position.y = THREE.MathUtils.clamp(p.y, -0.4, 2.4);
        group.current.position.z = THREE.MathUtils.clamp(p.z, -0.2, 3.2);
      }}
      onPointerUp={(e) => {
        if (!dragging.current) return;
        e.stopPropagation();
        dragging.current = false;
        if (domRef.current) domRef.current.style.cursor = "grab";
        const g = group.current;
        if (!g) return;
        const dist = g.position.distanceTo(SLOT);
        if (dist < SLOT_TOLERANCE) {
          onInserted();
        }
      }}
      onPointerLeave={() => {
        dragging.current = false;
        if (domRef.current) domRef.current.style.cursor = "auto";
      }}
    >
      <RoundedBox args={[1.05, 0.66, 0.18]} radius={0.06} smoothness={3}>
        <meshStandardMaterial
          color={new THREE.Color().setHSL(0.08 + colorHue, 0.08, 0.22)}
          metalness={0.35}
          roughness={0.45}
        />
      </RoundedBox>
      <mesh position={[0, 0, 0.11]}>
        <planeGeometry args={[0.68, 0.34]} />
        <meshStandardMaterial color="#e9e0d4" roughness={0.78} metalness={0.02} />
      </mesh>
      <mesh position={[-0.32, 0, 0.11]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.05, 24]} />
        <meshStandardMaterial color="#6b5344" metalness={0.6} roughness={0.28} />
      </mesh>
      <mesh position={[0.32, 0, 0.11]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.05, 24]} />
        <meshStandardMaterial color="#6b5344" metalness={0.6} roughness={0.28} />
      </mesh>
    </group>
  );
}
