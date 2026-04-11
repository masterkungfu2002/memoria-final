"use client";

import { useFrame, useLoader } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect, useMemo, useRef } from "react";
import { TextureLoader } from "three";
import * as THREE from "three";
import { createCaptionTexture } from "@/lib/caption-texture";

type Spread = { photoUrl: string; caption: string };

export function PhotoBook({
  coverUrl,
  spreads,
  spreadIndex,
  isClosing,
  openProgress,
  visible,
}: {
  coverUrl: string;
  spreads: Spread[];
  spreadIndex: number;
  isClosing: boolean;
  openProgress: number;
  visible: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const coverL = useRef<THREE.Group>(null);
  const coverR = useRef<THREE.Group>(null);
  const pageFlip = useRef<THREE.Group>(null);

  const photoUrls = useMemo(() => {
    // Filter and ensure we have valid absolute URLs
    const raw = [coverUrl, ...spreads.map((s) => s.photoUrl)];
    return raw.map(u => {
      if (!u) return "";
      if (u.startsWith('http')) return u;
      return ""; // Skip invalid
    }).filter(u => u !== "");
  }, [coverUrl, spreads]);

  // Use a try-catch pattern for the loader if possible, 
  // but Three.js useLoader handles this via Suspense usually.
  const textures = useLoader(TextureLoader, photoUrls, (loader) => {
    loader.crossOrigin = "anonymous";
  });

  const textureList = useMemo(() => {
    if (!textures) return [];
    return Array.isArray(textures) ? textures : [textures];
  }, [textures]);

  const safeSpread = spreads.length
    ? Math.min(Math.max(spreadIndex, 0), spreads.length - 1)
    : 0;
  const photoTex = (textureList && textureList.length > safeSpread + 1) ? textureList[safeSpread + 1] : (textureList[1] || textureList[0]);

  const caption = spreads[safeSpread]?.caption ?? "";
  const captionTex = useMemo(() => createCaptionTexture(caption), [caption]);
  useEffect(() => () => captionTex.dispose(), [captionTex]);

  useEffect(() => {
    if (!pageFlip.current || isClosing) return;
    gsap.fromTo(
      pageFlip.current.rotation,
      { y: -0.35 },
      { y: 0, duration: 0.85, ease: "power3.out" },
    );
  }, [safeSpread, isClosing]);

  useEffect(() => {
    const g = group.current;
    if (!g) return;
    if (isClosing) {
      gsap.to(g.scale, {
        x: 0.08,
        y: 0.08,
        z: 0.08,
        duration: 1.35,
        ease: "power3.inOut",
      });
      gsap.to(g.rotation, {
        y: Math.PI * 0.42,
        x: -0.12,
        duration: 1.35,
        ease: "power3.inOut",
      });
    } else {
      gsap.killTweensOf(g.scale);
      gsap.killTweensOf(g.rotation);
      g.scale.set(1, 1, 1);
      g.rotation.set(0, 0, 0);
    }
  }, [isClosing]);

  useFrame((state) => {
    const open = THREE.MathUtils.clamp(openProgress, 0, 1);
    const lid = THREE.MathUtils.lerp(Math.PI * 0.55, 0.02, open);

    if (coverL.current) coverL.current.rotation.y = lid;
    if (coverR.current) coverR.current.rotation.y = -lid;

    // Mobile-friendly floating effect
    if (group.current) {
      group.current.position.y = Math.sin(state.clock.elapsedTime * 0.6) * 0.05;
      group.current.rotation.x = 0.05 + Math.cos(state.clock.elapsedTime * 0.4) * 0.02;
    }
  });

  const pageW = 1.8;
  const pageH = 2.4;

  if (!visible) return null;

  return (
    <group ref={group} position={[0, 0, 0]} rotation={[0.05, 0, 0]}>
      {/* Table Surface */}
      <mesh position={[0, -0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#050505" roughness={0.1} metalness={0.2} />
      </mesh>

      {/* Book Base / Back Cover */}
      <mesh position={[0, -0.06, 0]}>
        <boxGeometry args={[pageW * 2 + 0.1, 0.08, pageH + 0.1]} />
        <meshStandardMaterial color="#1a120c" roughness={0.9} />
      </mesh>

      {/* Left Page (Caption) */}
      <group ref={coverL} position={[-0.01, 0.02, 0]}>
        <group position={[-pageW * 0.5, 0, 0]}>
          <mesh>
            <boxGeometry args={[pageW, 0.04, pageH]} />
            <meshStandardMaterial color="#faf7f1" roughness={1} />
          </mesh>
          {captionTex ? (
            <mesh position={[0, 0.021, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[pageW - 0.2, pageH - 0.2]} />
              <meshStandardMaterial map={captionTex} transparent roughness={1} />
            </mesh>
          ) : null}
        </group>
      </group>

      {/* Right Page (Photo) */}
      <group ref={coverR} position={[0.01, 0.02, 0]}>
        <group position={[pageW * 0.5, 0, 0]}>
          <mesh>
            <boxGeometry args={[pageW, 0.04, pageH]} />
            <meshStandardMaterial color="#faf7f1" roughness={1} />
          </mesh>
          <mesh position={[0, 0.021, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[pageW - 0.1, pageH - 0.1]} />
            <meshStandardMaterial map={photoTex} roughness={0.4} />
          </mesh>
          {/* Photo Frame / Border */}
          <mesh position={[0, 0.022, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[pageW - 0.05, pageH - 0.05]} />
            <meshStandardMaterial color="#ffffff" wireframe />
          </mesh>
        </group>
      </group>
    </group>
  );
}
