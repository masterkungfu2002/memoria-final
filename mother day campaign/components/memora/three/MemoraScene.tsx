"use client";

import { Suspense } from "react";
import { SeasonsParticles } from "@/components/memora/three/SeasonsParticles";
import { CassetteTape } from "@/components/memora/three/CassetteTape";
import { useMemoraStore } from "@/lib/memora-store";
import type { Album } from "@/lib/types";

export function MemoraScene({ album: _album, videoEl: _videoEl }: { album: Album; videoEl: HTMLVideoElement | null }) {
  const currentAct = useMemoraStore((s) => s.currentAct);
  const currentPage = useMemoraStore((s) => s.currentPage);
  const studioWarm = useMemoraStore((s) => s.studioWarm);

  return (
    <>
      <SeasonsParticles act={currentAct} currentPage={currentPage} studioWarm={studioWarm} />
      
      {currentAct === 2 && (
        null
      )}

      {currentAct === 3 && (
        <CassetteTape visible={true} />
      )}

      {currentAct === 4 && (
        null
      )}
    </>
  );
}

export function MemoraSceneSuspense({ album, videoEl }: { album: Album; videoEl: HTMLVideoElement | null }) {
  return (
    <Suspense fallback={null}>
      <MemoraScene album={album} videoEl={videoEl} />
    </Suspense>
  );
}
