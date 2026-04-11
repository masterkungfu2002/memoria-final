"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { memo, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { MemoraAct } from "@/lib/memora-store";
import { useMemoraStore } from "@/lib/memora-store";

export type ParticleSeasonMode = "cosmic" | "spring" | "summer" | "autumn" | "winter" | "dim";

function createPrng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function resolveMode(
  act: MemoraAct,
  currentPage: number,
  studioWarm: boolean,
  spreadIndex: number,
): ParticleSeasonMode {
  if (act === 1) {
    if (!studioWarm) return "cosmic";
    return "dim";
  }
  if (act === 2) {
    // 2 pages Spring, 2 pages Summer, 1 page Autumn, 1 page Winter
    if (spreadIndex <= 1) return "spring";
    if (spreadIndex <= 3) return "summer";
    if (spreadIndex === 4) return "autumn";
    return "winter";
  }
  if (act === 3 || act === 4 || act === 5) return "dim";
  return "dim";
}

type Props = {
  act: MemoraAct;
  currentPage: number;
  studioWarm: boolean;
};

const METEOR_COUNT = 96;
const SOFT_COUNT = 200;
const FIREFLY_COUNT = 160;
const SNOW_COUNT = 240;
const LEAF_COUNT = 48;

function SeasonsParticlesInner({ act, currentPage, studioWarm }: Props) {
  const bookSpreadIndex = useMemoraStore((s) => s.bookSpreadIndex);
  const mode = useMemo(
    () => resolveMode(act, currentPage, studioWarm, bookSpreadIndex),
    [act, currentPage, studioWarm, bookSpreadIndex],
  );

  const pointsRef = useRef<THREE.Points>(null);
  const leavesRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const { clock } = useThree();

  const meteorGeom = useMemo(() => {
    const rnd = createPrng(0x1234abcd);
    const pos = new Float32Array(METEOR_COUNT * 3);
    const vel = new Float32Array(METEOR_COUNT * 3);
    for (let i = 0; i < METEOR_COUNT; i++) {
      pos[i * 3] = -16 - rnd() * 14;
      pos[i * 3 + 1] = 7 + rnd() * 12;
      pos[i * 3 + 2] = (rnd() - 0.5) * 10;
      const speed = 4.2 + rnd() * 3.4;
      const dirX = 0.78 + rnd() * 0.12;
      const dirY = -0.52 - rnd() * 0.16;
      const dirZ = (rnd() - 0.5) * 0.16;
      const len = Math.hypot(dirX, dirY, dirZ) || 1;
      vel[i * 3] = (dirX / len) * speed;
      vel[i * 3 + 1] = (dirY / len) * speed;
      vel[i * 3 + 2] = (dirZ / len) * speed;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.userData.vel = vel;
    return g;
  }, []);

  const softGeom = useMemo(() => {
    const rnd = createPrng(0x21b0d7c9);
    const pos = new Float32Array(SOFT_COUNT * 3);
    for (let i = 0; i < SOFT_COUNT; i++) {
      pos[i * 3] = (rnd() - 0.5) * 16;
      pos[i * 3 + 1] = (rnd() - 0.5) * 12;
      pos[i * 3 + 2] = (rnd() - 0.5) * 14;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  const fireflyGeom = useMemo(() => {
    const rnd = createPrng(0x7f4a2b19);
    const pos = new Float32Array(FIREFLY_COUNT * 3);
    for (let i = 0; i < FIREFLY_COUNT; i++) {
      pos[i * 3] = (rnd() - 0.5) * 10;
      pos[i * 3 + 1] = rnd() * 0.2;
      pos[i * 3 + 2] = (rnd() - 0.5) * 10;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  const snowGeom = useMemo(() => {
    const rnd = createPrng(0xa91b3e55);
    const pos = new Float32Array(SNOW_COUNT * 3);
    for (let i = 0; i < SNOW_COUNT; i++) {
      pos[i * 3] = (rnd() - 0.5) * 18;
      pos[i * 3 + 1] = 4 + rnd() * 14;
      pos[i * 3 + 2] = (rnd() - 0.5) * 18;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  const leafGeom = useMemo(() => new THREE.PlaneGeometry(0.14, 0.2), []);
  const leafMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#c45c26",
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      }),
    [],
  );

  useEffect(() => () => leafMat.dispose(), [leafMat]);

  useFrame((_, delta) => {
    const t = clock.elapsedTime;
    const pts = pointsRef.current;
    if (mode === "cosmic" && pts?.geometry) {
      const p = pts.geometry.getAttribute("position") as THREE.BufferAttribute;
      const vel = pts.geometry.userData.vel as Float32Array | undefined;
      if (!p || !vel) return;
      const arr = p.array as Float32Array;
      for (let i = 0; i < METEOR_COUNT; i++) {
        const ix = i * 3;
        arr[ix] += vel[ix] * delta * 2.4;
        arr[ix + 1] += vel[ix + 1] * delta * 2.4;
        arr[ix + 2] += vel[ix + 2] * delta * 2.4;
        if (arr[ix + 1] < -9 || arr[ix] > 14) {
          arr[ix] = -16 - Math.random() * 14;
          arr[ix + 1] = 8 + Math.random() * 11;
          arr[ix + 2] = (Math.random() - 0.5) * 10;
        }
      }
      p.needsUpdate = true;
    }

    if (mode === "spring" && pts?.geometry) {
      const p = pts.geometry.getAttribute("position") as THREE.BufferAttribute;
      const arr = p.array as Float32Array;
      for (let i = 0; i < SOFT_COUNT; i++) {
        const ix = i * 3;
        const wave = Math.sin(t * 0.65 + i * 0.05) * 0.01;
        arr[ix] += wave + Math.sin(t + i) * 0.0006;
        arr[ix + 1] += 0.2 * delta + Math.cos(t * 0.48 + i * 0.03) * 0.003;
        arr[ix + 2] += Math.cos(t * 0.32 + i) * 0.005;
        if (arr[ix + 1] > 8) arr[ix + 1] = -6;
      }
      p.needsUpdate = true;
    }

    if (mode === "summer" && pts?.geometry) {
      const p = pts.geometry.getAttribute("position") as THREE.BufferAttribute;
      const arr = p.array as Float32Array;
      for (let i = 0; i < FIREFLY_COUNT; i++) {
        const ix = i * 3;
        arr[ix + 1] += (0.28 + Math.sin(i) * 0.1) * delta * 2.1;
        arr[ix] += Math.sin(t * 2 + i * 0.2) * 0.0026;
        arr[ix + 2] += Math.cos(t * 1.65 + i * 0.15) * 0.0026;
        if (arr[ix + 1] > 9) {
          arr[ix + 1] = -0.5;
          arr[ix] = (Math.random() - 0.5) * 10;
          arr[ix + 2] = (Math.random() - 0.5) * 10;
        }
      }
      p.needsUpdate = true;
    }

    if (mode === "winter" && pts?.geometry) {
      const p = pts.geometry.getAttribute("position") as THREE.BufferAttribute;
      const arr = p.array as Float32Array;
      for (let i = 0; i < SNOW_COUNT; i++) {
        const ix = i * 3;
        arr[ix + 1] -= (0.48 + Math.random() * 0.02) * delta * 3.6;
        arr[ix] += Math.sin(t + i) * 0.002;
        if (arr[ix + 1] < -8) {
          arr[ix + 1] = 10 + Math.random() * 6;
          arr[ix] = (Math.random() - 0.5) * 18;
          arr[ix + 2] = (Math.random() - 0.5) * 18;
        }
      }
      p.needsUpdate = true;
    }

    if (mode === "autumn" && leavesRef.current) {
      for (let i = 0; i < LEAF_COUNT; i++) {
        const fall = t * (0.32 + (i % 7) * 0.028) + i * 0.2;
        dummy.position.set(
          Math.sin(fall * 0.48 + i) * 4.2 + (i % 5) * 0.06,
          3.2 - (fall % 8) * 0.85,
          Math.cos(fall * 0.42 + i * 0.1) * 4.2,
        );
        dummy.rotation.set(
          fall * 1.05 + i * 0.03,
          fall * 0.85,
          fall * 0.55 + i * 0.05,
        );
        dummy.updateMatrix();
        leavesRef.current.setMatrixAt(i, dummy.matrix);
      }
      leavesRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  if (mode === "cosmic") {
    return (
      <points ref={pointsRef} geometry={meteorGeom}>
        <pointsMaterial
          color="#eae6ff"
          size={0.038}
          transparent
          opacity={0.88}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
    );
  }

  if (mode === "spring") {
    return (
      <points ref={pointsRef} geometry={softGeom}>
        <pointsMaterial
          color="#f9b4d4"
          size={0.048}
          transparent
          opacity={0.78}
          depthWrite={false}
          blending={THREE.NormalBlending}
          sizeAttenuation
        />
      </points>
    );
  }

  if (mode === "summer") {
    return (
      <group>
        <points ref={pointsRef} geometry={fireflyGeom}>
          <pointsMaterial
            color="#ffe066"
            size={0.054}
            transparent
            opacity={0.92}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            sizeAttenuation
          />
        </points>
        <mesh position={[1.8, 2.1, -4]} rotation={[0.12, -0.2, 0.06]}>
          <planeGeometry args={[13, 2.6]} />
          <meshBasicMaterial
            color="#ffd27a"
            transparent
            opacity={0.038}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    );
  }

  if (mode === "autumn") {
    return <instancedMesh ref={leavesRef} args={[leafGeom, leafMat, LEAF_COUNT]} />;
  }

  if (mode === "winter") {
    return (
      <points ref={pointsRef} geometry={snowGeom}>
        <pointsMaterial
          color="#eef6ff"
          size={0.042}
          transparent
          opacity={0.88}
          depthWrite={false}
          blending={THREE.NormalBlending}
          sizeAttenuation
        />
      </points>
    );
  }

  return (
    <points visible={false}>
      <bufferGeometry />
      <pointsMaterial color="#ffffff" size={0.01} />
    </points>
  );
}

export const SeasonsParticles = memo(SeasonsParticlesInner);
