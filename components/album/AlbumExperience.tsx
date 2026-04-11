"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MemoraPremium } from "@/components/memora/MemoraPremium";
import type { Album } from "@/lib/types";

export function AlbumExperience({ albumId }: { albumId: string }) {
  const [album, setAlbum] = useState<Album | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    async function bootstrap() {
      setLoadError(null);
      const res = await fetch(`/api/album/${albumId}`);
      const json = (await res.json()) as Album | { error?: string };

      if (!res.ok) {
        const msg = "error" in json && json.error ? json.error : `Request failed (${res.status}).`;
        setLoadError(msg);
        return;
      }

      setAlbum(json as Album);
    }
    bootstrap();
  }, [albumId]);

  const canPlayMusic = useMemo(() => !!album?.background_music_url, [album]);

  const onStartMusic = useCallback(async () => {
    const url = album?.background_music_url;
    if (!url) return;
    const audio = new Audio(url);
    audio.loop = true;
    musicRef.current = audio;
    try {
      await audio.play();
    } catch {
      // Playback may still be blocked depending on browser policy.
    }
  }, [album]);

  if (loadError) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-red-300 max-w-lg">{loadError}</p>
      </main>
    );
  }

  if (!album) {
    return (
      <main className="min-h-screen bg-black text-[#f6efdf] flex items-center justify-center memora-serif">
        Loading memory…
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <MemoraPremium
        album={album}
        canPlayMusic={canPlayMusic}
        onStartMusic={onStartMusic}
        onTvPowered={() => {
          if (musicRef.current) musicRef.current.volume = 0.22;
        }}
      />
    </main>
  );
}
