"use client";

import gsap from "gsap";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMemoraStore } from "@/lib/memora-store";
import { playMechanicalClack } from "@/lib/playMechanicalClack";
import type { AlbumPhoto } from "@/lib/types";

const SEASON_CONFIG = [
  { name: "Spring", icon: "🌸", color: "#ffb7c5" },
  { name: "Spring", icon: "🌷", color: "#ffb7c5" },
  { name: "Summer", icon: "☀️", color: "#ffe066" },
  { name: "Summer", icon: "🌻", color: "#ffe066" },
  { name: "Autumn", icon: "🍂", color: "#ff8c42" },
  { name: "Winter", icon: "❄️", color: "#a8d8f0" },
];

function createPrng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function MemoraBookCSS({
  recipientName,
  photos,
  eventDate,
}: {
  recipientName: string;
  photos: AlbumPhoto[];
  eventDate: string;
}) {
  const spread = useMemoraStore((s) => s.bookSpreadIndex);
  const closing = useMemoraStore((s) => s.currentPage === 3);
  const advanceBook = useMemoraStore((s) => s.advanceBook);
  const retreatBook = useMemoraStore((s) => s.retreatBook);
  const beginBookClose = useMemoraStore((s) => s.beginBookClose);
  const setAct = useMemoraStore((s) => s.setAct);

  const [animating, setAnimating] = useState(false);
  const bookRef = useRef<HTMLDivElement>(null);

  const numLeaves = photos.length + 1;
  const leaves = Array.from({ length: numLeaves });

  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);

  const handleFlip = useCallback((dir: "next" | "prev", clientX?: number, clientY?: number) => {
    if (animating || closing) return;

    // Heart effect on click
    if (clientX && clientY) {
      const newHearts = Array.from({ length: 3 }).map((_, i) => ({
        id: Date.now() + i,
        x: clientX + (Math.random() - 0.5) * 40,
        y: clientY + (Math.random() - 0.5) * 40
      }));
      setHearts(prev => [...prev, ...newHearts]);
      setTimeout(() => setHearts(prev => prev.filter(h => !newHearts.find(nh => nh.id === h.id))), 1000);
    }

    if (dir === "next") {
      if (spread >= photos.length) {
        beginBookClose();
        setTimeout(() => setAct(3), 1200);
      } else {
        setAnimating(true);
        playMechanicalClack();
        advanceBook();
        setTimeout(() => setAnimating(false), 900);
      }
    } else {
      if (spread > 0) {
        setAnimating(true);
        playMechanicalClack();
        retreatBook();
        setTimeout(() => setAnimating(false), 900);
      }
    }
  }, [animating, closing, spread, photos.length, advanceBook, retreatBook, beginBookClose, setAct]);

  useEffect(() => {
    const el = bookRef.current;
    if (!el) return;
    gsap.fromTo(el, { scale: 0.9, opacity: 0, rotateX: 10 }, { scale: 1, opacity: 1, rotateX: 0, duration: 1.5, ease: "back.out(1.2)" });
  }, []);

  const season = SEASON_CONFIG[Math.min(spread, 5)];
  const particles = useMemo(() => {
    const rnd = createPrng(0x5a17c + spread * 9973);
    return Array.from({ length: 15 }).map((_, i) => ({
      key: `${spread}-${i}`,
      left: rnd() * 100,
      top: rnd() * 100,
      size: 10 + rnd() * 15,
      delay: rnd() * 5,
      dur: 10 + rnd() * 10,
    }));
  }, [spread]);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-[#fdf8f1] z-20 overflow-hidden transition-colors duration-1000">
      {/* Hearts Overlay */}
      {hearts.map(h => (
        <div 
          key={h.id} 
          className="fixed pointer-events-none z-[100] text-red-500 text-2xl animate-heart-float"
          style={{ left: h.x - 12, top: h.y - 12 }}
        >
          ❤️
        </div>
      ))}

      {/* Seasons Particles Overlay */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {particles.map((p) => {
          return (
            <div
              key={p.key}
              className="absolute animate-float-particle opacity-60"
              style={{
                left: `${p.left}%`,
                top: `${p.top}%`,
                fontSize: `${p.size}px`,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.dur}s`,
                color: season.color,
              }}
            >
              {season.icon}
            </div>
          );
        })}
      </div>

      {/* Season Label */}
      <div className="mb-6 text-[#d4a84b] uppercase tracking-[0.4em] text-[10px] animate-pulse">
        ✦ {SEASON_CONFIG[Math.min(spread, 5)].name} Journey ✦
      </div>

      <div 
        ref={bookRef}
        className="relative perspective-[3000px] w-[min(92vw,760px)] h-[min(64vw,480px)] transition-all duration-700"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width;
          handleFlip(x > 0.5 ? "next" : "prev", e.clientX, e.clientY);
        }}
      >
        {/* Book Shadow & Cover */}
        <div className="absolute inset-0 bg-[#d4c5b0] rounded-lg shadow-[0_40px_120px_rgba(0,0,0,0.5)] transform translate-z-[-10px]" />
        
        {/* Static Halves with richer texture */}
        <div className="absolute left-0 w-1/2 h-full bg-[#fdfaf5] rounded-l-lg shadow-[inset_-20px_0_40px_rgba(0,0,0,0.05)]" />
        <div className="absolute right-0 w-1/2 h-full bg-[#fdfaf5] rounded-r-lg shadow-[inset_20px_0_40px_rgba(0,0,0,0.05)]" />
        
        {/* Spine */}
        <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[12px] h-full bg-gradient-to-r from-[#7a5c1e] via-[#c9a84c] to-[#7a5c1e] z-50 pointer-events-none shadow-[0_0_10px_rgba(0,0,0,0.3)]" />

        {/* Leaves */}
        {leaves.map((_, i) => {
          const isFlipped = i < spread;
          const zIndex = isFlipped ? i + 1 : numLeaves - i;
          const season = SEASON_CONFIG[Math.min(i, 5)];

          return (
            <div
              key={i}
              className={`absolute top-0 left-1/2 w-1/2 h-full origin-left transition-transform duration-[1100ms] preserve-3d cursor-pointer ${isFlipped ? "rotate-y-[-180deg]" : ""}`}
              style={{ 
                zIndex,
                // Add a small delay between pages for more natural feel
                transitionDelay: `${isFlipped ? i * 20 : (numLeaves - i) * 20}ms`
              }}
            >
              {/* Front of Leaf (Photo side when opened) */}
              <div className="absolute inset-0 backface-hidden z-10 rounded-r-lg overflow-hidden border-l border-black/5 bg-[#fdfaf5]">
                {i === 0 ? (
                  <div className="w-full h-full bg-gradient-to-br from-[#2a1a10] to-[#150d08] flex flex-col items-center justify-center p-10 text-center border border-[#d4a84b]/40">
                    <div className="w-full h-full border border-[#d4a84b]/20 absolute inset-6 pointer-events-none rounded" />
                    <div className="text-5xl mb-6 drop-shadow-lg">🌸</div>
                    <h2 className="memora-serif text-[clamp(1.6rem,5vw,2.8rem)] text-[#d4a84b] mb-4 drop-shadow-md leading-tight">{recipientName}</h2>
                    <div className="w-20 h-px bg-[#d4a84b]/50 my-6" />
                    <p className="memora-serif text-sm text-[#b8a080] tracking-[0.3em] uppercase font-light">The Book of Memories</p>
                    <p className="text-[11px] text-[#d4a84b]/50 mt-8 tracking-widest font-mono italic">{eventDate}</p>
                  </div>
                ) : (
                  <div className="w-full h-full relative group">
                    <img 
                      src={photos[i-1]?.url} 
                      loading="eager"
                      decoding="async"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                      alt="" 
                      onError={(e) => (e.currentTarget.src = "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&q=80")}
                    />
                    {/* Artistic overlays */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-black/30 via-transparent to-white/10" />
                    <div className="absolute inset-0 ring-1 ring-inset ring-black/10" />
                    <div className="absolute bottom-6 right-8 text-[11px] text-white/40 memora-serif tracking-widest">{String(i).padStart(2, '0')}</div>
                  </div>
                )}
                {/* Page Shadow Effect */}
                <div className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 bg-black/10 ${isFlipped ? 'opacity-100' : 'opacity-0'}`} />
              </div>

              {/* Back of Leaf (Caption side when opened) */}
              <div className="absolute inset-0 backface-hidden rotate-y-[180deg] bg-[#fdfaf5] rounded-l-lg border-r border-black/5 flex flex-col items-center justify-center p-10 text-center shadow-[inset_-30px_0_50px_rgba(0,0,0,0.03)]">
                {i === photos.length ? (
                  <div className="space-y-6 animate-fade-in">
                    <p className="text-[#d4a84b] text-[11px] tracking-[0.4em] uppercase font-bold">Forever Yours</p>
                    <div className="w-16 h-px bg-[#d4a84b]/30 mx-auto" />
                    <p className="memora-serif text-lg italic text-[#3a251c] leading-relaxed max-w-[280px]">
                      &ldquo;A mother&apos;s love is the heart of the home.&rdquo;
                    </p>
                    <div className="pt-4">
                      <p className="memora-serif text-2xl text-[#c4867a] font-bold drop-shadow-sm">{recipientName}</p>
                      <p className="text-[10px] text-[#d4a84b]/50 mt-2 uppercase tracking-widest">Happy Mother&apos;s Day</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="text-[#d4a84b]/30 text-5xl font-serif italic">{String(i+1).padStart(2, '0')}</div>
                    <div className="w-10 h-px bg-[#d4a84b]/40 mx-auto" />
                    <div className="text-3xl filter drop-shadow-sm">{season.icon}</div>
                    <p className="memora-serif text-[clamp(1rem,2.8vw,1.3rem)] text-[#2a1a14] leading-relaxed font-medium px-6">
                      {photos[i]?.caption || "A beautiful memory of us."}
                    </p>
                    <div className="w-10 h-px bg-[#d4a84b]/40 mx-auto" />
                    <p className="text-[10px] text-[#d4a84b]/80 tracking-[0.3em] uppercase font-bold">{season.name}</p>
                  </div>
                )}
                {/* Fold Shadow */}
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/5 to-transparent pointer-events-none" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Dots */}
      <div className="mt-8 flex gap-3">
        {Array.from({ length: numLeaves + 1 }).map((_, i) => (
          <div 
            key={i} 
            className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${spread === i ? 'bg-[#d4a84b] scale-150' : 'bg-white/20'}`}
          />
        ))}
      </div>

      {/* Swipe Hint */}
      <div className="mt-6 flex items-center gap-4 text-[#b8a080]/40 text-[9px] tracking-[0.2em] uppercase pointer-events-none">
        <span>◀ Prev</span>
        <span className="animate-pulse">Tap to Flip</span>
        <span>Next ▶</span>
      </div>

      <style jsx global>{`
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
        .rotate-y-\\[-180deg\\] { transform: rotateY(-180deg); }
        .rotate-y-\\[180deg\\] { transform: rotateY(180deg); }
        
        @keyframes float-particle {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 0; }
          20% { opacity: 0.6; }
          80% { opacity: 0.6; }
          100% { transform: translate(100px, -150px) rotate(360deg); opacity: 0; }
        }
        .animate-float-particle {
          animation: float-particle linear infinite;
        }
        @keyframes heart-float {
          0% { transform: translateY(0) scale(0.5); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translateY(-100px) scale(1.5); opacity: 0; }
        }
        .animate-heart-float {
          animation: heart-float 1s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
