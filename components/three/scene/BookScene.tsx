"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useLoader } from "@react-three/fiber";
import { TextureLoader } from "three";
import * as THREE from "three";
import type { AlbumPhoto } from "@/lib/types";

/**
 * Tải ảnh album từ URL (Supabase public) với crossOrigin để WebGL không bị chặn CORS.
 */
export function BookScene({ photo }: { photo: AlbumPhoto }) {
  const texture = useLoader(TextureLoader, photo.url, (loader) => {
    loader.crossOrigin = "anonymous";
  });
  const textureRef = useRef(texture);

  useLayoutEffect(() => {
    textureRef.current = texture;
    textureRef.current.colorSpace = THREE.SRGBColorSpace;
    textureRef.current.anisotropy = 8;
  }, [texture]);

  const { width, height } = useMemo(() => {
    const img = texture.image as { width?: number; height?: number } | undefined;
    const w = img?.width ?? 1;
    const h = img?.height ?? 1;
    const aspect = w / h;
    const maxW = 1.9;
    const maxH = 2.65;
    let planeW = maxW;
    let planeH = planeW / aspect;
    if (planeH > maxH) {
      planeH = maxH;
      planeW = planeH * aspect;
    }
    return { width: planeW, height: planeH };
  }, [texture]);

  return (
    <group>
      <mesh position={[0, -0.06, 0]}>
        <boxGeometry args={[2.45, 0.14, 3.15]} />
        <meshStandardMaterial color="#3f2a1f" roughness={0.88} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.12, 0.03]} rotation={[0, 0, 0]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
}
