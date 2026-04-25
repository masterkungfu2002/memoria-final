"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function resolveMediaUrl(url: string) {
  if (!url) return "";
  const driveMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) return `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`;
  return url;
}

function isYouTube(url: string) {
  return /youtu\.?be/.test(url);
}

function youtubeEmbed(url: string) {
  const id = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1] || "";
  return id ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&controls=1&rel=0&playsinline=1` : "";
}

function safeRecipient(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === "mom" || normalized === "mother" || normalized === "mẹ") return "you";
  return value;
}

function Reel({ spinning }: { spinning: boolean }) {
  return (
    <div
      className={`relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-[#3b2313]/40 bg-[radial-gradient(circle_at_35%_32%,#f7e9bd,#b59158_42%,#3a2112_74%,#120907)] shadow-[inset_0_2px_8px_rgba(255,255,255,0.2),inset_0_-5px_12px_rgba(0,0,0,0.42)] ${spinning ? "animate-spin" : ""}`}
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <span
          key={index}
          className="absolute left-1/2 top-1/2 h-[76%] w-[7%] origin-center rounded-full bg-[#1c0e08]/88"
          style={{ transform: `translate(-50%, -50%) rotate(${index * 30}deg)` }}
        />
      ))}
      <span className="absolute left-1/2 top-1/2 h-[22%] w-[22%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#d8c69c]/20 bg-[#070403]" />
    </div>
  );
}

function Cassette({ spinning, recipient, year }: { spinning: boolean; recipient: string; year: string }) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[14px] border border-[#7b5e34]/35 bg-[linear-gradient(180deg,#f0e3c3,#cbb687_58%,#82663c)] p-3 shadow-[0_22px_46px_rgba(45,24,10,0.36),inset_0_1px_0_rgba(255,248,226,0.75)]">
      <div className="pointer-events-none absolute inset-x-4 top-2 h-px bg-white/35" />
      <div className="rounded-md border border-[#6b4a27]/22 bg-[linear-gradient(180deg,#fff8ea,#ecdfc2)] p-2">
        <div className="mb-1 flex justify-between text-[8px] uppercase tracking-[0.28em] text-[#7a5928]">
          <span>Side A</span>
          <span>{year}</span>
        </div>
        <p className="font-[var(--font-memora-serif)] text-xl italic leading-none text-[#3d2416]">memora</p>
        <p className="mt-1 truncate text-[10px] italic text-[#5c3620]">for {safeRecipient(recipient)}</p>
      </div>

      <div className="mt-3 rounded-lg border border-[#4b2d17]/35 bg-[linear-gradient(180deg,#2c1710,#090403)] px-4 py-3 shadow-[inset_0_10px_22px_rgba(0,0,0,0.52)]">
        <div className="flex items-center justify-between gap-4">
          <Reel spinning={spinning} />
          <div className="relative h-7 flex-1 rounded-full border border-[#5d3d21]/60 bg-[linear-gradient(180deg,#1a0d08,#070302)] shadow-inner">
            <span className="absolute left-1/2 top-1/2 h-1.5 w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8b5b2e]" />
          </div>
          <Reel spinning={spinning} />
        </div>
      </div>
    </div>
  );
}

function VideoScreen({ playing, videoUrl, onEnded }: { playing: boolean; videoUrl: string; onEnded: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const resolved = resolveMediaUrl(videoUrl);
  const youtube = isYouTube(videoUrl);

  useEffect(() => {
    if (!playing || youtube) return;
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(() => undefined);
  }, [playing, youtube]);

  if (playing && resolved) {
    return youtube ? (
      <iframe title="Final memory" src={youtubeEmbed(videoUrl)} allow="autoplay; encrypted-media; picture-in-picture" className="absolute inset-0 h-full w-full border-0" />
    ) : (
      <video ref={videoRef} src={resolved} playsInline controls onEnded={onEnded} className="absolute inset-0 h-full w-full object-contain" />
    );
  }

  return (
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(232,196,120,0.12),transparent_52%),#050302]">
      <span className="absolute right-5 top-5 h-2.5 w-2.5 rounded-full bg-[#e8c478]/80 shadow-[0_0_18px_rgba(232,196,120,0.75)]" />
      <span className="absolute inset-x-[18%] top-1/2 h-px bg-[linear-gradient(90deg,transparent,rgba(232,196,120,0.22),transparent)]" />
    </div>
  );
}

export function CassetteTVScene({ videoUrl, recipient, year, onEnded }: { videoUrl: string; recipient: string; year: string; onEnded: () => void }) {
  const [inserted, setInserted] = useState(false);
  const [playing, setPlaying] = useState(false);

  const insert = useCallback(() => {
    if (inserted) return;
    setInserted(true);
    window.setTimeout(() => setPlaying(true), 950);
  }, [inserted]);

  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[#fbf6eb]">
      <style jsx global>{`
        @keyframes mem-cassette-float {
          0%, 100% { transform: translate(-50%, -50%) rotate(-2deg) translateY(0); }
          50% { transform: translate(-50%, -50%) rotate(1deg) translateY(-9px); }
        }
      `}</style>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(232,196,120,0.24),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.8),rgba(246,238,222,0.95))]" />
      <div className="relative aspect-[5/6] w-[min(92vw,660px)]">
        <div className="absolute inset-0 rounded-[30px] bg-[linear-gradient(160deg,#784825,#4b2816_52%,#231209)] p-[4%] shadow-[0_30px_72px_rgba(60,30,10,0.44),inset_0_0_60px_rgba(0,0,0,0.38)]">
          <div className="flex h-full gap-[4%]">
            <div className="relative flex-1 rounded-[24px] bg-[linear-gradient(180deg,#180c07,#070303)] p-[3.5%] shadow-inner">
              <div className="relative h-full overflow-hidden rounded-[18px] bg-black">
                <VideoScreen playing={playing} videoUrl={videoUrl} onEnded={onEnded} />
                <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0_2px,rgba(255,255,255,0.05)_2px_3px)] mix-blend-screen" />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.55)_100%)]" />
              </div>
            </div>

            <div className="hidden w-[14%] flex-col items-center justify-between rounded-[22px] border border-[#8b5a2b]/25 bg-[linear-gradient(180deg,#3d1f10,#1f0d06)] p-3 sm:flex">
              <span className="mt-1 h-3 w-3 rounded-full bg-[#e8c478]/80 shadow-[0_0_14px_rgba(232,196,120,0.55)]" />
              {Array.from({ length: 3 }).map((_, i) => (
                <span key={i} className="h-[clamp(28px,4.4vw,46px)] w-[clamp(28px,4.4vw,46px)] rounded-full border border-[#2a160c]/50 bg-[radial-gradient(circle_at_34%_30%,#f1cf83,#9b6831_58%,#2b160b)] shadow-[inset_0_5px_12px_rgba(255,240,180,0.18),inset_0_-8px_15px_rgba(0,0,0,0.5)]" />
              ))}
              <span className="mb-1 h-10 w-1 rounded-full bg-[#110704] shadow-inner" />
            </div>
          </div>

          <div className="absolute bottom-[8.6%] left-1/2 h-[42px] w-[58%] -translate-x-1/2 rounded-t-xl border border-[#2a1208]/60 bg-[linear-gradient(180deg,#1d0b05,#050202)] shadow-[inset_0_3px_12px_rgba(0,0,0,.8)]">
            <div className="mx-auto mt-3 h-1.5 w-[70%] rounded-full bg-[#060202] shadow-[0_0_0_1px_rgba(232,196,120,0.08)]" />
          </div>
        </div>

        <button
          type="button"
          onClick={insert}
          className="absolute left-1/2 z-30 aspect-[8/5] w-[min(270px,52%)] border-0 bg-transparent p-0 transition-all duration-1000 ease-[cubic-bezier(.5,.02,.3,1)]"
          style={{
            top: inserted ? "74%" : "17%",
            transform: inserted ? "translate(-50%,-50%) rotate(0deg) scale(.22)" : "translate(-50%,-50%) rotate(-2deg) scale(1)",
            animation: inserted ? "none" : "mem-cassette-float 3.8s ease-in-out infinite",
            filter: inserted ? "brightness(.42) blur(.2px)" : "none",
            opacity: inserted ? 0 : 1,
            pointerEvents: inserted ? "none" : "auto",
          }}
          aria-label="Tap the cassette to play the final memory"
        >
          <Cassette spinning={playing} recipient={recipient} year={year} />
          {!inserted ? <p className="mt-3 text-center text-[10px] uppercase tracking-[0.38em] text-[#6f4a2e]">Tap the cassette</p> : null}
        </button>
      </div>
    </div>
  );
}
