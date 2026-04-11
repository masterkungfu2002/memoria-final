"use client";

import { Canvas } from "@react-three/fiber";
import { MemoraSceneSuspense } from "@/components/memora/three/MemoraScene";
import type { Album } from "@/lib/types";

export function MemoraCanvas({ album, videoEl }: { album: Album; videoEl: HTMLVideoElement | null }) {
  return (
    <Canvas
      style={{ touchAction: "none" }}
      dpr={[1, 2]} // Optimize for Retina/Mobile displays
      camera={{ position: [0, 0.2, 5.5], fov: 42, near: 0.1, far: 100 }}
      gl={{
        antialias: true,
        powerPreference: "high-performance",
        alpha: true,
        premultipliedAlpha: false,
        stencil: false,
        depth: true,
      }}
    >
      <MemoraSceneSuspense album={album} videoEl={videoEl} />
    </Canvas>
  );
}
