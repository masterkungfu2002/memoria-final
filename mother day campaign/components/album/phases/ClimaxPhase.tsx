"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useState } from "react";
import { motion } from "framer-motion";
import { ClimaxScene } from "@/components/three/scene/ClimaxScene";
import { TVStaticOverlay } from "@/components/three/effects/TVStaticOverlay";

export function ClimaxPhase({
  videoUrl,
  onEnded,
  onVideoRef,
  onStartVideo,
}: {
  videoUrl: string;
  onEnded: () => void;
  onVideoRef: (el: HTMLVideoElement | null) => void;
  onStartVideo: () => void;
}) {
  const [showVideo, setShowVideo] = useState(false);
  const [showStatic, setShowStatic] = useState(false);

  async function handleCassetteTap() {
    setShowStatic(true);
    setTimeout(() => {
      setShowStatic(false);
      setShowVideo(true);
      onStartVideo();
    }, 1000);
  }

  return (
    <section className="relative min-h-screen bg-zinc-950">
      <Canvas
        style={{ touchAction: "none" }}
        dpr={[1, 1.5]}
        camera={{ position: [0, 0.45, 3.8], fov: 42 }}
        gl={{ antialias: false, powerPreference: "high-performance" }}
      >
        <ambientLight intensity={0.55} />
        <directionalLight position={[2, 4, 3]} intensity={0.9} />
        <Suspense fallback={null}>
          <ClimaxScene onCassetteTap={handleCassetteTap} />
        </Suspense>
      </Canvas>

      <TVStaticOverlay active={showStatic} />

      {showVideo ? (
        <motion.video
          className="absolute inset-4 md:inset-12 rounded-xl bg-black object-cover w-[calc(100%-2rem)] h-[calc(100%-2rem)] md:w-[calc(100%-6rem)] md:h-[calc(100%-6rem)]"
          src={videoUrl}
          controls
          playsInline
          autoPlay
          onEnded={onEnded}
          ref={onVideoRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        />
      ) : (
        <p className="absolute bottom-8 w-full text-center text-zinc-300">
          Tap the cassette to start the final memory.
        </p>
      )}
    </section>
  );
}
