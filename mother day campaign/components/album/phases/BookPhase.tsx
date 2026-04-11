"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Suspense, useMemo, useState } from "react";
import { BookScene } from "@/components/three/scene/BookScene";
import type { AlbumPhoto } from "@/lib/types";

function BookLoadingFallback() {
  return (
    <mesh position={[0, 0.1, 0]}>
      <planeGeometry args={[1.8, 2.4]} />
      <meshStandardMaterial color="#1a1a1f" roughness={1} />
    </mesh>
  );
}

export function BookPhase({
  photos,
  onFinished,
}: {
  photos: AlbumPhoto[];
  onFinished: () => void;
}) {
  const [index, setIndex] = useState(0);
  const photo = useMemo(() => photos[index], [index, photos]);

  return (
    <section className="relative min-h-screen">
      <Canvas
        style={{ touchAction: "none" }}
        dpr={[1, 1.5]}
        camera={{ position: [0, 1.2, 3.2], fov: 45 }}
        gl={{ antialias: false, powerPreference: "high-performance" }}
      >
        <ambientLight intensity={0.75} />
        <directionalLight position={[4, 6, 3]} intensity={1.25} />
        <directionalLight position={[-3, 2, -2]} intensity={0.35} />
        <Suspense fallback={<BookLoadingFallback />}>
          <BookScene key={photo.url} photo={photo} />
        </Suspense>
        <OrbitControls enablePan={false} enableZoom={false} />
      </Canvas>

      <p className="pointer-events-none absolute top-6 left-0 right-0 px-6 text-center text-sm text-zinc-200/95 max-w-xl mx-auto">
        {photo.caption || ""}
      </p>

      <div className="absolute inset-x-0 bottom-8 flex justify-center gap-3">
        <button
          className="rounded-md border border-zinc-600 bg-black/50 px-4 py-2"
          onClick={() => setIndex((v) => Math.max(0, v - 1))}
        >
          Prev
        </button>
        {index < photos.length - 1 ? (
          <button className="rounded-md bg-white text-black px-4 py-2" onClick={() => setIndex((v) => v + 1)}>
            Next
          </button>
        ) : (
          <button className="rounded-md bg-white text-black px-4 py-2" onClick={onFinished}>
            Close Book
          </button>
        )}
      </div>
    </section>
  );
}
