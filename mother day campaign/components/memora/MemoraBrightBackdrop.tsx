"use client";

import { useMemoraStore } from "@/lib/memora-store";

const SEASON_TINT: Record<number, string> = {
  0: "rgba(255, 192, 210, 0.22)",
  1: "rgba(255, 214, 140, 0.28)",
  2: "rgba(255, 170, 96, 0.24)",
  3: "rgba(186, 210, 255, 0.32)",
};

export function MemoraBrightBackdrop() {
  const act = useMemoraStore((s) => s.currentAct);
  const page = useMemoraStore((s) => s.currentPage);
  const warm = useMemoraStore((s) => s.studioWarm);
  const spread = useMemoraStore((s) => s.bookSpreadIndex);

  const phase = act === 2 && page !== 3 ? spread % 4 : page === 3 ? 3 : 0;
  const tint = SEASON_TINT[phase] ?? SEASON_TINT[0];

  const cosmic = act === 1 && !warm;

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      {cosmic ? (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-10%,#1a2238_0%,#06070f_55%,#020308_100%)]" />
      ) : (
        <div
          className="absolute inset-0 transition-[background] duration-[1.2s] ease-out"
          style={{
            background: `linear-gradient(165deg, #fff9f0 0%, #ffe8dc 24%, #fff4e6 55%, #fdebd4 100%)`,
          }}
        />
      )}

      {!cosmic ? (
        <>
          <div
            className="absolute -inset-[35%] opacity-70 motion-safe:animate-[memora-drift_28s_linear_infinite]"
            style={{
              background: `radial-gradient(circle at 30% 20%, ${tint}, transparent 42%), radial-gradient(circle at 78% 70%, rgba(255,255,255,0.35), transparent 45%)`,
            }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.55),transparent_38%)] mix-blend-soft-light opacity-90" />
          <div className="absolute inset-x-0 top-0 h-[42%] bg-gradient-to-b from-white/45 to-transparent" />
        </>
      ) : null}

      <div
        className="absolute inset-0 opacity-[0.07] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
