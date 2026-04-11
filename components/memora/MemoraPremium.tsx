"use client";

import dynamic from "next/dynamic";
import gsap from "gsap";
import { useCallback, useEffect, useRef, useState } from "react";
import { MemoraActOne } from "@/components/memora/MemoraActOne";
import { MemoraBookCSS } from "@/components/memora/MemoraBookCSS";
import { MemoraBrightBackdrop } from "@/components/memora/MemoraBrightBackdrop";
import { MemoraEcho } from "@/components/memora/MemoraEcho";
import { MemoraLoading } from "@/components/memora/MemoraLoading";
import { useMemoraStore } from "@/lib/memora-store";
import { playMechanicalClack } from "@/lib/playMechanicalClack";
import type { Album } from "@/lib/types";

const MemoraCanvas = dynamic(
  () => import("@/components/memora/three/MemoraCanvas").then((m) => m.MemoraCanvas),
  { ssr: false, loading: () => <MemoraLoading /> },
);

function MemoraCassetteLayer({ onInsert }: { onInsert: () => void }) {
  return (
    <div className="pointer-events-auto absolute inset-0 z-[28] flex flex-col items-center justify-center px-6 bg-black/40 backdrop-blur-sm">
      <div className="text-center mb-8 space-y-2">
        <h3 className="memora-serif text-2xl text-white tracking-widest uppercase">One More Thing...</h3>
        <p className="memora-serif text-[10px] tracking-[0.4em] uppercase text-[#d4a84b] animate-pulse">
          Tap the tape to play your video
        </p>
      </div>
      
      <div
        role="button"
        tabIndex={0}
        className="cursor-pointer active:scale-95 transition-transform duration-300 drop-shadow-[0_20px_50px_rgba(212,168,75,0.3)]"
        onClick={onInsert}
      >
        <svg width="300" height="180" viewBox="0 0 300 180" xmlns="http://www.w3.org/2000/svg">
          <rect x="10" y="20" width="280" height="145" rx="12" fill="#1a1208" stroke="#3a2f1a" strokeWidth="1.5"/>
          <rect x="18" y="28" width="264" height="130" rx="9" fill="#110e06" stroke="#2a2210" strokeWidth="1"/>
          <rect x="60" y="38" width="180" height="72" rx="5" fill="#f0d080" opacity="0.9"/>
          <rect x="66" y="44" width="168" height="60" rx="4" fill="#e8c85a"/>
          <text x="150" y="65" textAnchor="middle" fontFamily="Georgia" fontSize="9" fill="#3a2810" fontWeight="bold">MEMORIES</text>
          <line x1="80" y1="72" x2="220" y2="72" stroke="#c9a84c" strokeWidth="0.8" opacity="0.6"/>
          <text x="150" y="85" textAnchor="middle" fontFamily="Georgia" fontSize="7" fill="#5a4020" fontStyle="italic">Side A — For You</text>
          <text x="150" y="97" textAnchor="middle" fontFamily="Arial" fontSize="6" fill="#7a6030">♪ With All Our Love ♪</text>
          <rect x="75" y="118" width="150" height="30" rx="3" fill="#0a0805" stroke="#2a2010" strokeWidth="1"/>
          <path d="M 95 133 Q 150 125 205 133" stroke="#2a1a08" strokeWidth="2.5" fill="none"/>
          <circle className="animate-spin-slow origin-center" cx="105" cy="133" r="16" fill="#1a1208" stroke="#3a2a10" strokeWidth="1.5"/>
          <circle cx="105" cy="133" r="10" fill="#0a0805" stroke="#2a1a08" strokeWidth="1"/>
          <circle cx="105" cy="133" r="4" fill="#3a2a10"/>
          <circle className="animate-spin-slow origin-center" cx="195" cy="133" r="16" fill="#1a1208" stroke="#3a2a10" strokeWidth="1.5"/>
          <circle cx="195" cy="133" r="10" fill="#0a0805" stroke="#2a1a08" strokeWidth="1"/>
          <circle cx="195" cy="133" r="4" fill="#3a2a10"/>
        </svg>
      </div>
    </div>
  );
}

export function MemoraPremium({
  album,
  canPlayMusic = true,
  onStartMusic,
  onTvPowered,
}: {
  album: Album;
  canPlayMusic?: boolean;
  onStartMusic?: () => void | Promise<void>;
  onTvPowered?: () => void;
}) {
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const crtRef = useRef<HTMLDivElement | null>(null);

  const currentAct = useMemoraStore((s) => s.currentAct);
  const currentPage = useMemoraStore((s) => s.currentPage);
  const bloomFlash = useMemoraStore((s) => s.bloomFlash);
  const tvPowered = useMemoraStore((s) => s.tvPowered);

  const setAct = useMemoraStore((s) => s.setAct);
  const setStudioWarm = useMemoraStore((s) => s.setStudioWarm);
  const setTvPowered = useMemoraStore((s) => s.setTvPowered);
  const reset = useMemoraStore((s) => s.reset);

  const prevAct = useRef(currentAct);

  useEffect(() => () => reset(), [reset]);

  useEffect(() => {
    if (prevAct.current === 1 && currentAct === 2) {
      useMemoraStore.setState({ bookSpreadIndex: 0, currentPage: 0 });
    }
    prevAct.current = currentAct;
  }, [currentAct]);

  useEffect(() => {
    if (!tvPowered) return;
    if (!videoEl) return;
    
    videoEl.load();
    const playPromise = videoEl.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.error("Video playback failed:", error);
      });
    }
    onTvPowered?.();
  }, [tvPowered, onTvPowered, videoEl]);

  const handleVideoEnded = useCallback(() => {
    if (useMemoraStore.getState().currentAct !== 4) return;
    setAct(5);
    if (videoEl) videoEl.pause();
  }, [setAct, videoEl]);

  async function beginFromHook() {
    if (audioRef.current) {
      audioRef.current.play().catch(err => console.log("Audio play blocked by browser"));
    }
    setStudioWarm(true);
    setAct(2);
  }

  function handleTapeInsert() {
    playMechanicalClack();
    if (audioRef.current) {
      gsap.to(audioRef.current, { volume: 0, duration: 1.5, onComplete: () => audioRef.current?.pause() });
    }
    setAct(4);
    setTvPowered(true);
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black text-white font-sans">
      <audio ref={audioRef} src={album.background_music_url} loop />
      
      {/* Cinematic Grain Overlay */}
      <div className="fixed inset-0 pointer-events-none z-[100] opacity-[0.03] bg-[url('https://media.giphy.com/media/oEI9uWUznW3D2/giphy.gif')]" />

      <div className="absolute inset-0 z-[5]">
        <MemoraCanvas album={album} videoEl={videoEl} />
      </div>

      <div
        className="pointer-events-none absolute inset-0 z-10 mix-blend-screen"
        style={{
          background: `radial-gradient(circle at 50% 42%, rgba(255,248,232,${bloomFlash * 0.85}) 0%, rgba(255,240,210,${bloomFlash * 0.45}) 38%, transparent 62%)`,
          opacity: 0.88,
        }}
      />

      <MemoraActOne onBegin={beginFromHook} />

      {currentAct === 2 && (
        <MemoraBookCSS 
          recipientName={album.recipient_name} 
          photos={album.photos} 
          eventDate={new Date(album.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} 
        />
      )}

      {currentAct === 3 && <MemoraCassetteLayer onInsert={handleTapeInsert} />}

      {/* CRT TV Overlay */}
      <div
        ref={crtRef}
        className={`fixed inset-0 z-[200] flex items-center justify-center px-5 bg-black/95 transition-opacity duration-1000 ${currentAct === 4 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <div className="relative w-[min(90vw,580px)] group">
          <button 
            onClick={() => setAct(5)}
            className="absolute -top-12 -right-4 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-red-500/80 transition-colors z-10"
          >
            ✕
          </button>
          
          <div className="bg-gradient-to-b from-[#1e1a0e] to-[#12100a] rounded-[18px_18px_24px_24px] p-[18px_22px_38px] shadow-[0_0_0_2px_#2a2412,0_0_0_4px_#0a0808,0_15px_50px_rgba(0,0,0,0.9)]">
            <div className="bg-[#0a0a05] rounded-xl p-2 shadow-[inset_0_0_20px_rgba(0,0,0,0.9),0_0_0_2px_#1a1810]">
              <div className="relative aspect-[4/3] rounded-md overflow-hidden bg-black group">
                {/* CRT Screen Glow */}
                <div className="absolute inset-[-8px] z-[3] pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(80,200,80,0.12)_0%,transparent_70%)] animate-pulse" />
                
                {/* CRT Static/Scanlines */}
                <div className="absolute inset-0 z-[7] pointer-events-none bg-[repeating-linear-gradient(to_bottom,transparent_0px,transparent_3px,rgba(0,0,0,0.18)_3px,rgba(0,0,0,0.18)_4px)]" />
                
                {!tvPowered && (
                  <div className="absolute inset-0 z-[5] bg-[#888] bg-[url('https://media.giphy.com/media/oEI9uWUznW3D2/giphy.gif')] opacity-60" />
                )}

                <video
                  ref={setVideoEl}
                  src={album.video_url}
                  crossOrigin="anonymous"
                  playsInline
                  onEnded={handleVideoEnded}
                  className="absolute inset-0 w-full h-full object-cover z-[2]"
                />
              </div>
            </div>
            
            <div className="flex justify-center gap-3 mt-4">
              <span className="w-6 h-6 rounded-full bg-[radial-gradient(circle_at_40%_35%,#3a3020,#1a1810)] shadow-lg" />
              <span className="w-6 h-6 rounded-full bg-[radial-gradient(circle_at_40%_35%,#3a3020,#1a1810)] shadow-lg" />
              <span className="w-6 h-6 rounded-full bg-[radial-gradient(circle_at_40%_35%,#3a3020,#1a1810)] shadow-lg" />
            </div>
            
            <div className={`absolute bottom-4 right-6 w-2 h-2 rounded-full transition-all duration-500 ${tvPowered ? 'bg-[#22ff55] shadow-[0_0_8px_#22ff55]' : 'bg-[#1a1812]'}`} />
            <div className="text-center mt-2 font-mono text-[8px] tracking-[0.5em] text-[#2a2515] uppercase">
              Memories · TV
            </div>
          </div>
        </div>
      </div>

      {currentAct === 5 && <MemoraEcho albumId={album.id} />}

      <style jsx global>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 2s linear infinite;
        }
      `}</style>
    </div>
  );
}
