"use client";

import Image from "next/image";
import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import type { Album, AlbumPhoto } from "@/lib/types";
import { CassetteTVScene } from "@/components/cassette/CassetteTVScene";

type Profile = "genz" | "classic";
type Phase = "gate" | "loading" | "letter" | "intro" | "album" | "video" | "ending";

const phases: { id: Phase; label: string }[] = [
  { id: "gate", label: "Start" },
  { id: "loading", label: "Load" },
  { id: "letter", label: "Letter" },
  { id: "intro", label: "Intro" },
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

function cleanPhotos(album: Album) {
  const source = album.photos?.length ? album.photos : [{ url: album.cover_image, caption: "" }];
  return source
    .map((photo) => ({
      ...photo,
      url: resolveMediaUrl(photo.url),
      caption: photo.caption?.trim() || "",
    }))
    .filter((photo) => !!photo.url);
}

function displayRecipientName(name: string | undefined) {
  const normalized = (name || "").trim().toLowerCase();
  if (!normalized || normalized === "mom" || normalized === "mother" || normalized === "me") return "you";
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
        <button
          type="button"
          onClick={onBegin}
          className="rounded-full border border-[#e8c878]/30 bg-[linear-gradient(180deg,rgba(248,228,178,.98),rgba(196,154,88,.93))] px-9 py-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#2a1810] shadow-[0_14px_40px_rgba(196,154,88,.26)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(196,154,88,.38)]"
        >
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

  const letterTitle = album.letter_title || "A letter before the story";
  const letterHint = album.letter_hint || "Tap the seal to open";
  const letterText =
    album.letter_message ||
    album.opening_letter ||
    album.opening_message ||
    "I made this from the small moments that became our story. Some memories deserve more than a camera roll.";
  const closing =
    album.letter_closing ||
    (album.sender_name ? `From ${displaySenderName(album.sender_name)}` : "Forever yours,");

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
    <section className="relative mx-auto flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_0%,rgba(196,154,88,.16)_0%,transparent_44%),linear-gradient(180deg,#090806,#110d0c_45%,#060504)] px-6 py-6">
      <Stars count={48} warm />
      <ShootingStar delay="1.2s" />
      <Petals count={11} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,.55)_100%)]" />
      <div className="absolute left-0 right-0 top-6 z-10 flex flex-col items-center" style={{ opacity: ready ? 1 : 0, transition: "opacity 1.1s ease .35s" }}>
        <div className="mb-5 rounded-full border border-[#c49a58]/30 bg-black/45 px-5 py-2 backdrop-blur-xl">
          <MemoraWordmark size={12} />
        </div>
        <p className="mb-1 text-[10px] uppercase tracking-[0.48em] text-[#c49a58]/70">{letterTitle}</p>
        <h2 className="text-center font-[var(--font-memora-serif)] text-[28px] font-light leading-none text-[#f5ead4]">
          {displaySenderName(album.sender_name)} <span className="text-[22px] italic text-[#c49a58]">&amp;</span> {displayRecipientName(album.recipient_name)}
        </h2>
      </div>
      <div className="relative z-20 mt-[130px] w-full max-w-[340px]">
        {!letterVisible ? (
          <button
            type="button"
            onClick={openLetter}
            className="mx-auto block w-[88%] max-w-[290px] border-0 bg-transparent p-0"
            style={{
              cursor: opened ? "default" : "pointer",
              opacity: ready ? 1 : 0,
              transform: ready ? (opened ? "translateY(-50px) scale(.82)" : "none") : "translateY(-80px)",
              transition: "all 1.5s cubic-bezier(.22,1,.36,1)",
              animation: ready && !opened ? "mem-bob 4.8s ease-in-out infinite" : "none",
              filter: "drop-shadow(0 28px 56px rgba(0,0,0,.52)) drop-shadow(0 0 36px rgba(196,154,88,.13))",
            }}
          >
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
            </svg>
          </button>
        ) : (
          <div className="mem-fadeup relative mx-auto w-[min(90vw,480px)] rotate-[-1deg] rounded-sm bg-[linear-gradient(135deg,#f5ead4_0%,#ebdcb8_100%)] px-8 py-11 text-[#3a2418] shadow-[0_30px_80px_rgba(0,0,0,.6),inset_0_0_60px_rgba(184,130,80,.15)]">
            <div className="pointer-events-none absolute inset-2 border border-[#b88250]/25" />
            <div className="mb-3 text-center font-[var(--font-memora-serif)] text-[32px] text-[#8b1a3a]">&#10086;</div>
            <div className="mb-6 text-center font-[var(--font-cormorant)] text-[22px] italic">My dearest {displayRecipientName(album.recipient_name)},</div>
            <p className="mb-7 text-center font-[var(--font-cormorant)] text-[17px] leading-[1.85]">{letterText}</p>
            <div className="mb-2 text-center font-[var(--font-cormorant)] text-[22px] italic text-[#8b1a3a]">{closing}</div>
            <div className="mt-9 text-center">
              <button type="button" onClick={onContinue} className="rounded-sm bg-[linear-gradient(135deg,#8b1a3a_0%,#d44e6c_100%)] px-8 py-4 text-[12px] uppercase tracking-[0.4em] text-[#f5ead4] shadow-[0_6px_20px_rgba(139,26,58,.4)] transition hover:-translate-y-0.5">Open the Album</button>
            </div>
          </div>
        )}
        {ready && !opened ? (
          <p className="mt-7 text-center font-[var(--font-cormorant)] text-sm italic uppercase tracking-[0.35em] text-[#d4a84b] animate-[mem-breathe_2.5s_ease-in-out_infinite]">{letterHint}</p>
        ) : null}
      </div>
    </section>
  );
}

function AlbumIntroPhase({ album, onContinue }: { album: Album; onContinue: () => void }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 200);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <section className="relative mx-auto flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#0d0906,#090806_60%,#060504)] px-8 text-center">
      <Stars count={32} warm />
      <div
        className="relative z-10 flex max-w-[300px] flex-col items-center"
        style={{ opacity: ready ? 1 : 0, transform: ready ? "none" : "translateY(16px)", transition: "all 1.2s cubic-bezier(.22,1,.36,1)" }}
      >
        <div className="mb-8 h-px w-12 bg-[linear-gradient(90deg,transparent,rgba(196,154,88,.8),transparent)]" />
        <p className="mb-3 text-[10px] uppercase tracking-[0.42em] text-[#c49a58]/55">
          For {displayRecipientName(album.recipient_name)}
        </p>
        <p className="mb-10 font-[var(--font-cormorant)] text-[24px] italic leading-[1.65] text-[#f5ead4]/85">
          "Some moments deserve more<br />than a camera roll."
        </p>
        <div className="mb-10 h-px w-12 bg-[linear-gradient(90deg,transparent,rgba(196,154,88,.8),transparent)]" />
        <button
          type="button"
          onClick={onContinue}
          className="rounded-full border border-[#e8c878]/30 bg-[linear-gradient(180deg,rgba(248,228,178,.98),rgba(196,154,88,.93))] px-10 py-4 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#2a1810] shadow-[0_14px_40px_rgba(196,154,88,.24)] transition hover:-translate-y-0.5"
        >
          Open memory book
        </button>
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
        <p className="mb-5 text-center text-[10px] uppercase tracking-[0.42em] text-[#c4b5fd]/65">Our memories</p>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {visible.map((photo, index) => {
            const rot = (index % 2 === 0 ? -1 : 1) * (2.5 + (index % 3) * 1.2);
            return (
              <button key={`${photo.url}-${index}`} type="button" onClick={() => setActive(index)} className="relative border-0 bg-transparent p-0 text-left" style={{ cursor: "pointer" }}>
                <div className="mem-sway rounded-[14px] border border-white/12 bg-white/[0.05] p-[7px] pb-3 shadow-[0_8px_24px_rgba(0,0,0,.4)]" style={{ "--rot": `${rot}deg`, animationDelay: `${index * 0.18}s` } as CSSProperties}>
                  <PhotoFrame photo={photo} className="aspect-[3/4] rounded-lg" />
                  {photo.caption ? <p className="mt-2 line-clamp-2 text-center text-[11px] leading-5 text-white/62">{photo.caption}</p> : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      {selected ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0a1020]/96 p-7">
          <button type="button" onClick={() => setActive(null)} className="absolute right-6 top-6 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/[0.08] text-lg text-white/70">x</button>
          <div className="mem-fadeup w-full max-w-[290px] rounded-[24px] border border-[#c4b5fd]/35 bg-white/[0.04] p-3 pb-5 shadow-[0_0_60px_rgba(196,181,253,.22),0_20px_60px_rgba(0,0,0,.55)]">
            <PhotoFrame photo={selected} className="aspect-[4/5] rounded-[16px]" />
            {selected.caption ? <p className="mt-5 text-center font-[var(--font-cormorant)] text-2xl italic leading-snug text-[#f5ead4]">{selected.caption}</p> : null}
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
      className={`relative h-full w-full overflow-hidden ${hard ? "bg-[#3d1a0f]" : "bg-[#fdf6e8]"}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_34%),linear-gradient(90deg,rgba(0,0,0,0.03),transparent_16%,transparent_84%,rgba(0,0,0,0.05))]" />
      <div className="relative h-full w-full">{children}</div>
    </div>
  );
});

function AlbumPageFace({ photo, pageNumber }: { photo: AlbumPhoto; pageNumber: number }) {
  const hasTitle = photo.title && photo.title.trim();
  const hasCaption = photo.caption && photo.caption.trim();

  return (
    <div className="flex h-full flex-col p-2.5 text-[#4b3325]">
      <div className="mb-2 flex items-center justify-between px-0.5">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#94633c]/50">{pageNumber}</p>
        <p className="text-[9px] uppercase tracking-[0.24em] text-[#94633c]/35">Memora</p>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-[12px] border border-[#d8bd8b]/50 shadow-[0_4px_18px_rgba(80,48,26,0.10)]">
        <PhotoFrame photo={photo} className="h-full" />
      </div>
      {(hasTitle || hasCaption) ? (
        <div className="mt-2.5 px-0.5">
          {hasTitle ? (
            <p className="font-[var(--font-cormorant)] text-[14px] italic leading-snug text-[#5d3827]">{photo.title}</p>
          ) : null}
          {hasCaption ? (
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-[1.5] text-[#5c4538]/75">{photo.caption}</p>
          ) : null}
          {photo.hidden_note ? (
            <p className="mt-2 rounded-lg border border-[#d8bd8b]/50 bg-white/50 px-2 py-1.5 text-[10px] leading-5 text-[#6b4f3c]/80">
              {photo.hidden_note}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ClassicAlbum({ photos, onNext }: { photos: AlbumPhoto[]; onNext: () => void }) {
  const [FlipBookComp, setFlipBookComp] = useState<React.ComponentType<Record<string, unknown>> | null>(null);

  useEffect(() => {
    let mounted = true;
    import("react-pageflip")
      .then((mod) => {
        if (mounted) setFlipBookComp(() => mod.default as React.ComponentType<Record<string, unknown>>);
      })
      .catch(() => undefined);
    return () => { mounted = false; };
  }, []);

  const safePhotos = photos.length ? photos : [];

  return (
    <section className="relative mx-auto flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#1a0d07,#0e0806_55%,#070504)] px-0 py-8">
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:repeating-linear-gradient(90deg,rgba(255,255,255,1)_0_1px,transparent_1px_18px),repeating-linear-gradient(0deg,rgba(255,255,255,1)_0_1px,transparent_1px_18px)]" />
      <p className="relative z-10 mb-5 text-[10px] uppercase tracking-[0.45em] text-[#c49a58]/45">Swipe pages</p>
      <div
        className="relative z-10 w-[min(96vw,860px)] shadow-[0_32px_90px_rgba(0,0,0,.7),0_0_0_1px_rgba(196,154,88,.10),inset_0_1px_0_rgba(255,240,200,.06)]"
        style={{ borderRadius: 4 }}
      >
        {FlipBookComp ? (
          <FlipBookComp
            width={360}
            height={500}
            size="stretch"
            minWidth={150}
            maxWidth={450}
            minHeight={220}
            maxHeight={620}
            showCover={false}
            mobileScrollSupport={false}
            drawShadow={true}
            flippingTime={820}
            usePortrait={true}
            className="memora-real-flipbook"
            style={{ margin: "0 auto" }}
          >
            {safePhotos.map((photo, index) => (
              <FlipBookPage key={`${photo.url}-${index}`}>
                <AlbumPageFace photo={photo} pageNumber={index + 1} />
              </FlipBookPage>
            ))}
            <FlipBookPage hard>
              <div className="flex h-full flex-col items-center justify-center px-8 py-10 text-center text-[#f7e2bd]">
                <div className="mb-6 h-px w-10 bg-[linear-gradient(90deg,transparent,rgba(244,214,162,.6),transparent)]" />
                <p className="mb-6 font-[var(--font-cormorant)] text-[13px] italic leading-[1.7] text-[#f8e7c8]/70">The memories continue...</p>
                <button
                  type="button"
                  onClick={onNext}
                  className="rounded-full border border-[#c49a58]/40 bg-[linear-gradient(180deg,rgba(232,200,120,.96),rgba(196,154,88,.90))] px-7 py-3 text-[10px] uppercase tracking-[0.3em] text-[#2a1810] shadow-[0_8px_28px_rgba(196,154,88,.22)]"
                >
                  Watch final memory
                </button>
              </div>
            </FlipBookPage>
          </FlipBookComp>
        ) : (
          <div className="flex items-center justify-center rounded-sm border border-[#d8bd8b]/20 bg-[#fdf6e8] text-center text-[#4b3325]" style={{ minHeight: "60vh" }}>
            <p className="text-sm">Loading album...</p>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onNext}
        className="relative z-10 mt-6 text-[10px] uppercase tracking-[0.38em] text-[#c49a58]/35 transition hover:text-[#c49a58]/70"
      >
        Skip to final memory
      </button>
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
            <div className="relative aspect-[9/18] bg-[#111827]">
              {videoUrl ? (
                youtube ? <iframe title="Final memory" src={youtubeEmbed(album.video_url)} allow="autoplay; encrypted-media; picture-in-picture" className="absolute inset-0 h-full w-full border-0" /> : <video src={videoUrl} controls playsInline className="absolute inset-0 h-full w-full object-contain" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center p-8 text-center text-white/60">Final video can be added from Admin.</div>
              )}
              {!playing && videoUrl ? <button type="button" onClick={() => setPlaying(true)} className="absolute inset-0 m-auto flex h-[60px] w-[60px] items-center justify-center rounded-full border-2 border-white/55 bg-white/20 text-xl text-white backdrop-blur">Play</button> : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function EndingPhase({ album, photos, profile, onReplay }: { album: Album; photos: AlbumPhoto[]; cover: AlbumPhoto; profile: Profile; onReplay: () => void }) {
  const isGenz = profile === "genz";
  const accent = isGenz ? "rgba(196,181,253,.72)" : "rgba(196,154,88,.72)";
  const creditPhotos = photos.slice(0, 8);

  return (
    <section className={`relative mx-auto flex min-h-[100dvh] w-full items-center justify-center overflow-hidden ${isGenz ? "bg-[linear-gradient(180deg,#0d1b2a,#060b12)]" : "bg-[linear-gradient(180deg,#0e0904,#080605)]"} px-7 py-12`}>
      <Stars count={isGenz ? 55 : 40} warm={!isGenz} />
      {creditPhotos.length > 0 && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="flex animate-[mem-credits_26s_linear_infinite] flex-col items-center gap-4 pt-8">
            {[...creditPhotos, ...creditPhotos].map((photo, index) => (
              <div
                key={`credit-${index}`}
                className="relative overflow-hidden rounded-[10px]"
                style={{
                  width: 160,
                  height: 110,
                  opacity: 0.13 + (index % 3) * 0.04,
                  transform: `rotate(${(index % 2 === 0 ? -1 : 1) * (1 + (index % 3))}deg) translateX(${(index % 5 - 2) * 18}px)`,
                }}
              >
                <Image src={photo.url} alt="" fill className="object-cover" unoptimized />
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="relative z-10 max-w-[320px] text-center">
        <div className="mx-auto mb-7 flex h-[54px] w-[54px] items-center justify-center overflow-hidden rounded-full border bg-black/35" style={{ borderColor: accent }}>
          <Image src="/memora-logo.jpg" alt="Memora" width={48} height={48} className="h-12 w-12 object-cover" unoptimized />
        </div>
        <p className="mb-2 text-[9px] uppercase tracking-[0.55em]" style={{ color: accent }}>A memory worth keeping</p>
        <h2 className="mb-3 font-[var(--font-memora-serif)] text-[38px] font-light italic leading-[1.18] text-[#f5ead4]">
          Made for<br />{displayRecipientName(album.recipient_name)}
        </h2>
        <div className="mx-auto mb-4 h-px w-12" style={{ background: `linear-gradient(90deg,transparent,${accent},transparent)` }} />
        <p className="mb-2 font-[var(--font-cormorant)] text-[16px] italic text-[#f5ead4]/60">
          From {displaySenderName(album.sender_name)}
        </p>
        <p className="mb-10 text-[10px] uppercase tracking-[0.55em]" style={{ color: accent }}>MEMORA</p>
        <button
          type="button"
          onClick={onReplay}
          className="rounded-full px-9 py-3 text-[11px] font-semibold uppercase tracking-[0.24em] shadow-[0_10px_32px_rgba(0,0,0,.32)]"
          style={{
            background: isGenz ? "linear-gradient(135deg,rgba(196,181,253,.85),rgba(253,164,175,.75))" : "linear-gradient(180deg,#ECD09A,#C49146)",
            color: isGenz ? "#0d1b2a" : "#2a1810",
          }}
        >
          Replay
        </button>
      </div>
    </section>
  );
}

export function MemoraQrExperience({ album, initialProfile }: { album: Album; initialProfile?: Profile; source?: string }) {
  const searchParams = useSearchParams();
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [soundOn, setSoundOn] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const profile: Profile = searchParams.get("profile") === "genz" ? "genz" : searchParams.get("profile") === "classic" ? "classic" : initialProfile || (album.profile_mode === "genz" ? "genz" : "classic");
  const phase = phases[phaseIndex]?.id ?? "gate";
  const photos = useMemo(() => cleanPhotos(album), [album]);
  const cover = photos[0] ?? { url: resolveMediaUrl(album.cover_image), caption: "" };
  const background = photos[Math.min(Math.max(phaseIndex - 1, 0), photos.length - 1)] ?? cover;
  const year = useMemo(() => new Date(album.created_at || Date.now()).getFullYear().toString(), [album.created_at]);
  const openingPhase = phase === "gate" || phase === "loading" || phase === "letter" || phase === "intro";

  useEffect(() => {
    return () => {
      if (!audioRef.current) return;
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    };
  }, [album.background_music_url]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = phase === "video" ? 0.06 : 0.22;
    }
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
    audio.volume = 0.22;
    audioRef.current = audio;
    audio.play().catch(() => undefined);
  };

  const begin = () => {
    if (!soundOn) {
      setSoundOn(true);
      startBackgroundMusic();
    }
    setPhaseIndex(1);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#090806] text-white">
      <PhotoFrame photo={background} className="fixed inset-0 scale-110 opacity-[0.10] blur-2xl" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(244,214,162,0.10),transparent_30%),linear-gradient(180deg,rgba(7,6,5,0.66),rgba(7,6,5,0.98))]" />
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
        @keyframes mem-glow-pulse { 0%,100% { box-shadow:0 0 36px rgba(196,181,253,.18),0 20px 60px rgba(0,0,0,.55); } 50% { box-shadow:0 0 72px rgba(196,181,253,.34),0 22px 66px rgba(0,0,0,.58); } }
        @keyframes mem-credits { from { transform:translateY(0); } to { transform:translateY(-50%); } }
        .memora-star-dot { animation: mem-star-twinkle 3.4s ease-in-out infinite; }
        .memora-shooting-star { position:absolute; left:-20vw; top:20vh; z-index:2; width:180px; height:2px; background:linear-gradient(90deg,transparent,rgba(255,245,220,.96),transparent); box-shadow:0 0 18px rgba(232,200,120,.9); animation:mem-shoot 5.8s ease-in-out infinite; }
        .memora-petal-drift { width:22px; height:22px; border-radius:999px 999px 999px 4px; background:radial-gradient(circle at 40% 30%,#f4a4b8,#d44e6c 55%,#8b1a3a); filter:drop-shadow(0 4px 12px rgba(0,0,0,.4)); animation:mem-petal var(--dur, 10s) linear infinite; }
        .mem-sway { animation: mem-sway 4.8s ease-in-out infinite; }
        .mem-fairy { animation: mem-light 2.6s ease-in-out infinite; }
        .mem-seal-pulse { animation: mem-breathe 2s ease-in-out infinite; transform-origin:center; }
        .mem-fadeup { animation: mem-fadeup 1.15s cubic-bezier(.22,1,.36,1) both; }
        .memora-real-flipbook { filter: drop-shadow(0 24px 52px rgba(0,0,0,.42)); }
      `}</style>
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-0 py-0 sm:px-4 sm:py-4">
        {!openingPhase ? (
          <div className="mb-4 mt-3 flex items-center justify-center">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-black/24 px-4 py-3 backdrop-blur-md">
              <MemoraWordmark size={11} />
            </div>
          </div>
        ) : null}
        <div className="flex-1">
          {phase === "gate" ? <GatePhase album={album} cover={cover} onBegin={begin} /> : null}
          {phase === "loading" ? <LoadingPhase album={album} /> : null}
          {phase === "letter" ? <LetterPhase album={album} onContinue={next} /> : null}
          {phase === "intro" ? <AlbumIntroPhase album={album} onContinue={next} /> : null}
          {phase === "album" ? (profile === "genz" ? <GenzAlbum photos={photos} /> : <ClassicAlbum photos={photos} onNext={next} />) : null}
          {phase === "video" ? (
            profile === "classic" ? (
              <section className="relative mx-auto h-[78vh] min-h-[640px] w-full max-w-6xl overflow-hidden rounded-[34px] border border-white/10 bg-[#fcf8ef] shadow-[0_26px_90px_rgba(0,0,0,0.38)]">
                <CassetteTVScene videoUrl={album.video_url} recipient={displayRecipientName(album.recipient_name)} year={year} onEnded={next} />
              </section>
            ) : (
              <GenzVideo album={album} />
            )
          ) : null}
          {phase === "ending" ? <EndingPhase album={album} photos={photos} cover={cover} profile={profile} onReplay={() => goTo(0)} /> : null}
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
