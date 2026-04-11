"use client";

import gsap from "gsap";
import { useCallback, useEffect, useRef } from "react";
import { useMemoraStore } from "@/lib/memora-store";
import type { AlbumPhoto } from "@/lib/types";

const SEASON_NAME: Record<number, string> = {
  0: "Spring",
  1: "Summer",
  2: "Autumn",
  3: "Winter",
};

function seasonLabel(spreadIndex: number) {
  return SEASON_NAME[spreadIndex % 4] ?? "Spring";
}

export function MemoraFlipBook({ photos }: { photos: AlbumPhoto[] }) {
  const spread = useMemoraStore((s) => s.bookSpreadIndex);
  const closing = useMemoraStore((s) => s.currentPage === 3);
  const advanceBook = useMemoraStore((s) => s.advanceBook);
  const retreatBook = useMemoraStore((s) => s.retreatBook);
  const beginBookClose = useMemoraStore((s) => s.beginBookClose);

  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    gsap.fromTo(
      el,
      { y: 18, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.85, ease: "power3.out" },
    );
  }, []);

  const onInteract = useCallback(
    (clientX: number, width: number) => {
      if (closing) return;
      const leftZone = clientX < width * 0.45;
      const rightZone = clientX > width * 0.55;

      if (rightZone) {
        playMechanicalClack();
        if (spread >= 5) beginBookClose();
        else advanceBook();
      } else if (leftZone) {
        playMechanicalClack();
        retreatBook();
      }
    },
    [advanceBook, beginBookClose, closing, retreatBook, spread],
  );

  useEffect(() => {
    if (!sheetRef.current || closing) return;
    gsap.fromTo(
      sheetRef.current,
      { x: 20, opacity: 0, rotateY: 10 },
      { x: 0, opacity: 1, rotateY: 0, duration: 0.6, ease: "power2.out" },
    );
  }, [spread, closing]);

  const spreads = photos.slice(0, 6);
  const active = spreads[Math.min(spread, spreads.length - 1)];

  if (!active) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[15] flex items-center justify-center px-4">
      <div
        ref={sheetRef}
        className="pointer-events-auto relative w-[min(92vw,440px)] max-h-[84vh]"
        onPointerUp={(e) => {
          if (closing) return;
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          onInteract(e.clientX - rect.left, rect.width);
        }}
        role="application"
        aria-label="Memory album. Tap the right side for the next page, left side for the previous page."
      >
        <div className="relative rounded-[18px] border border-black/10 bg-[#fdf8f1] shadow-[0_28px_90px_rgba(35,22,12,0.18)] overflow-hidden ring-1 ring-white/60 transition-shadow duration-500">
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-[10px] uppercase tracking-[0.28em] text-[#6b5344]/75">
            <span>{seasonLabel(spread)}</span>
            <span>
              {spread + 1} / {spreads.length}
            </span>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-0 min-h-[min(62vh,520px)]">
            <div className="border-r border-[#e7d8ca] bg-gradient-to-b from-[#fffdfb] to-[#f6ecdf] p-4 sm:p-5 flex flex-col justify-center">
              <p className="memora-serif text-[clamp(0.95rem,3.2vw,1.15rem)] leading-relaxed text-[#2c2118] whitespace-pre-wrap">
                {active.caption || " "}
              </p>
            </div>
            <div className="relative bg-[#ebe4dc] min-h-[220px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={active.url}
                alt=""
                crossOrigin="anonymous"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/15 via-transparent to-white/25 mix-blend-soft-light" />
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-3 inset-x-0 flex justify-center gap-10 text-[10px] tracking-[0.22em] uppercase text-[#6b5344]/55">
            <span>◀ prev</span>
            <span>next ▶</span>
          </div>
        </div>

        {closing ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[18px] bg-white/35 backdrop-blur-sm">
            <p className="memora-serif text-sm tracking-[0.25em] uppercase text-[#2a2218]/75">Closing…</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
