'use client';
import { useEffect, useRef, useState, useCallback, useMemo, forwardRef } from 'react';
import type { Album } from '@/lib/types';
import { CassetteTVScene } from '@/components/cassette/CassetteTVScene';

/*
  ═══════════════════════════════════════════════════════════════
  MEMORA — MothersDayJourney  [v12 FINAL — ROOT CAUSE FIX]
  ═══════════════════════════════════════════════════════════════
  Real root cause:
  react-pageflip with showCover=false + even-padding creates
  a phantom "cover slot" that paints white/default BEFORE the
  first real spread renders. That's the "màng trắng" glitch.

  Fix: showCover=true + insert a hidden ghost first page that
  matches the book cover color. The library's internal cover
  handling renders properly → no flash.
  
  Plus: white premium pages, #724933 TV, sans-serif outside.
  ═══════════════════════════════════════════════════════════════
*/

const C = {
  bg:       '#FFFFFF',
  page:     '#FFFFFF',
  text:     '#724933',
  textSoft: 'rgba(114,73,51,.65)',
  textFade: 'rgba(114,73,51,.4)',
  cover:    '#5c1f17',
  gold:     '#D4B483',
  tv:       '#724933',
} as const;

const F = {
  sans: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  hand: "'Caveat', cursive",
} as const;

function resolveUrl(url: string): string {
  if (!url) return '';
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return m ? `https://drive.google.com/uc?export=view&id=${m[1]}` : url;
}
function isYT(u: string) { return /youtu\.?be/.test(u); }
function ytId(u: string) { return u.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1] || ''; }

function getCaptionText(photo: any): string {
  return photo?.caption || photo?.description || photo?.text || photo?.message || photo?.content || '';
}
function getCaptionTitle(photo: any): string {
  return photo?.title || photo?.name || photo?.heading || '';
}

let _ctx: AudioContext | null = null;
let _ok = false;
async function initAudio() {
  if (_ok) return;
  try { if (!_ctx) _ctx = new AudioContext(); if (_ctx.state === 'suspended') await _ctx.resume(); _ok = true; } catch {}
}
function playFlip() {
  if (!_ok || !_ctx) return;
  try {
    const n = _ctx.currentTime, o = _ctx.createOscillator(), g = _ctx.createGain();
    o.connect(g); g.connect(_ctx.destination); o.type = 'sine'; o.frequency.value = 1100;
    g.gain.setValueAtTime(0.04, n); g.gain.exponentialRampToValueAtTime(0.0001, n + 0.1);
    o.start(); o.stop(n + 0.1);
  } catch {}
}

const FrameCorner = ({ rotate = 0 }: { rotate?: number }) => (
  <svg width="32" height="32" viewBox="0 0 60 60" style={{ transform: `rotate(${rotate}deg)`, position: 'absolute', pointerEvents: 'none' }}>
    <path d="M2 30 Q2 2 30 2 M8 30 Q8 8 30 8 M2 12 Q5 5 12 2 M8 16 Q11 11 16 8" stroke="#b89a6e" strokeWidth=".9" fill="none" opacity=".55"/>
    <circle cx="6" cy="6" r="1.5" fill="#b89a6e" opacity=".45"/>
  </svg>
);

const BookPage = forwardRef<HTMLDivElement, { children: React.ReactNode; isHard?: boolean; isLeft?: boolean }>(
  ({ children, isHard, isLeft }, ref) => (
    <div
      ref={ref}
      className="mj-page"
      data-density={isHard ? 'hard' : 'soft'}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: isHard ? C.cover : C.page,
        backgroundImage: isHard
          ? `linear-gradient(135deg, ${C.cover} 0%, #3d130d 50%, ${C.cover} 100%)`
          : 'none',
      }}
    >
      {!isHard && (
        <div style={{
          position: 'absolute', top: 0, bottom: 0,
          [isLeft ? 'right' : 'left']: 0,
          width: '12px',
          background: isLeft
            ? 'linear-gradient(to right, transparent, rgba(15,23,42,.05))'
            : 'linear-gradient(to left, transparent, rgba(15,23,42,.05))',
          pointerEvents: 'none',
        }} />
      )}
      {children}
    </div>
  )
);
BookPage.displayName = 'BookPage';

/* ══════════════════════════════════════════════════════════ */
export function MothersDayJourney({ album }: { album: Album }) {
  const photos = album.photos || [];
  const videoUrl = album.video_url || '';
  const recipient = album.recipient_name || 'Mom';
  const year = new Date(album.created_at).getFullYear().toString();

  const imageUrls = useMemo(() => photos.map(p => resolveUrl(p.url || '')), [photos]);

  type Phase = 'loading' | 'intro' | 'book' | 'bookEnd' | 'cassette' | 'tv' | 'ending';
  const [phase, setPhase] = useState<Phase>('loading');
  const [introStep, setIntroStep] = useState(0);

  const [loaded, setLoaded] = useState(false);
  const [loadPct, setLoadPct] = useState(0);

  const [FlipBookComp, setFlipBookComp] = useState<any>(null);
  const [bookState, setBookState] = useState<'closed' | 'opening' | 'open'>('closed');
  const [currentPage, setCurrentPage] = useState(0);
  const [dims, setDims] = useState({ w: 320, h: 440 });
  const [isMobile, setIsMobile] = useState(false);

  const [showTV, setShowTV] = useState(false);
  const [tvStatic, setTvStatic] = useState(true);
  const [tvLed, setTvLed] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const [cassetteEject, setCassetteEject] = useState(false);

  const [tooltip, setTooltip] = useState<string | null>(null);

  const flipRef = useRef<any>(null);
  const vRef = useRef<HTMLVideoElement>(null);
  const iRef = useRef<HTMLIFrameElement>(null);
  const autoTimerRef = useRef<any>(null);
  const openLockRef = useRef(false);
  const introTapLockRef = useRef(false);

  /* photos + back, pad to even */
  const totalPages = useMemo(() => {
    let count = photos.length + 2; // ghost cover + photos + back cover
    if (count % 2 !== 0) count++;
    return count;
  }, [photos.length]);

  useEffect(() => {
    import('react-pageflip').then(mod => setFlipBookComp(() => mod.default)).catch(() => {});
  }, []);

  useEffect(() => {
    const update = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const mobile = vw < 768;
      const landscape = vw > vh;
      setIsMobile(mobile);

      let pw: number, ph: number;
      if (mobile) {
        if (landscape) {
          const maxBookW = vw * 0.7;
          const maxBookH = vh * 0.72;
          pw = maxBookW / 2;
          ph = pw * 1.32;
          if (ph > maxBookH) { ph = maxBookH; pw = ph / 1.32; }
        } else {
          const maxBookW = vw * 0.92;
          const maxBookH = vh * 0.6;
          pw = maxBookW / 2;
          ph = pw * 1.4;
          if (ph > maxBookH) { ph = maxBookH; pw = ph / 1.4; }
        }
      } else {
        const maxBookW = Math.min(vw * 0.72, 920);
        const maxBookH = vh * 0.78;
        pw = maxBookW / 2;
        ph = pw * 1.34;
        if (ph > maxBookH) { ph = maxBookH; pw = ph / 1.34; }
      }
      setDims({ w: Math.round(pw), h: Math.round(ph) });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  useEffect(() => {
    const urls = imageUrls.filter(Boolean);
    if (!urls.length) { setLoadPct(100); setLoaded(true); return; }
    const critical = urls.slice(0, 3);
    const rest = urls.slice(3);
    let done = 0;
    Promise.all(critical.map(u => new Promise<void>(r => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = img.onerror = () => { done++; setLoadPct(Math.round((done / critical.length) * 100)); r(); };
      img.src = u;
    }))).then(() => {
      setTimeout(() => setLoaded(true), 300);
      const idle = (cb: () => void) =>
        typeof window !== 'undefined' && (window as any).requestIdleCallback
          ? (window as any).requestIdleCallback(cb)
          : setTimeout(cb, 500);
      idle(() => rest.forEach(u => { const img = new Image(); img.decoding = 'async'; img.src = u; }));
    });
  }, [imageUrls]);

  useEffect(() => {
    const h = () => { initAudio(); document.removeEventListener('click', h); document.removeEventListener('touchstart', h); };
    document.addEventListener('click', h); document.addEventListener('touchstart', h);
    return () => { document.removeEventListener('click', h); document.removeEventListener('touchstart', h); };
  }, []);

  useEffect(() => {
    const mu = (album as any).background_music_url;
    if (!mu) return;
    const a = new Audio(mu); a.loop = true; a.volume = 0.2;
    const p = () => { a.play().catch(() => {}); document.removeEventListener('click', p); document.removeEventListener('touchstart', p); };
    document.addEventListener('click', p); document.addEventListener('touchstart', p);
    return () => { a.pause(); a.src = ''; document.removeEventListener('click', p); document.removeEventListener('touchstart', p); };
  }, [album]);

  useEffect(() => {
    if (loaded && phase === 'loading') {
      setTimeout(() => setPhase('intro'), 500);
    }
  }, [loaded, phase]);

  useEffect(() => {
    if (phase !== 'intro') return;
    const t1 = setTimeout(() => setIntroStep(1), 600);
    const t2 = setTimeout(() => setIntroStep(2), 3200);
    const t3 = setTimeout(() => setIntroStep(3), 7000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [phase]);

  const handleIntroTap = useCallback(() => {
    if (phase !== 'intro' || introStep < 3) return;
    if (introTapLockRef.current) return;
    introTapLockRef.current = true;
    setPhase('book');
  }, [phase, introStep]);

  useEffect(() => {
    let msg: string | null = null;
    const delay = 500;
    if (phase === 'book' && bookState === 'closed') msg = '✨ Tap the book to open';
    else if (phase === 'book' && bookState === 'open') msg = '👆 Swipe or use arrows to turn pages';
    else if (phase === 'cassette') msg = '🎬 Tap the cassette to watch';
    else if (phase === 'tv') msg = '📺 Enjoy the video';

    if (msg) {
      const showT = setTimeout(() => setTooltip(msg), delay);
      const hideT = setTimeout(() => setTooltip(null), delay + 3500);
      return () => { clearTimeout(showT); clearTimeout(hideT); };
    } else {
      setTooltip(null);
    }
  }, [phase, bookState]);

  /* ═══ Open book animation ═══
     After cover rotation, we directly jump to first photo spread
     by calling flipNext on a ref timer */
 const openBook = useCallback(() => {
  if (bookState !== 'closed') return;
  if (openLockRef.current) return;

  openLockRef.current = true;
  initAudio();
  playFlip();
  setBookState('opening');

  setTimeout(() => {
    setBookState('open');
    setCurrentPage(1);
  }, 720);
}, [bookState]);

  const onFlip = useCallback((e: any) => {
    playFlip();
    const page = e.data;
    setCurrentPage(page);
    if (page >= totalPages - 1 && phase === 'book') {
      setPhase('bookEnd');
    }
  }, [totalPages, phase]);

  const flipPrev = () => { try { flipRef.current?.pageFlip()?.flipPrev(); } catch {} };
  const flipNext = () => { try { flipRef.current?.pageFlip()?.flipNext(); } catch {} };

  useEffect(() => {
    if (phase === 'bookEnd') {
      autoTimerRef.current = setTimeout(() => goToCassette(), 8000);
      return () => clearTimeout(autoTimerRef.current);
    }
  }, [phase]);

  const goToCassette = () => {
    clearTimeout(autoTimerRef.current);
    if (videoUrl) setPhase('cassette');
    else setPhase('ending');
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (phase === 'intro' && introStep >= 3 && (e.key === 'Enter' || e.key === ' ')) { handleIntroTap(); return; }
      if (phase === 'book' && bookState === 'closed' && (e.key === 'Enter' || e.key === ' ')) { openBook(); return; }
      if (phase === 'book' && bookState === 'open') {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') flipNext();
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') flipPrev();
      }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [phase, bookState, introStep, openBook, handleIntroTap]);

  const openTV = () => {
    setCassetteEject(true);
    setTimeout(() => {
      setPhase('tv');
      setShowTV(true); setTvStatic(true); setTvLed(false); setVideoEnded(false);
      setTimeout(() => {
        setTvStatic(false); setTvLed(true);
        if (videoUrl) {
          if (isYT(videoUrl)) {
            const f = iRef.current;
            if (f) { f.src = `https://www.youtube-nocookie.com/embed/${ytId(videoUrl)}?autoplay=1&controls=1&rel=0`; f.style.display = 'block'; }
          } else {
            const v = vRef.current;
            if (v) { v.src = resolveUrl(videoUrl); v.muted = false; v.play().catch(() => { v.muted = true; v.play(); }); }
          }
        }
      }, 700);
    }, 500);
  };

  const onVideoEnded = () => {
    setVideoEnded(true);
    autoTimerRef.current = setTimeout(() => closeToEnding(), 5000);
  };

  const closeToEnding = () => {
    clearTimeout(autoTimerRef.current);
    setShowTV(false); setTvStatic(true); setTvLed(false);
    if (vRef.current) { vRef.current.pause(); vRef.current.src = ''; }
    if (iRef.current) { iRef.current.src = ''; iRef.current.style.display = 'none'; }
    setPhase('ending');
  };

  const pageLabel = currentPage >= totalPages
    ? 'End'
    : currentPage === 0
      ? 'Cover'
      : `${currentPage} / ${photos.length}`;

  /* ═══ PAGES with GHOST COVER trick ═══
     Page 0 = ghost cover matching book color (never seen, we skip past it)
     Page 1..N = photos
     Page N+1 = back cover (hard) */
  const renderPages = useMemo(() => {
    const pages: React.ReactNode[] = [];

    /* [0] Ghost first page - matches cover color so no flash */
    pages.push(
      <BookPage key="ghost" isHard>
        <div style={{ width: '100%', height: '100%', background: C.cover }} />
      </BookPage>
    );

    /* [1..N] Real photo pages */
    photos.forEach((photo, i) => {
      const title = getCaptionTitle(photo);
      const caption = getCaptionText(photo);
      const isLeftPage = i % 2 === 1;
      const tiltAngle = i % 3 === 0 ? 0 : (i % 2 === 0 ? -1.2 : 1.4);

      pages.push(
        <BookPage key={`photo-${i}`} isLeft={isLeftPage}>
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: 'clamp(16px,3.5vw,32px) clamp(14px,3vw,28px)',
            position: 'relative',
          }}>
            <div style={{
              position: 'relative',
              width: '82%',
              maxWidth: '320px',
              aspectRatio: '4/5',
              transform: `rotate(${tiltAngle}deg)`,
              marginBottom: 'clamp(14px,2.5vw,22px)',
              filter: 'drop-shadow(0 8px 18px rgba(15,23,42,.08)) drop-shadow(0 3px 6px rgba(15,23,42,.05))',
            }}>
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #ffffff 100%)',
                borderRadius: '3px',
                padding: 'clamp(8px,1.8vw,14px)',
                boxShadow: `inset 0 0 0 1px rgba(15,23,42,.08), inset 0 0 0 3px #ffffff, inset 0 0 0 4px rgba(15,23,42,.05)`,
              }}>
                <div style={{ position: 'absolute', top: '2px', left: '2px' }}><FrameCorner rotate={0} /></div>
                <div style={{ position: 'absolute', top: '2px', right: '2px' }}><FrameCorner rotate={90} /></div>
                <div style={{ position: 'absolute', bottom: '2px', right: '2px' }}><FrameCorner rotate={180} /></div>
                <div style={{ position: 'absolute', bottom: '2px', left: '2px' }}><FrameCorner rotate={270} /></div>
                <div style={{
                  width: '100%', height: '100%',
                  background: '#f8fafc',
                  overflow: 'hidden',
                  boxShadow: 'inset 0 0 0 1px rgba(15,23,42,.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <img
                    src={imageUrls[i] || ''}
                    alt=""
                    decoding="async"
                    draggable={false}
                    style={{
                      width: '100%', height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center',
                      display: 'block',
                    }}
                  />
                </div>
              </div>
            </div>
            <div style={{ width: '90%', textAlign: 'center', transform: `rotate(${tiltAngle * -0.3}deg)` }}>
              {title && (
                <div style={{ fontFamily: F.hand, fontSize: 'clamp(20px,3.5vw,28px)', color: '#3a2a1a', lineHeight: 1.15, marginBottom: '3px', fontWeight: 600 }}>{title}</div>
              )}
              {caption && (
                <div style={{ fontFamily: F.hand, fontSize: 'clamp(15px,2.6vw,22px)', color: '#5a4530', lineHeight: 1.35, fontWeight: 400, maxHeight: '3.5em', overflow: 'hidden' }}>{caption}</div>
              )}
            </div>
            <div style={{
              position: 'absolute', bottom: 'clamp(8px,1.5vw,14px)',
              [isLeftPage ? 'left' : 'right']: 'clamp(12px,2vw,20px)',
              fontFamily: F.hand, fontSize: 'clamp(11px,1.8vw,14px)',
              color: 'rgba(71,85,105,.45)', fontStyle: 'italic',
            }}>{String(i + 1).padStart(2, '0')}</div>
          </div>
        </BookPage>
      );
    });

    /* Back cover (hard) */
    pages.push(
      <BookPage key="back" isHard>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: `radial-gradient(ellipse at 30% 30%, rgba(139,52,38,.4) 0%, transparent 50%),radial-gradient(ellipse at 70% 70%, rgba(60,15,10,.5) 0%, transparent 60%)` }} />
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: '14px', border: `1px solid ${C.gold}66` }} />
          <div style={{ fontFamily: F.hand, fontSize: 'clamp(20px,3.5vw,30px)', color: C.gold, opacity: .85 }}>with love</div>
          <div style={{ width: '40px', height: '1px', background: C.gold, opacity: .35 }} />
          <div style={{ fontFamily: F.sans, fontSize: 'clamp(8px,1.3vw,10px)', color: C.gold, letterSpacing: '5px', textTransform: 'uppercase', opacity: .6, fontWeight: 500 }}>Memora · {year}</div>
        </div>
      </BookPage>
    );

    /* Pad to even */
    if (pages.length % 2 !== 0) {
      pages.push(<BookPage key="pad"><div style={{ width: '100%', height: '100%', backgroundColor: C.page }} /></BookPage>);
    }
    return pages;
  }, [photos, imageUrls, year]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
        
        /* Force white opaque at all library layers */
        .stf__wrapper{margin:0 auto!important;background:transparent!important}
.stf__parent{
  box-shadow:0 18px 40px rgba(15,23,42,.08),0 4px 12px rgba(15,23,42,.04)!important;
  border-radius:6px!important;
  background:transparent!important;
}
.stf__block{
  background:transparent!important;
  perspective:2500px!important;
}
.mj-page{
  user-select:none;
  -webkit-user-select:none;
  opacity:1!important;
  background-clip:padding-box;
  transform-style:preserve-3d;
  -webkit-transform-style:preserve-3d;
  backface-visibility:visible!important;
  -webkit-backface-visibility:visible!important;
}
.mj-page img{-webkit-user-drag:none}
.stf__item,
.stf__item > div,
.stf__block > div{
  background:transparent!important;
}
.stf__item{
  background:transparent!important;
  transform-style:preserve-3d!important;
  -webkit-transform-style:preserve-3d!important;
  backface-visibility:visible!important;
  -webkit-backface-visibility:visible!important;
}
.stf__item.--soft,
.stf__item.--hard{
  background:transparent!important;
}
.stf__item > *{
  backface-visibility:visible!important;
  -webkit-backface-visibility:visible!important;
}
.mj-page[data-density="soft"]{background-color:${C.page}!important}
.mj-page[data-density="hard"]{background-color:${C.cover}!important}
        
        @keyframes mj-spin{to{transform:rotate(360deg)}}
        @keyframes mj-pulse{0%,100%{opacity:.4;transform:translateX(-50%) translateY(0)}50%{opacity:1;transform:translateX(-50%) translateY(-3px)}}
        @keyframes mj-eject{0%{transform:translateY(0) scale(1);opacity:1}30%{transform:translateY(-12px) scale(1.03)}100%{transform:translateY(40px) scale(.5);opacity:0}}
        @keyframes mj-fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes mj-fadeInSlow{from{opacity:0;transform:translateY(20px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes mj-bookEnter{from{opacity:0;transform:scale(.9) translateY(30px)}to{opacity:1;transform:scale(1) translateY(0)}}
        
        /* Cover open animation - keeps translateX so no jump */
        @keyframes mj-coverOpen{
          0%{transform:translateX(-50%) rotateY(0deg);box-shadow:0 20px 40px -10px rgba(0,0,0,.35)}
          100%{transform:translateX(-50%) rotateY(-172deg);box-shadow:0 4px 20px rgba(0,0,0,.1)}
        }
        @keyframes mj-flipbookReveal{from{opacity:0}to{opacity:1}}
        @keyframes mj-tooltipIn{0%{opacity:0;transform:translateX(-50%) translateY(-8px)}15%{opacity:1;transform:translateX(-50%) translateY(0)}85%{opacity:1;transform:translateX(-50%) translateY(0)}100%{opacity:0;transform:translateX(-50%) translateY(0)}}
        @keyframes mj-glow{
          0%,100%{box-shadow:0 20px 40px -10px rgba(0,0,0,.3)}
          50%{box-shadow:0 20px 40px -10px rgba(0,0,0,.35),0 0 40px rgba(212,180,131,.2)}
        }
        
        .mj-bookwrap{animation:mj-bookEnter 1s cubic-bezier(.2,.8,.2,1) both}
        .mj-flipbook-wrap{animation:mj-flipbookReveal .3s ease both}
        .mj-closedbook{animation:mj-glow 4s ease-in-out infinite}
        .mj-closedbook:hover{transform:translateY(-4px) scale(1.01) translateX(-50%);transition:transform .35s ease}
        .mj-cover-rotating{
          transform-origin:left center;
          transform-style:preserve-3d;
          -webkit-transform-style:preserve-3d;
          backface-visibility:hidden;
          -webkit-backface-visibility:hidden;
          animation:mj-coverOpen .72s cubic-bezier(.55,.18,.2,1) forwards;
        }
        .mj-tooltip{animation:mj-tooltipIn 3.5s ease forwards}
      `}} />

      <div style={{
        position: 'fixed', inset: 0,
        fontFamily: F.sans, color: C.text, overflow: 'hidden',
        background: C.bg,
      }}>
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none',
          backgroundImage: `radial-gradient(circle at 15% 20%, rgba(15,23,42,.015) 0%, transparent 40%),radial-gradient(circle at 85% 85%, rgba(15,23,42,.02) 0%, transparent 50%)`,
        }} />

        {/* LOADING */}
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999, background: C.bg,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px',
          transition: 'opacity .6s,visibility .6s',
          opacity: phase === 'loading' ? 1 : 0,
          visibility: phase === 'loading' ? 'visible' : 'hidden',
          pointerEvents: phase === 'loading' ? 'auto' : 'none',
        }}>
          <div style={{ width: '40px', height: '40px', border: `1.5px solid ${C.text}33`, borderTopColor: C.text, borderRadius: '50%', animation: 'mj-spin .9s linear infinite' }} />
          <div style={{ fontFamily: F.sans, fontSize: '1.1rem', color: C.text, fontWeight: 500, letterSpacing: '.02em' }}>{loadPct}%</div>
          <div style={{ fontFamily: F.sans, fontSize: '.65rem', letterSpacing: '.3em', textTransform: 'uppercase', color: C.textSoft, fontWeight: 500 }}>Preparing your memories</div>
        </div>

        {/* INTRO — sans-serif outside */}
        <div
          onClick={handleIntroTap}
          onTouchEnd={(e) => { e.preventDefault(); handleIntroTap(); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 90,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            opacity: phase === 'intro' ? 1 : 0,
            pointerEvents: phase === 'intro' ? 'auto' : 'none',
            transition: 'opacity 1s ease', padding: '40px 24px',
            cursor: introStep >= 3 ? 'pointer' : 'default',
          }}>
          <div style={{
            fontFamily: F.sans, fontSize: 'clamp(32px,6.5vw,64px)',
            color: C.text, fontWeight: 300, textAlign: 'center',
            lineHeight: 1.1, marginBottom: 'clamp(20px,4vw,36px)',
            letterSpacing: '-.02em',
            opacity: introStep >= 1 ? 1 : 0,
            transform: introStep >= 1 ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 2s ease, transform 2s ease',
          }}>For <span style={{ fontWeight: 500 }}>{recipient}</span></div>
          <div style={{
            fontFamily: F.sans, fontStyle: 'italic',
            fontSize: 'clamp(15px,2.4vw,20px)', color: C.text, fontWeight: 300,
            textAlign: 'center', maxWidth: '520px', lineHeight: 1.6,
            opacity: introStep >= 2 ? .8 : 0,
            transform: introStep >= 2 ? 'translateY(0)' : 'translateY(15px)',
            transition: 'opacity 2s ease, transform 2s ease',
          }}>"I made this from the moments<br />I never want us to lose."</div>
          <div style={{
            position: 'absolute', bottom: 'clamp(40px,8vh,80px)',
            fontFamily: F.sans, fontSize: 'clamp(9px,1.2vw,11px)',
            letterSpacing: '4px', textTransform: 'uppercase', color: C.textSoft, fontWeight: 600,
            opacity: introStep >= 3 ? 1 : 0, transition: 'opacity 1s ease',
            animation: introStep >= 3 ? 'mj-pulse 1.8s ease-in-out infinite' : 'none',
          }}>✨ Tap anywhere to continue</div>
        </div>

        {/* BOOK */}
        <div style={{
          position: 'fixed', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 'clamp(18px,3vh,32px)',
          opacity: (phase === 'book' || phase === 'bookEnd') ? 1 : 0,
          pointerEvents: (phase === 'book' || phase === 'bookEnd') ? 'auto' : 'none',
          transition: 'opacity .6s', padding: '20px',
        }}>

          {/* Closed / opening cover */}
          {bookState !== 'open' && (
            <div style={{
              position: 'relative',
              width: dims.w * 2,
              height: dims.h,
              perspective: '2500px',
              perspectiveOrigin: 'center center',
            }}>
              <div
                className={`mj-closedbook ${bookState === 'opening' ? 'mj-cover-rotating' : ''}`}
                onClick={() => { if (bookState === 'closed') openBook(); }}
                onTouchEnd={(e) => { if (bookState === 'closed') { e.preventDefault(); openBook(); } }}
                style={{
                  position: 'absolute', left: '50%', top: 0,
                  width: dims.w, height: dims.h,
                  transform: 'translateX(-50%)',
                  transformOrigin: 'left center',
                  transformStyle: 'preserve-3d',
                  WebkitTransformStyle: 'preserve-3d',
                  cursor: bookState === 'closed' ? 'pointer' : 'default',
                  zIndex: 10, willChange: 'transform',
                }}
              >
                {/* Front face */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: `linear-gradient(135deg, ${C.cover} 0%, #3d130d 50%, ${C.cover} 100%)`,
                  borderRadius: '4px', overflow: 'hidden',
                  boxShadow: bookState === 'closed'
                    ? '0 20px 40px -10px rgba(0,0,0,.35), inset 2px 0 6px rgba(0,0,0,.4)'
                    : 'inset 2px 0 6px rgba(0,0,0,.4)',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'translateZ(1px)',
                }}>
                  <div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none',
                    backgroundImage: `radial-gradient(ellipse at 30% 30%, rgba(139,52,38,.4) 0%, transparent 50%),radial-gradient(ellipse at 70% 70%, rgba(60,15,10,.5) 0%, transparent 60%),repeating-linear-gradient(45deg, rgba(0,0,0,.02) 0 1px, transparent 1px 4px)`,
                  }} />
                  <CoverFace recipient={recipient} year={year} />
                </div>
                {/* Back face - prevents see-through during rotation */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: `linear-gradient(135deg, ${C.cover} 0%, #3d130d 50%, ${C.cover} 100%)`,
                  borderRadius: '4px',
                  boxShadow: 'inset -2px 0 6px rgba(0,0,0,.35)',
                  transform: 'rotateY(180deg) translateZ(1px)',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                }} />
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0,
                  width: '10px',
                  background: 'linear-gradient(to right, rgba(0,0,0,.5), transparent)',
                  pointerEvents: 'none',
                }} />
              </div>

              {bookState === 'closed' && (
                <div style={{
                  position: 'absolute',
                  left: `calc(50% + ${dims.w / 2 - 3}px)`,
                  top: '6px', bottom: '6px', width: '6px',
                  background: 'linear-gradient(to right, #ffffff 0%, #f1f5f9 100%)',
                  borderRadius: '0 2px 2px 0',
                  boxShadow: '1px 0 3px rgba(15,23,42,.1)',
                  zIndex: 5,
                }} />
              )}
            </div>
          )}

          {/* OPEN — FlipBook with ghost page trick */}
          {bookState === 'open' && FlipBookComp && (
            <div className="mj-flipbook-wrap" style={{ position: 'relative' }}>
              <FlipBookComp
                ref={flipRef}
                width={dims.w}
                height={dims.h}
                size="fixed"
                minWidth={100}
                maxWidth={500}
                minHeight={150}
                maxHeight={700}
                showCover={true}
                mobileScrollSupport={false}
                useMouseEvents={true}
                clickEventForward={true}
                flippingTime={700}
                drawShadow={true}
                maxShadowOpacity={0.18}
                showPageCorners={false}
                disableFlipByClick={false}
                usePortrait={false}
                startZIndex={10}
                autoSize={false}
                onFlip={onFlip}
                style={{}}
                className=""
                startPage={1}
                swipeDistance={20}
              >
                {renderPages}
              </FlipBookComp>
            </div>
          )}

          {bookState === 'open' && phase === 'book' && (
            <nav style={{
              display: 'flex', alignItems: 'center', gap: 'clamp(16px,3.5vw,28px)',
              marginTop: 'clamp(14px,2vh,22px)',
              animation: 'mj-fadeIn .8s ease both',
            }}>
              <button onClick={flipPrev} style={navBtn(currentPage <= 1)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <div style={{ fontFamily: F.sans, fontSize: 'clamp(11px,1.5vw,13px)', color: C.text, minWidth: '70px', textAlign: 'center', fontWeight: 500, letterSpacing: '.05em' }}>{pageLabel}</div>
              <button onClick={flipNext} style={navBtn(currentPage >= totalPages)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </nav>
          )}

          {phase === 'bookEnd' && (
            <button onClick={goToCassette} style={continueBtn}>Continue</button>
          )}
        </div>

        {/* CASSETTE + WOODEN TV — new luxury design */}
        <div style={{
          position: 'fixed', inset: 0,
          zIndex: (phase === 'cassette' || phase === 'tv') ? 50 : 0,
          opacity: (phase === 'cassette' || phase === 'tv') ? 1 : 0,
          pointerEvents: (phase === 'cassette' || phase === 'tv') ? 'auto' : 'none',
          transition: 'opacity .8s ease',
        }}>
          {(phase === 'cassette' || phase === 'tv') && (
            <CassetteTVScene
              videoUrl={videoUrl}
              recipient={recipient}
              year={year}
              onEnded={closeToEnding}
            />
          )}
        </div>

        {/* ENDING — sans-serif */}
        <div style={{
          position: 'fixed', inset: 0, zIndex: phase === 'ending' ? 60 : 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          opacity: phase === 'ending' ? 1 : 0, pointerEvents: phase === 'ending' ? 'auto' : 'none',
          transition: 'opacity 1.5s ease', padding: '40px 24px',
        }}>
          <div style={{
            fontFamily: F.sans, fontSize: 'clamp(38px,8vw,72px)',
            color: C.text, fontWeight: 300, textAlign: 'center', lineHeight: 1.1,
            letterSpacing: '-.02em',
            animation: phase === 'ending' ? 'mj-fadeInSlow 2.5s ease both' : 'none',
          }}>Love you always 💝</div>
          <div style={{
            marginTop: 'clamp(24px,4vw,40px)',
            fontFamily: F.sans, fontSize: 'clamp(9px,1.2vw,11px)', letterSpacing: '5px',
            textTransform: 'uppercase', color: C.textSoft, fontWeight: 600,
            animation: phase === 'ending' ? 'mj-fadeInSlow 2.5s ease 1s both' : 'none',
            opacity: 0,
          }}>Memora · {year}</div>
        </div>

        {tooltip && (
          <div key={tooltip} className="mj-tooltip" style={{
            position: 'fixed', top: 'clamp(24px,6vh,60px)', left: '50%',
            transform: 'translateX(-50%)', zIndex: 500,
            padding: '10px 20px', background: `${C.text}E6`,
            backdropFilter: 'blur(10px)', border: `1px solid ${C.gold}66`,
            borderRadius: '30px', color: '#F5E6CC',
            fontFamily: F.sans, fontSize: 'clamp(12px,1.6vw,14px)', fontWeight: 500,
            letterSpacing: '.02em', pointerEvents: 'none', whiteSpace: 'nowrap',
            boxShadow: '0 8px 24px rgba(114,73,51,.25)',
          }}>{tooltip}</div>
        )}
      </div>
    </>
  );
}

function CoverFace({ recipient, year }: { recipient: string; year: string }) {
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 'clamp(20px,5vw,40px)', textAlign: 'center', position: 'relative',
    }}>
      <div style={{ position: 'absolute', inset: '14px', border: `1px solid ${C.gold}99`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: '20px', border: `.5px solid ${C.gold}4D`, pointerEvents: 'none' }} />
      <div style={{ fontSize: 'clamp(10px,1.8vw,14px)', color: C.gold, letterSpacing: '8px', marginBottom: 'clamp(16px,3vw,28px)', opacity: .9 }}>❦</div>
      <div style={{ fontFamily: F.sans, fontSize: 'clamp(10px,1.6vw,12px)', fontWeight: 500, color: C.gold, letterSpacing: '6px', textTransform: 'uppercase', marginBottom: '14px', opacity: .85 }}>For</div>
      <div style={{ fontFamily: F.hand, fontSize: 'clamp(34px,7vw,58px)', color: '#F5E6CC', lineHeight: 1, marginBottom: '6px' }}>{recipient}</div>
      <div style={{ width: '50px', height: '1px', background: `linear-gradient(to right, transparent, ${C.gold}, transparent)`, margin: 'clamp(20px,3vw,30px) auto' }} />
      <div style={{ fontFamily: F.sans, fontSize: 'clamp(9px,1.4vw,11px)', fontWeight: 500, color: '#C9A06B', letterSpacing: '6px', textTransform: 'uppercase', opacity: .85 }}>Album of Memories</div>
      <div style={{ position: 'absolute', bottom: 'clamp(28px,5vw,44px)', left: '50%', transform: 'translateX(-50%)', fontFamily: F.sans, fontSize: 'clamp(8px,1.2vw,10px)', color: '#C9A06B', letterSpacing: '4px', fontWeight: 400, opacity: .6 }}>MEMORA · {year}</div>
    </div>
  );
}

const navBtn = (disabled: boolean): React.CSSProperties => ({
  width: 'clamp(36px,6vw,46px)', height: 'clamp(36px,6vw,46px)',
  background: `${C.text}14`,
  border: `1px solid ${C.text}4D`, borderRadius: '50%',
  color: C.text, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  opacity: disabled ? .25 : 1, transition: 'all .25s',
  backdropFilter: 'blur(8px)',
});

const continueBtn: React.CSSProperties = {
  padding: '14px 36px',
  background: C.text,
  border: `1px solid ${C.text}`,
  borderRadius: '40px',
  color: '#F5E6CC',
  fontFamily: F.sans,
  fontWeight: 500,
  fontSize: 'clamp(13px,1.8vw,15px)',
  letterSpacing: '.15em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  boxShadow: '0 8px 24px -6px rgba(114,73,51,.35)',
  animation: 'mj-fadeInSlow 1.2s ease both',
};
