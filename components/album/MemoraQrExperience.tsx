"use client";

import Image from "next/image";
import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { CSSProperties, ReactNode, TouchEvent } from "react";
import type { Album, AlbumPhoto } from "@/lib/types";
import { CassetteTVScene } from "@/components/cassette/CassetteTVScene";

type Profile = "genz" | "classic";
type Phase = "gate" | "loading" | "letter" | "album" | "video" | "ending";

const phases: { id: Phase; label: string }[] = [
  { id: "gate", label: "Start" },
  { id: "loading", label: "Load" },
  { id: "letter", label: "Letter" },
  { id: "album", label: "Album" },
  { id: "video", label: "Video" },
  { id: "ending", label: "Ending" },
];

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

function phaseHint(phase: Phase, profile: Profile) {
  const hints: Record<Phase, string> = {
    gate: "Turn sound on, hold the phone close, then open the private archive.",
    loading: "The archive is preparing the first scene.",
    letter: "Tap the sealed letter to reveal the personal message.",
    album: profile === "genz" ? "Tap a hanging photo, then swipe the phone memory." : "Swipe left or right to turn the album pages.",
    video: profile === "genz" ? "Play the final memory inside the phone." : "Tap the cassette.",
    ending: "Replay the memory or keep the link safe.",
  };
  return hints[phase];
}

function cleanPhotos(album: Album) {
  const source = album.photos?.length ? album.photos : [{ url: album.cover_image, caption: "" }];
  return source
    .map((photo) => ({
      ...photo,
      url: resolveMediaUrl(photo.url),
      caption: photo.caption?.trim() || "A memory worth holding onto.",
    }))
    .filter((photo) => !!photo.url);
}

function displayRecipientName(name: string | undefined) {
  const normalized = (name || "").trim().toLowerCase();
  if (!normalized || normalized === "mom" || normalized === "mother" || normalized === "mẹ") return "you";
  return name || "you";
}

function displaySenderName(name: string | undefined) {
  const value = (name || "").trim();
  return value || "Someone";
}

function coupleHeading(album: Album) {
  return `${displaySenderName(album.sender_name)} & ${displayRecipientName(album.recipient_name)}`;
}

function displayArchiveDate(album: Album) {
  const date = album.important_date?.trim();
  if (date) return date;
  const created = new Date(album.created_at || Date.now());
  return created.getFullYear().toString();
}

function nameInitials(album: Album) {
  const sender = displaySenderName(album.sender_name).trim().charAt(0).toUpperCase() || "M";
  const recipient = displayRecipientName(album.recipient_name).trim().charAt(0).toUpperCase() || "Y";
  return { sender, recipient };
}

function PhotoFrame({ photo, className = "", priority = false }: { photo: AlbumPhoto; className?: string; priority?: boolean }) {
  return (
    <div className={`relative overflow-hidden bg-black/20 ${className}`}>
      <Image src={photo.url} alt={photo.caption || "Memory"} fill priority={priority} className="object-cover" unoptimized />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_28%,rgba(0,0,0,0.28))]" />
    </div>
  );
}

function Stars({ count = 40, warm = true }: { count?: number; warm?: boolean }) {
  const stars = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 78}%`,
        size: 1 + Math.random() * 2.2,
        opacity: 0.22 + Math.random() * 0.58,
        delay: `${Math.random() * 4}s`,
      })),
    [count],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {stars.map((star) => (
        <span
          key={star.id}
          className="memora-star-dot absolute rounded-full"
          style={
            {
              left: star.left,
              top: star.top,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
              animationDelay: star.delay,
              background: warm ? "#fff5dc" : "#c4b5fd",
              boxShadow: warm ? "0 0 10px rgba(255,245,220,.55)" : "0 0 10px rgba(196,181,253,.55)",
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

function ShootingStar({ delay = "1.8s" }: { delay?: string }) {
  return <div className="memora-shooting-star" style={{ animationDelay: delay }} />;
}

function Petals({ count = 8 }: { count?: number }) {
  const petals = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: `${-10 + Math.random() * 25}%`,
        delay: `${i * 0.42}s`,
        duration: `${9 + Math.random() * 7}s`,
        scale: 0.68 + Math.random() * 0.7,
      })),
    [count],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {petals.map((petal) => (
        <span
          key={petal.id}
          className="memora-petal-drift absolute rounded-full"
          style={
            {
              left: petal.left,
              top: "-8%",
              animationDelay: petal.delay,
              animationDuration: petal.duration,
              transform: `scale(${petal.scale})`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

function MemoraWordmark({ size = 12 }: { size?: number }) {
  return (
    <div className="inline-flex items-center gap-3">
      <span className="relative block overflow-hidden rounded-full border border-[#c49a58]/35 bg-[#f7f1e5]" style={{ width: size * 2.5, height: size * 2.5 }}>
        <Image src="/memora-logo.jpg" alt="Memora" fill className="object-cover" unoptimized />
      </span>
      <span className="font-[var(--font-memora-serif)] uppercase tracking-[0.42em] text-[#c49a58]" style={{ fontSize: size }}>MEMORA</span>
    </div>
  );
}

function GatePhase({ album, onBegin }: { album: Album; cover: AlbumPhoto; onBegin: () => void }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 80);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <section className="relative mx-auto flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_0%,rgba(196,154,88,.18)_0%,transparent_48%),linear-gradient(180deg,#090806_0%,#130d09_55%,#060504_100%)] px-7 py-10 text-center">
      <Stars count={55} warm />
      <ShootingStar delay="2s" />
      <Petals count={9} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,.58)_100%)]" />
      <div
        className="relative z-10 flex max-w-[340px] flex-col items-center"
        style={{ opacity: ready ? 1 : 0, transform: ready ? "none" : "translateY(14px)", transition: "all 1.3s cubic-bezier(.22,1,.36,1)" }}
      >
        <div className="mb-11 rounded-full border border-[#c49a58]/35 bg-black/45 px-5 py-3 backdrop-blur-xl">
          <MemoraWordmark size={13} />
        </div>
        <p className="mb-4 text-[10px] uppercase tracking-[0.5em] text-[#c49a58]/75">A love letter from</p>
        <h1 className="font-[var(--font-memora-serif)] text-[54px] font-light leading-none text-[#f5ead4]">{displaySenderName(album.sender_name)}</h1>
        <span className="my-1 block font-[var(--font-cormorant)] text-[30px] italic text-[#c49a58]">&amp;</span>
        <h1 className="mb-6 font-[var(--font-memora-serif)] text-[54px] font-light leading-none text-[#f5ead4]">{displayRecipientName(album.recipient_name)}</h1>
        <div className="mb-4 h-px w-[72px] bg-[linear-gradient(90deg,transparent,rgba(196,154,88,.85),transparent)]" />
        <p className="mb-12 text-[10px] uppercase tracking-[0.38em] text-[#c49a58]/55">EST. {displayArchiveDate(album)}</p>
        <p className="mb-10 max-w-[270px] text-sm leading-7 text-[#f5ead4]/62">A sealed letter. A quiet beginning.<br />Then the whole story opens.</p>
        <button type="button" onClick={onBegin} className="rounded-full border border-[#e8c878]/30 bg-[linear-gradient(180deg,rgba(248,228,178,.98),rgba(196,154,88,.93))] px-9 py-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#2a1810] shadow-[0_14px_40px_rgba(196,154,88,.26)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(196,154,88,.38)]">
          Begin the story
        </button>
      </div>
    </section>
  );
}

function LoadingPhase({ album }: { album: Album }) {
  return (
    <section className="relative mx-auto flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_0%,rgba(196,154,88,.1)_0%,transparent_42%),linear-gradient(180deg,#090806,#120d0c_50%,#060504)] p-10 text-center">
      <Stars count={38} warm />
      <div className="relative z-10 animate-[mem-fadein_.8s_ease_both]">
        <div className="mx-auto mb-8 flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-full border border-[#c49a58]/40 bg-[#f7f1e5] shadow-[0_0_40px_rgba(196,154,88,.14)]">
          <Image src="/memora-logo.jpg" alt="Memora" width={64} height={64} className="h-16 w-16 object-cover" unoptimized priority />
        </div>
        <p className="mb-6 text-[10px] uppercase tracking-[0.48em] text-[#c49a58]/70">Preparing your story</p>
        <div className="mx-auto mb-8 h-px w-[148px] overflow-hidden bg-[#c49a58]/15">
          <div className="h-full w-full animate-[mem-loader_1.8s_ease-in-out_infinite] bg-[linear-gradient(90deg,transparent,rgba(232,200,120,.95),transparent)]" />
        </div>
        <h2 className="font-[var(--font-memora-serif)] text-[30px] font-light tracking-[0.02em] text-[#f5ead4]">{coupleHeading(album)}</h2>
      </div>
    </section>
  );
}

function LetterPhase({ album, onContinue }: { album: Album; onContinue: () => void }) {
  const [ready, setReady] = useState(false);
  const [opened, setOpened] = useState(false);
  const [letterVisible, setLetterVisible] = useState(false);
  const initials = nameInitials(album);
  const letter = album.opening_letter || album.opening_message || "I built this from the moments I never want us to lose. Open it slowly. It is all in here.";

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 420);
    return () => window.clearTimeout(timer);
  }, []);

  const openLetter = () => {
    if (opened) return;
    setOpened(true);
    window.setTimeout(() => setLetterVisible(true), 640);
  };

  return (
    <section className="relative mx-auto flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_0%,rgba(196,154,88,.16)_0%,transparent_44%),radial-gradient(circle_at_14%_22%,rgba(80,53,160,.08)_0%,transparent_32%),linear-gradient(180deg,#090806,#110d0c_45%,#060504)] px-6 py-6">
      <Stars count={48} warm />
      <ShootingStar delay="1.2s" />
      <Petals count={11} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,.55)_100%)]" />
      <div className="absolute left-0 right-0 top-6 z-10 flex flex-col items-center" style={{ opacity: ready ? 1 : 0, transition: "opacity 1.1s ease .35s" }}>
        <div className="mb-5 rounded-full border border-[#c49a58]/30 bg-black/45 px-5 py-2 backdrop-blur-xl">
          <MemoraWordmark size={12} />
        </div>
        <p className="mb-2 text-[10px] uppercase tracking-[0.48em] text-[#c49a58]/70">A love letter from</p>
        <h2 className="text-center font-[var(--font-memora-serif)] text-[34px] font-light leading-none text-[#f5ead4]">
          {displaySenderName(album.sender_name)} <span className="text-[26px] italic text-[#c49a58]">&amp;</span> {displayRecipientName(album.recipient_name)}
        </h2>
      </div>
      <div className="relative z-20 mt-[130px] w-full max-w-[340px]">
        {!letterVisible ? (
          <button type="button" onClick={openLetter} className="mx-auto block w-[88%] max-w-[290px] border-0 bg-transparent p-0" style={{ cursor: opened ? "default" : "pointer", opacity: ready ? 1 : 0, transform: ready ? (opened ? "translateY(-50px) scale(.82)" : "none") : "translateY(-80px)", transition: "all 1.5s cubic-bezier(.22,1,.36,1)", animation: ready && !opened ? "mem-bob 4.8s ease-in-out infinite" : "none", filter: "drop-shadow(0 28px 56px rgba(0,0,0,.52)) drop-shadow(0 0 36px rgba(196,154,88,.13))" }}>
            <svg viewBox="0 0 320 208" className="block h-auto w-full">
              <defs>
                <linearGradient id="eBody" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#F5EAD4" /><stop offset="55%" stopColor="#EBD9B4" /><stop offset="100%" stopColor="#D8BF88" /></linearGradient>
                <linearGradient id="eFlap" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#F0DDB8" /><stop offset="100%" stopColor="#D4BC86" /></linearGradient>
                <radialGradient id="eSeal" cx="50%" cy="40%" r="60%"><stop offset="0%" stopColor="#D44E6C" /><stop offset="65%" stopColor="#8B1A3A" /><stop offset="100%" stopColor="#5A0D24" /></radialGradient>
              </defs>
              <rect x="10" y="10" width="300" height="188" rx="4" fill="url(#eBody)" />
              <rect x="22" y="22" width="276" height="164" rx="2" fill="none" stroke="#A87850" strokeWidth="0.5" strokeDasharray="2,3" opacity="0.42" />
              <text x="160" y="94" textAnchor="middle" fontSize="13" fill="#5A3A20" letterSpacing="3">TO MY BELOVED</text>
              <line x1="92" y1="110" x2="228" y2="110" stroke="#A87850" strokeWidth="0.4" opacity="0.42" />
              <path d="M 10 10 L 160 108 L 310 10 Z" fill="url(#eFlap)" stroke="#B8946A" strokeWidth="0.5" />
              <g className="mem-seal-pulse" transform="translate(160,108)">
                <circle r="22" fill="url(#eSeal)" />
                <circle r="22" fill="none" stroke="#3A0815" strokeWidth="0.8" opacity="0.6" />
                <text y="6" textAnchor="middle" fontSize="18" fill="#F5EAD4">{initials.sender}</text>
                <text x="8" y="6" textAnchor="middle" fontSize="15" fill="#F5EAD4">{initials.recipient}</text>
              </g>
              <g transform="translate(160,166)" opacity="0.42"><path d="M -25 0 Q -10 -8 0 0 Q 10 8 25 0" stroke="#8B6440" strokeWidth="0.6" fill="none" /><circle cx="0" cy="0" r="1" fill="#8B6440" /></g>
            </svg>
          </button>
        ) : (
          <div className="mem-fadeup relative mx-auto w-[min(90vw,480px)] rotate-[-1deg] rounded-sm bg-[linear-gradient(135deg,#f5ead4_0%,#ebdcb8_100%)] px-8 py-11 text-[#3a2418] shadow-[0_30px_80px_rgba(0,0,0,.6),inset_0_0_60px_rgba(184,130,80,.15)]">
            <div className="pointer-events-none absolute inset-2 border border-[#b88250]/25" />
            <div className="absolute -right-5 -top-7 text-[70px] drop-shadow-[0_8px_20px_rgba(0,0,0,.4)]">🌹</div>
            <div className="mb-3 text-center font-[var(--font-memora-serif)] text-[32px] text-[#8b1a3a]">❦</div>
            <div className="mb-6 text-center font-[var(--font-cormorant)] text-[22px] italic">My dearest {displayRecipientName(album.recipient_name)},</div>
            <p className="mb-7 text-center font-[var(--font-cormorant)] text-[17px] leading-[1.85]">{letter}</p>
            <div className="mb-2 text-center font-[var(--font-cormorant)] text-[28px] text-[#8b1a3a]">Forever yours,</div>
            <div className="text-center text-[13px] uppercase tracking-[0.3em] text-[#8b1a3a]">— {displaySenderName(album.sender_name)}</div>
            <div className="mt-9 text-center">
              <button type="button" onClick={onContinue} className="rounded-sm bg-[linear-gradient(135deg,#8b1a3a_0%,#d44e6c_100%)] px-8 py-4 text-[12px] uppercase tracking-[0.4em] text-[#f5ead4] shadow-[0_6px_20px_rgba(139,26,58,.4)] transition hover:-translate-y-0.5">Open the Album</button>
            </div>
          </div>
        )}
        {ready && !opened ? <p className="mt-7 text-center font-[var(--font-cormorant)] text-sm italic uppercase tracking-[0.35em] text-[#d4a84b] animate-[mem-breathe_2.5s_ease-in-out_infinite]">Tap the letter</p> : null}
      </div>
    </section>
  );
}

function GenzAlbum({ photos }: { photos: AlbumPhoto[] }) {
  const [active, setActive] = useState<number | null>(null);
  const visible = photos.slice(0, Math.min(12, photos.length));
  const selected = active !== null ? visible[active] : null;

  return (
    <section className="relative mx-auto min-h-[78vh] w-full overflow-hidden rounded-[34px] bg-[radial-gradient(circle_at_18%_18%,rgba(30,27,75,.55)_0%,transparent_40%),linear-gradient(180deg,#0d1b2a,#0a1020)] px-4 pb-8 pt-16 shadow-[0_26px_90px_rgba(0,0,0,.42)]">
      <Stars count={65} warm={false} />
      <div className="relative z-10 mx-auto max-w-4xl">
        <div className="relative mb-7 h-[72px]">
          <div className="absolute left-[1%] right-[1%] top-[30px] h-px bg-[#fde68a]/45" />
          {Array.from({ length: 11 }).map((_, i) => (
            <span key={i} className="mem-fairy absolute top-[22px] h-[9px] w-[9px] rounded-full bg-[#fde68a]" style={{ left: `${i * 9.2 + 1}%`, animationDelay: `${i * 0.14}s` }} />
          ))}
        </div>
        <p className="mb-5 text-center text-[10px] uppercase tracking-[0.42em] text-[#c4b5fd]/65">Our memories</p>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {visible.map((photo, index) => {
            const rot = (index % 2 === 0 ? -1 : 1) * (2.5 + (index % 3) * 1.2);
            return (
              <button key={`${photo.url}-${index}`} type="button" onClick={() => setActive(index)} className="relative border-0 bg-transparent p-0 text-left" style={{ cursor: "pointer" }}>
                <span className="absolute left-1/2 top-[-28px] h-8 w-px -translate-x-1/2 bg-[#fde68a]/50" />
                <span className="absolute left-1/2 top-[-5px] z-10 h-[7px] w-[7px] -translate-x-1/2 rounded-full bg-[#fde68a] shadow-[0_0_7px_rgba(253,230,138,.65)]" />
                <div className="mem-sway rounded-[14px] border border-white/12 bg-white/[0.05] p-[7px] pb-3 shadow-[0_8px_24px_rgba(0,0,0,.4)] transition hover:border-[#c4b5fd]/45 hover:shadow-[0_0_34px_rgba(196,181,253,.22)]" style={{ "--rot": `${rot}deg`, animationDelay: `${index * 0.18}s` } as CSSProperties}>
                  <PhotoFrame photo={photo} className="aspect-[3/4] rounded-lg" />
                  <p className="mt-2 line-clamp-2 text-center text-[11px] leading-5 text-white/62">{photo.caption}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      {selected ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0a1020]/96 p-7">
          <button type="button" onClick={() => setActive(null)} className="absolute right-6 top-6 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/[0.08] text-lg text-white/70">×</button>
          <div className="mem-fadeup w-full max-w-[290px] rounded-[24px] border border-[#c4b5fd]/35 bg-white/[0.04] p-3 pb-5 shadow-[0_0_60px_rgba(196,181,253,.22),0_20px_60px_rgba(0,0,0,.55)] animate-[mem-glow-pulse_3s_ease-in-out_infinite]">
            <PhotoFrame photo={selected} className="aspect-[4/5] rounded-[16px]" />
            <p className="mt-5 text-center font-[var(--font-cormorant)] text-2xl italic leading-snug text-[#f5ead4]">{selected.caption}</p>
            <p className="mt-2 text-center text-[10px] uppercase tracking-[0.3em] text-[#c4b5fd]/55">Memora</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}

const FlipBookPage = forwardRef<HTMLDivElement, { children: ReactNode; hard?: boolean }>(function FlipBookPage(
  { children, hard = false },
  ref,
) {
  return (
    <div
      ref={ref}
      data-density={hard ? "hard" : "soft"}
      className={`relative h-full w-full overflow-hidden ${hard ? "bg-[#4b2117]" : "bg-[#fff8ed]"}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.30),transparent_34%),linear-gradient(90deg,rgba(0,0,0,0.04),transparent_18%,transparent_82%,rgba(0,0,0,0.06))]" />
      <div className="relative h-full w-full">{children}</div>
    </div>
  );
});

function AlbumPageFace({ photo, pageNumber }: { photo: AlbumPhoto; pageNumber: number }) {
  return (
    <div className="flex h-full flex-col p-3 text-[#4b3325] sm:p-7">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.26em] text-[#94633c]">Page {pageNumber}</p>
        <p className="text-[10px] uppercase tracking-[0.26em] text-[#94633c]/60">Memora</p>
      </div>
      <div className="relative min-h-0 flex-1 rounded-[22px] border border-[#d8bd8b] bg-white p-3 shadow-[0_14px_34px_rgba(80,48,26,0.14)]">
        <PhotoFrame photo={photo} className="h-full rounded-[16px]" />
      </div>
      <div className="mt-5">
        <p className="font-[var(--font-cormorant)] text-2xl italic leading-none text-[#5d3827] sm:text-3xl">{photo.title || "Memory kept"}</p>
        <p className="mt-3 line-clamp-3 text-xs leading-5 text-[#5c4538] sm:text-sm sm:leading-6">{photo.caption}</p>
        {photo.hidden_note ? (
          <p className="mt-3 rounded-2xl border border-[#d8bd8b] bg-white/60 p-3 text-xs leading-6 text-[#6b4f3c]">
            Hidden note: {photo.hidden_note}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ClassicAlbum({ photos }: { photos: AlbumPhoto[] }) {
  const [FlipBookComp, setFlipBookComp] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    import("react-pageflip")
      .then((mod) => {
        if (mounted) setFlipBookComp(() => mod.default);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  const safePhotos = photos.length ? photos : [];
  const bookPages = safePhotos.length % 2 === 0 ? safePhotos : [...safePhotos, safePhotos[0]].filter(Boolean);

  return (
    <section className="mx-auto w-full max-w-7xl">
      <div className="relative overflow-hidden rounded-[34px] border border-[#c8985b]/20 bg-[linear-gradient(180deg,#26170f,#120b08)] p-4 shadow-[0_28px_90px_rgba(0,0,0,0.42)] sm:p-6">
        <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_top_left,rgba(244,214,162,0.16),transparent_32%),repeating-linear-gradient(90deg,rgba(255,255,255,0.025)_0_1px,transparent_1px_18px)]" />
        <div className="relative mb-4 flex items-center justify-between gap-3 sm:mb-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#f4d6a2] sm:text-[11px]">Classic keepsake album</p>
            <h2 className="mt-2 text-xl font-semibold text-white sm:text-3xl">Memory book</h2>
          </div>
          <div className="rounded-full border border-[#f4d6a2]/20 bg-[#f4d6a2]/10 px-3 py-2 text-xs text-[#f8e7c8] sm:px-4 sm:text-sm">
            Tap or swipe pages
          </div>
        </div>

        <div className="relative mx-auto flex min-h-[430px] max-w-6xl items-center justify-center overflow-hidden rounded-[28px] border border-[#d8bd8b]/25 bg-[#1a0f0b] p-2 shadow-[inset_0_0_32px_rgba(80,48,26,0.18)] sm:min-h-[650px] sm:p-6">
          {FlipBookComp ? (
            <FlipBookComp
              width={280}
              height={420}
              size="stretch"
              minWidth={155}
              maxWidth={420}
              minHeight={260}
              maxHeight={620}
              showCover={false}
              mobileScrollSupport={true}
              drawShadow={true}
              flippingTime={850}
              usePortrait={false}
              className="memora-real-flipbook"
              style={{ margin: "0 auto" }}
            >
              {bookPages.map((photo, index) => (
                <FlipBookPage key={`${photo.url}-${index}`}>
                  <AlbumPageFace photo={photo} pageNumber={index + 1} />
                </FlipBookPage>
              ))}
              <FlipBookPage hard>
                <div className="flex h-full flex-col items-center justify-center p-8 text-center text-[#f7e2bd]">
                  <p className="text-[11px] uppercase tracking-[0.34em] text-[#f4d6a2]/75">Next</p>
                  <h3 className="mt-5 font-[var(--font-memora-serif)] text-5xl leading-none">Final Surprise</h3>
                  <p className="mt-5 text-sm leading-7 text-[#f8e7c8]/70">Continue to the cassette and wooden TV.</p>
                </div>
              </FlipBookPage>
            </FlipBookComp>
          ) : (
            <div className="rounded-[28px] border border-[#d8bd8b]/25 bg-[#fbf1df] p-8 text-center text-[#4b3325]">
              Loading 3D flipbook...
            </div>
          )}
        </div>

        <div className="relative mt-5 rounded-2xl border border-[#f4d6a2]/12 bg-black/20 p-4 text-center text-sm leading-7 text-[#f8e7c8]/70">
          Swipe left or right to turn pages.
        </div>
      </div>
    </section>
  );
}


function VoicePhase({ album, profile }: { album: Album; profile: Profile }) {
  const [playing, setPlaying] = useState(false);
  const [pct, setPct] = useState(0);
  const voice = resolveMediaUrl(album.voice_url || "");
  const isGenz = profile === "genz";
  const bars = useMemo(() => Array.from({ length: 34 }, (_, i) => 18 + Math.abs(Math.sin(i * 0.42 + 1) * 62)), []);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!voice) return;
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) audio.play().catch(() => undefined);
    else audio.pause();
  }, [playing, voice]);

  useEffect(() => {
    if (!playing) return;
    const iv = window.setInterval(() => setPct((p) => (p >= 100 ? 0 : p + 0.42)), 90);
    return () => window.clearInterval(iv);
  }, [playing]);

  return (
    <section className={`relative mx-auto flex min-h-[78vh] w-full items-center justify-center overflow-hidden rounded-[34px] ${isGenz ? "bg-[linear-gradient(180deg,#0d1b2a,#0a1020)]" : "bg-[radial-gradient(circle_at_50%_25%,rgba(196,154,88,.08),transparent_50%),linear-gradient(180deg,#1a0e08,#0e0908_55%,#070505)]"} p-6`}>
      <Stars count={isGenz ? 48 : 28} warm={!isGenz} />
      <div className={`relative z-10 w-full max-w-[360px] rounded-[28px] border p-7 shadow-[0_24px_60px_rgba(0,0,0,.42)] ${isGenz ? "border-[#c4b5fd]/25 bg-white/[0.05]" : "border-[#c49a58]/22 bg-[linear-gradient(180deg,rgba(245,234,212,.05),rgba(0,0,0,.18))]"}`}>
        <p className={`mb-8 text-center text-[10px] uppercase tracking-[0.45em] ${isGenz ? "text-[#c4b5fd]/65" : "text-[#c49a58]/68"}`}>A voice keepsake</p>
        <div className="mb-7 flex h-[60px] items-center gap-[3px]">
          {bars.map((h, i) => (
            <span key={i} className="flex-1 rounded-full" style={{ height: `${h}%`, background: i / bars.length < pct / 100 ? (isGenz ? "rgba(196,181,253,.95)" : "rgba(196,154,88,.95)") : isGenz ? "rgba(196,181,253,.22)" : "rgba(196,154,88,.22)", animation: playing ? `mem-waveform ${0.55 + (i % 5) * 0.14}s ease-in-out infinite ${i * 0.025}s` : "none" }} />
          ))}
        </div>
        <h3 className="mb-2 text-center font-[var(--font-memora-serif)] text-3xl font-light text-[#f5ead4]">{displaySenderName(album.sender_name)}'s voice</h3>
        <p className={`mb-7 text-center text-[11px] uppercase tracking-[0.28em] ${isGenz ? "text-[#c4b5fd]/55" : "text-[#c49a58]/55"}`}>A personal message</p>
        {voice ? <audio ref={audioRef} src={voice} onEnded={() => setPlaying(false)} className="hidden" /> : null}
        <div className="flex items-center justify-center gap-5">
          <button type="button" onClick={() => { setPct(0); setPlaying(false); }} className="border-0 bg-transparent text-lg text-[#f5ead4]/35">⏮</button>
          <button type="button" disabled={!voice} onClick={() => setPlaying((p) => !p)} className={`flex h-[58px] w-[58px] items-center justify-center rounded-full border-0 text-xl shadow-[0_8px_24px_rgba(196,154,88,.32)] ${isGenz ? "bg-[linear-gradient(135deg,rgba(196,181,253,.95),rgba(253,164,175,.85))] text-[#0d1b2a]" : "bg-[linear-gradient(180deg,rgba(232,200,120,.95),rgba(196,154,88,.88))] text-[#2a1810]"} disabled:opacity-45`}>{playing ? "Ⅱ" : "▶"}</button>
          <button type="button" onClick={() => setPct(100)} className="border-0 bg-transparent text-lg text-[#f5ead4]/35">⏭</button>
        </div>
        <div className="mt-6 h-1 overflow-hidden rounded-full bg-white/10"><div className={`h-full ${isGenz ? "bg-[#c4b5fd]" : "bg-[#c49a58]"}`} style={{ width: `${pct}%` }} /></div>
        {!voice ? <p className="mt-5 text-center text-sm leading-6 text-white/50">Voice message can be added from Admin.</p> : null}
      </div>
    </section>
  );
}

function GenzVideo({ album }: { album: Album }) {
  const [playing, setPlaying] = useState(false);
  const videoUrl = resolveMediaUrl(album.video_url);
  const youtube = isYouTube(album.video_url);
  return (
    <section className="relative mx-auto flex min-h-[78vh] w-full items-center justify-center overflow-hidden rounded-[34px] bg-[linear-gradient(180deg,#0d1b2a,#0a1020)] p-7">
      <Stars count={40} warm={false} />
      <div className="relative z-10 w-full max-w-[300px] text-center">
        <p className="mb-5 text-[10px] uppercase tracking-[0.42em] text-[#c4b5fd]/65">Final surprise</p>
        <div className="mb-6 rounded-[36px] border border-white/10 bg-[#101116] p-[9px] shadow-[0_24px_60px_rgba(0,0,0,.55)]">
          <div className="relative overflow-hidden rounded-[28px] bg-black">
            <div className="absolute left-1/2 top-3 z-20 h-5 w-[90px] -translate-x-1/2 rounded-full bg-black" />
            <div className="relative aspect-[9/18] bg-[#111827]">
              {videoUrl ? (
                youtube ? <iframe title="Final memory" src={youtubeEmbed(album.video_url)} allow="autoplay; encrypted-media; picture-in-picture" className="absolute inset-0 h-full w-full border-0" /> : <video src={videoUrl} controls playsInline className="absolute inset-0 h-full w-full object-contain" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center p-8 text-center text-white/60">Final video can be added from Admin.</div>
              )}
              {!playing && videoUrl ? <button type="button" onClick={() => setPlaying(true)} className="absolute inset-0 m-auto flex h-[60px] w-[60px] items-center justify-center rounded-full border-2 border-white/55 bg-white/20 text-xl text-white backdrop-blur">▶</button> : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function EndingPhase({ album, cover, profile, onReplay }: { album: Album; cover: AlbumPhoto; profile: Profile; onReplay: () => void }) {
  const isGenz = profile === "genz";
  const accent = isGenz ? "rgba(196,181,253,.72)" : "rgba(196,154,88,.72)";
  const accentSolid = isGenz ? "#C4B5FD" : "#C49A58";
  return (
    <section className={`relative mx-auto flex min-h-[78vh] w-full items-center justify-center overflow-hidden rounded-[34px] ${isGenz ? "bg-[linear-gradient(180deg,#0d1b2a,#060b12)]" : "bg-[linear-gradient(180deg,#0e0904,#080605)]"} px-7 py-12`}>
      <Stars count={isGenz ? 55 : 32} warm={!isGenz} />
      <div className="absolute inset-0 overflow-hidden opacity-[0.11]">
        <div className="flex animate-[mem-credits_22s_linear_infinite] flex-col gap-3">
          {[...Array(2)].flatMap(() => cleanPhotos(album).slice(0, 8)).map((photo, index) => <PhotoFrame key={`${photo.url}-${index}`} photo={photo} className="mx-auto h-[64px] w-[220px] rounded-lg" />)}
        </div>
      </div>
      <div className="relative z-10 max-w-[330px] text-center">
        <div className="mx-auto mb-7 flex h-[58px] w-[58px] items-center justify-center overflow-hidden rounded-full border bg-black/35" style={{ borderColor: accent }}>
          <Image src="/memora-logo.jpg" alt="Memora" width={52} height={52} className="h-[52px] w-[52px] object-cover" unoptimized />
        </div>
        <p className="mb-5 text-[10px] uppercase tracking-[0.48em]" style={{ color: accent }}>Memora</p>
        <h2 className="mb-4 font-[var(--font-memora-serif)] text-[42px] font-light italic leading-[1.15] text-[#f5ead4]">A memory<br />worth keeping.</h2>
        <div className="mx-auto mb-5 h-px w-14" style={{ background: `linear-gradient(90deg,transparent,${accent},transparent)` }} />
        <p className="mb-10 font-[var(--font-cormorant)] text-lg italic text-[#f5ead4]/55">{album.final_message || `${coupleHeading(album)} · ${displayArchiveDate(album)}`}</p>
        <button type="button" onClick={onReplay} className="rounded-full px-9 py-3 text-[11px] font-semibold uppercase tracking-[0.24em] shadow-[0_10px_32px_rgba(0,0,0,.32)]" style={{ background: isGenz ? "linear-gradient(135deg,rgba(196,181,253,.85),rgba(253,164,175,.75))" : "linear-gradient(180deg,#ECD09A,#C49146)", color: isGenz ? "#0d1b2a" : "#2a1810" }}>Replay ↺</button>
      </div>
    </section>
  );
}

export function MemoraQrExperience({ album, initialProfile, source }: { album: Album; initialProfile?: Profile; source?: string }) {
  const searchParams = useSearchParams();
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [soundOn, setSoundOn] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const profile: Profile = searchParams.get("profile") === "genz" ? "genz" : searchParams.get("profile") === "classic" ? "classic" : initialProfile || (album.profile_mode === "genz" ? "genz" : "classic");
  const phase = phases[phaseIndex]?.id ?? "gate";
  const photos = useMemo(() => cleanPhotos(album), [album]);
  const cover = photos[0] ?? { url: resolveMediaUrl(album.cover_image), caption: "Cover memory" };
  const background = photos[Math.min(Math.max(phaseIndex - 1, 0), photos.length - 1)] ?? cover;
  const year = useMemo(() => new Date(album.created_at || Date.now()).getFullYear().toString(), [album.created_at]);
  const openingPhase = phase === "gate" || phase === "loading" || phase === "letter";

  useEffect(() => {
    return () => {
      if (!audioRef.current) return;
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    };
  }, [album.background_music_url]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = phase === "video" ? 0.06 : 0.16;
  }, [phase]);

  useEffect(() => {
    if (phase !== "loading") return;
    const timer = window.setTimeout(() => setPhaseIndex(2), 1500);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const goTo = (index: number) => setPhaseIndex(Math.min(Math.max(index, 0), phases.length - 1));
  const next = () => goTo(phaseIndex + 1);
  const prev = () => goTo(phaseIndex - 1);
  const startBackgroundMusic = () => {
    if (!album.background_music_url || audioRef.current) return;
    const audio = new Audio(resolveMediaUrl(album.background_music_url));
    audio.loop = true;
    audio.volume = 0.16;
    audioRef.current = audio;
    audio.play().catch(() => undefined);
  };
  const begin = () => {
    setSoundOn(true);
    startBackgroundMusic();
    setPhaseIndex(1);
  };
  const onTouchStart = (event: TouchEvent<HTMLElement>) => setTouchStart(event.touches[0]?.clientX ?? null);
  const onTouchEnd = (event: TouchEvent<HTMLElement>) => {
    if (touchStart === null) return;
    const diff = (event.changedTouches[0]?.clientX ?? 0) - touchStart;
    if (Math.abs(diff) > 70) diff < 0 ? next() : prev();
    setTouchStart(null);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#090806] text-white" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <PhotoFrame photo={background} className="fixed inset-0 scale-110 opacity-[0.12] blur-2xl" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(244,214,162,0.12),transparent_30%),linear-gradient(180deg,rgba(7,6,5,0.66),rgba(7,6,5,0.98))]" />
      <style jsx global>{`
        @keyframes mem-fadein { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes mem-fadeup { from { opacity:0; transform:translateY(32px) scale(.94) rotate(-8deg); } to { opacity:1; transform:translateY(0) scale(1) rotate(-1deg); } }
        @keyframes mem-loader { from { transform:translateX(-100%); } to { transform:translateX(100%); } }
        @keyframes mem-bob { 0%,100% { transform:translateY(0) rotate(0deg); } 25% { transform:translate(-3px,-8px) rotate(-1deg); } 50% { transform:translate(2px,4px) rotate(.5deg); } 75% { transform:translate(-2px,-3px) rotate(-.3deg); } }
        @keyframes mem-breathe { 0%,100% { opacity:.5; } 50% { opacity:1; } }
        @keyframes mem-star-twinkle { 0%,100% { transform:scale(.85); opacity:.4; } 50% { transform:scale(1.3); opacity:1; } }
        @keyframes mem-shoot { 0% { transform:translate(-30vw,-8vh) rotate(18deg); opacity:0; } 15% { opacity:1; } 100% { transform:translate(105vw,38vh) rotate(18deg); opacity:0; } }
        @keyframes mem-petal { 0% { transform:translate(-40px,-100px) rotate(0deg); opacity:0; } 15% { opacity:.9; } 100% { transform:translate(110vw,105vh) rotate(900deg); opacity:0; } }
        @keyframes mem-sway { 0%,100% { transform:rotate(var(--rot)) translateX(-2px); } 50% { transform:rotate(calc(var(--rot) * -1)) translateX(2px); } }
        @keyframes mem-light { 0%,100% { opacity:.45; transform:translateY(0) scale(.88); box-shadow:0 0 8px rgba(253,230,138,.45); } 50% { opacity:1; transform:translateY(3px) scale(1.12); box-shadow:0 0 22px rgba(253,230,138,.9); } }
        @keyframes mem-waveform { 0%,100% { transform:scaleY(.72); } 50% { transform:scaleY(1.16); } }
        @keyframes mem-glow-pulse { 0%,100% { box-shadow:0 0 36px rgba(196,181,253,.18),0 20px 60px rgba(0,0,0,.55); } 50% { box-shadow:0 0 72px rgba(196,181,253,.34),0 22px 66px rgba(0,0,0,.58); } }
        @keyframes mem-credits { from { transform:translateY(0); } to { transform:translateY(-50%); } }
        .memora-star-dot { animation: mem-star-twinkle 3.4s ease-in-out infinite; }
        .memora-shooting-star { position:absolute; left:-20vw; top:20vh; z-index:2; width:180px; height:2px; background:linear-gradient(90deg,transparent,rgba(255,245,220,.96),transparent); box-shadow:0 0 18px rgba(232,200,120,.9); animation:mem-shoot 5.8s ease-in-out infinite; }
        .memora-petal-drift { width:22px; height:22px; border-radius:999px 999px 999px 4px; background:radial-gradient(circle at 40% 30%,#f4a4b8,#d44e6c 55%,#8b1a3a); filter:drop-shadow(0 4px 12px rgba(0,0,0,.4)); animation:mem-petal var(--dur, 10s) linear infinite; }
        .mem-sway { animation: mem-sway 4.8s ease-in-out infinite; }
        .mem-fairy { animation: mem-light 2.6s ease-in-out infinite; }
        .mem-seal-pulse { animation: mem-breathe 2s ease-in-out infinite; transform-origin:center; }
        .mem-fadeup { animation: mem-fadeup 1.15s cubic-bezier(.22,1,.36,1) both; }
        .memora-real-flipbook { filter: drop-shadow(0 30px 60px rgba(0,0,0,.35)); }
      `}</style>
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-0 py-0 sm:px-4 sm:py-4">
        {!openingPhase ? (
          <>
            <div className="mb-4 mt-3 flex items-center justify-center">
              <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-black/24 px-4 py-3 backdrop-blur-md"><MemoraWordmark size={11} /></div>
            </div>
            <div className="mx-4 mb-4 rounded-[22px] border border-white/10 bg-black/22 px-4 py-3 text-center text-sm leading-6 text-[#f8e7c8] backdrop-blur-md">{phaseHint(phase, profile)}</div>
          </>
        ) : null}
        <div className="flex-1">
          {phase === "gate" ? <GatePhase album={album} cover={cover} onBegin={begin} /> : null}
          {phase === "loading" ? <LoadingPhase album={album} /> : null}
          {phase === "letter" ? <LetterPhase album={album} onContinue={next} /> : null}
          {phase === "album" ? (profile === "genz" ? <GenzAlbum photos={photos} /> : <ClassicAlbum photos={photos} />) : null}
          {phase === "video" ? profile === "classic" ? <section className="relative mx-auto h-[78vh] min-h-[640px] w-full max-w-6xl overflow-hidden rounded-[34px] border border-white/10 bg-[#fcf8ef] shadow-[0_26px_90px_rgba(0,0,0,0.38)]"><CassetteTVScene videoUrl={album.video_url} recipient={displayRecipientName(album.recipient_name)} year={year} onEnded={next} /></section> : <GenzVideo album={album} /> : null}
          {phase === "ending" ? <EndingPhase album={album} cover={cover} profile={profile} onReplay={() => goTo(0)} /> : null}
        </div>
        {!openingPhase ? (
          <footer className="my-4 flex items-center justify-center">
            <div className="flex flex-wrap gap-3 rounded-full border border-white/10 bg-black/24 px-3 py-3 backdrop-blur-md">
              <button type="button" onClick={prev} disabled={phaseIndex === 0} className="rounded-full border border-white/12 px-5 py-3 text-sm text-white/78 disabled:opacity-35">Back</button>
              <button type="button" onClick={next} disabled={phaseIndex === phases.length - 1} className="rounded-full bg-[#f4d6a2] px-5 py-3 text-sm font-semibold text-[#24140d] disabled:opacity-35">Next</button>
            </div>
          </footer>
        ) : null}
      </div>
    </main>
  );
}
