'use client';
import { useEffect, useRef, useState, useCallback, useMemo, forwardRef } from 'react';
import type { Album } from '@/lib/types';
 
/*
  ═══════════════════════════════════════════════════════════════
  MEMORA — MothersDayJourney  [v7 — CLOSED → OPEN, LUXURY CREAM]
  ═══════════════════════════════════════════════════════════════
  Fixes from v6:
   1. Book starts CLOSED (centered cover), click to open
   2. Removed showPageCorners (caused "see-through" hover bug)
   3. Background: warm ivory/champagne marble (luxury, not green)
   4. Pages: clean cream paper #FAF3E2
   5. Cover: deep burgundy with gold foil details
  ═══════════════════════════════════════════════════════════════
*/
 
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
 
/* ── Ornate vintage frame corner SVG ── */
const FrameCorner = ({ rotate = 0 }: { rotate?: number }) => (
  <svg width="36" height="36" viewBox="0 0 60 60" style={{ transform: `rotate(${rotate}deg)`, position: 'absolute', pointerEvents: 'none' }}>
    <path d="M2 30 Q2 2 30 2 M8 30 Q8 8 30 8 M2 12 Q5 5 12 2 M8 16 Q11 11 16 8" stroke="#c9a97a" strokeWidth=".9" fill="none" opacity=".7"/>
    <circle cx="6" cy="6" r="1.5" fill="#b89a6e" opacity=".6"/>
    <path d="M14 4 Q18 6 16 10 Q12 8 14 4" fill="#c9a97a" opacity=".5"/>
    <path d="M4 14 Q6 18 10 16 Q8 12 4 14" fill="#c9a97a" opacity=".5"/>
  </svg>
);
 
/* ── Page wrapper ── */
const BookPage = forwardRef<HTMLDivElement, { children: React.ReactNode; isCover?: boolean; isBack?: boolean; isLeft?: boolean }>(
  ({ children, isCover, isBack, isLeft }, ref) => (
    <div ref={ref} className="mj-page" style={{
      width: '100%', height: '100%',
      overflow: 'hidden',
      position: 'relative',
      background: isCover || isBack
        ? 'linear-gradient(135deg,#5c1f17 0%,#3d130d 50%,#5c1f17 100%)'
        : '#FAF3E2',
    }}>
      {!isCover && !isBack && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `
            radial-gradient(circle at 20% 20%, rgba(180,140,90,.03) 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(180,140,90,.04) 0%, transparent 40%)
          `,
          mixBlendMode: 'multiply',
        }} />
      )}
      {!isCover && !isBack && (
        <div style={{
          position: 'absolute', top: 0, bottom: 0,
          [isLeft ? 'right' : 'left']: 0,
          width: '20px',
          background: isLeft
            ? 'linear-gradient(to right, transparent, rgba(101,67,33,.18))'
            : 'linear-gradient(to left, transparent, rgba(101,67,33,.18))',
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
 
  const [loaded, setLoaded] = useState(false);
  const [loadPct, setLoadPct] = useState(0);
  const [FlipBookComp, setFlipBookComp] = useState<any>(null);
  const [bookOpened, setBookOpened] = useState(false); // ✨ NEW
  const [openingAnim, setOpeningAnim] = useState(false); // ✨ NEW
  const [currentPage, setCurrentPage] = useState(0);
  const [bookDone, setBookDone] = useState(false);
  const [dims, setDims] = useState({ w: 320, h: 440 });
  const [isMobile, setIsMobile] = useState(false);
 
  const [showTV, setShowTV] = useState(false);
  const [tvStatic, setTvStatic] = useState(true);
  const [tvLed, setTvLed] = useState(false);
  const [phase, setPhase] = useState<'book' | 'cassette' | 'feedback'>('book');
  const [cassetteEject, setCassetteEject] = useState(false);
  const [rating, setRating] = useState(0);
  const [fbSent, setFbSent] = useState(false);
  const [fbName, setFbName] = useState('');
  const [fbComment, setFbComment] = useState('');
  const [fbLoading, setFbLoading] = useState(false);
 
  const flipRef = useRef<any>(null);
  const vRef = useRef<HTMLVideoElement>(null);
  const iRef = useRef<HTMLIFrameElement>(null);
 
  const totalPages = useMemo(() => {
    let count = 1 + photos.length + 1;
    if (count % 2 !== 0) count++;
    return count;
  }, [photos.length]);
 
  useEffect(() => {
    import('react-pageflip').then(mod => {
      setFlipBookComp(() => mod.default);
    }).catch(() => {});
  }, []);
 
  useEffect(() => {
    const update = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const mobile = vw < 768;
      setIsMobile(mobile);
 
      let pw: number, ph: number;
      if (mobile) {
        pw = Math.min(vw * 0.78, 360);
        ph = pw * 1.32;
        const maxH = vh * 0.72;
        if (ph > maxH) { ph = maxH; pw = ph / 1.32; }
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
    return () => window.removeEventListener('resize', update);
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
 
  /* ── Open the book (transition from closed to FlipBook) ── */
  const openBook = useCallback(() => {
    if (bookOpened || openingAnim) return;
    initAudio();
    playFlip();
    setOpeningAnim(true);
    setTimeout(() => {
      setBookOpened(true);
      setOpeningAnim(false);
    }, 900);
  }, [bookOpened, openingAnim]);
 
  const onFlip = useCallback((e: any) => {
    playFlip();
    const page = e.data;
    setCurrentPage(page);
    if (page >= totalPages - 2 && !bookDone) {
      setBookDone(true);
      setTimeout(() => setPhase(videoUrl ? 'cassette' : 'feedback'), 1500);
    }
  }, [totalPages, videoUrl, bookDone]);
 
  const flipPrev = () => { try { flipRef.current?.pageFlip()?.flipPrev(); } catch {} };
  const flipNext = () => { try { flipRef.current?.pageFlip()?.flipNext(); } catch {} };
 
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!bookOpened) {
        if (e.key === 'Enter' || e.key === ' ') openBook();
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') flipNext();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') flipPrev();
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [bookOpened, openBook]);
 
  const openTV = () => {
    setCassetteEject(true);
    setTimeout(() => {
      setShowTV(true); setTvStatic(true); setTvLed(false);
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
  const closeTV = () => {
    setShowTV(false); setTvStatic(true); setTvLed(false);
    if (vRef.current) { vRef.current.pause(); vRef.current.src = ''; }
    if (iRef.current) { iRef.current.src = ''; iRef.current.style.display = 'none'; }
    setPhase('feedback');
  };
 
  const submitFb = async () => {
    if (!rating) { alert('Please select a rating'); return; }
    setFbLoading(true);
    try {
      const r = await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ album_id: album.id, rating, comment: fbComment.trim() || (fbName ? `From ${fbName}` : 'Sent with love') }) });
      if (!r.ok) throw new Error();
      setFbSent(true);
    } catch { alert('Could not send. Please try again.'); }
    finally { setFbLoading(false); }
  };
 
  const pageLabel = currentPage <= 0 ? 'Cover'
    : currentPage >= totalPages - 1 ? 'End'
    : `${currentPage} / ${photos.length}`;
 
  /* ══════════════════════════════════════════════════════════ */
  /* PAGES                                                       */
  /* ══════════════════════════════════════════════════════════ */
  const renderPages = useMemo(() => {
    const pages: React.ReactNode[] = [];
 
    /* COVER (inside FlipBook — same design as ClosedBook) */
    pages.push(
      <BookPage key="cover" isCover>
        <CoverFace recipient={recipient} year={year} />
      </BookPage>
    );
 
    /* PHOTO PAGES */
    photos.forEach((photo, i) => {
      const title = getCaptionTitle(photo);
      const caption = getCaptionText(photo);
      const isLeftPage = (i + 1) % 2 === 1;
      const tiltAngle = i % 3 === 0 ? 0 : (i % 2 === 0 ? -1.2 : 1.4);
 
      pages.push(
        <BookPage key={`photo-${i}`} isLeft={isLeftPage}>
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: 'clamp(20px,4vw,36px) clamp(18px,3.5vw,32px)',
            position: 'relative',
          }}>
            {/* Photo with ornate frame */}
            <div style={{
              position: 'relative',
              width: '78%',
              maxWidth: '300px',
              aspectRatio: '4/5',
              transform: `rotate(${tiltAngle}deg)`,
              marginBottom: 'clamp(18px,3vw,28px)',
              filter: 'drop-shadow(0 6px 14px rgba(80,50,20,.22)) drop-shadow(0 2px 4px rgba(80,50,20,.15))',
            }}>
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(135deg, #fdfaf3 0%, #f4ead6 50%, #fdfaf3 100%)',
                borderRadius: '4px',
                padding: 'clamp(10px,2vw,16px)',
                boxShadow: `
                  inset 0 0 0 1px rgba(180,140,90,.3),
                  inset 0 0 0 4px #fdfaf3,
                  inset 0 0 0 5px rgba(180,140,90,.18)
                `,
              }}>
                <div style={{ position: 'absolute', top: '4px', left: '4px' }}><FrameCorner rotate={0} /></div>
                <div style={{ position: 'absolute', top: '4px', right: '4px' }}><FrameCorner rotate={90} /></div>
                <div style={{ position: 'absolute', bottom: '4px', right: '4px' }}><FrameCorner rotate={180} /></div>
                <div style={{ position: 'absolute', bottom: '4px', left: '4px' }}><FrameCorner rotate={270} /></div>
                <div style={{
                  width: '100%', height: '100%',
                  background: '#1a1410',
                  overflow: 'hidden',
                  boxShadow: 'inset 0 0 0 1px rgba(60,40,20,.4)',
                }}>
                  <img
                    src={imageUrls[i] || ''}
                    alt=""
                    decoding="async"
                    draggable={false}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </div>
              </div>
            </div>
 
            {/* Handwritten caption */}
            <div style={{
              width: '85%', textAlign: 'center',
              transform: `rotate(${tiltAngle * -0.3}deg)`,
            }}>
              {title && (
                <div style={{
                  fontFamily: "'Caveat',cursive",
                  fontSize: 'clamp(20px,3.8vw,28px)',
                  color: '#3a2a1a', lineHeight: 1.2,
                  marginBottom: '4px', fontWeight: 600,
                }}>
                  {title}
                </div>
              )}
              {caption && (
                <div style={{
                  fontFamily: "'Caveat',cursive",
                  fontSize: 'clamp(15px,2.8vw,22px)',
                  color: '#5a4530', lineHeight: 1.4,
                  fontWeight: 400,
                  maxHeight: '4em', overflow: 'hidden',
                }}>
                  {caption}
                </div>
              )}
            </div>
 
            <div style={{
              position: 'absolute',
              bottom: 'clamp(10px,2vw,16px)',
              [isLeftPage ? 'left' : 'right']: 'clamp(14px,2.5vw,22px)',
              fontFamily: "'Caveat',cursive",
              fontSize: 'clamp(11px,1.8vw,14px)',
              color: 'rgba(90,60,30,.4)',
              fontStyle: 'italic',
            }}>
              {String(i + 1).padStart(2, '0')}
            </div>
          </div>
        </BookPage>
      );
    });
 
    /* BACK COVER */
    pages.push(
      <BookPage key="back" isBack>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `radial-gradient(ellipse at 30% 30%, rgba(139,52,38,.4) 0%, transparent 50%),radial-gradient(ellipse at 70% 70%, rgba(60,15,10,.5) 0%, transparent 60%)`,
        }} />
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: '14px', border: '1px solid rgba(212,180,131,.4)' }} />
          <div style={{ fontFamily: "'Caveat',cursive", fontSize: 'clamp(20px,3.5vw,30px)', color: '#D4B483', opacity: .85 }}>
            with love
          </div>
          <div style={{ width: '40px', height: '1px', background: '#D4B483', opacity: .35 }} />
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 'clamp(8px,1.3vw,10px)', color: '#C9A06B', letterSpacing: '5px', textTransform: 'uppercase', opacity: .6 }}>
            Memoraa · {year}
          </div>
        </div>
      </BookPage>
    );
 
    if (pages.length % 2 !== 0) {
      pages.push(<BookPage key="pad"><div style={{ width: '100%', height: '100%' }} /></BookPage>);
    }
 
    return pages;
  }, [photos, imageUrls, recipient, year]);
 
  /* ══════════════════════════════════════════════════════════ */
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400;1,500&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
        .stf__wrapper{margin:0 auto!important;background:transparent!important}
        .stf__parent{
          box-shadow:
            0 50px 100px -25px rgba(60,30,15,.55),
            0 30px 60px -15px rgba(60,30,15,.4),
            0 0 0 1px rgba(60,30,15,.15)!important;
          border-radius:3px!important;
          background:transparent!important;
        }
        .stf__block{background:transparent!important}
        .mj-page{user-select:none;-webkit-user-select:none}
        .mj-page img{-webkit-user-drag:none}
        @keyframes mj-spin{to{transform:rotate(360deg)}}
        @keyframes mj-hint{0%,100%{opacity:.5;transform:translateX(-50%) translateY(0)}50%{opacity:.95;transform:translateX(-50%) translateY(-3px)}}
        @keyframes mj-eject{0%{transform:translateY(0) scale(1);opacity:1}30%{transform:translateY(-12px) scale(1.03)}100%{transform:translateY(40px) scale(.5);opacity:0}}
        @keyframes mj-fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes mj-bookEnter{from{opacity:0;transform:scale(.9) translateY(30px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes mj-bookOpen{0%{transform:scale(1) rotateY(0deg);opacity:1}50%{transform:scale(1.05) rotateY(-25deg)}100%{transform:scale(1.1) rotateY(-90deg);opacity:0}}
        @keyframes mj-flipbookIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
        @keyframes mj-glow{0%,100%{box-shadow:0 30px 60px -15px rgba(60,30,15,.5),0 15px 30px -8px rgba(60,30,15,.3)}50%{box-shadow:0 30px 60px -15px rgba(60,30,15,.55),0 15px 30px -8px rgba(60,30,15,.35),0 0 60px rgba(212,180,131,.25)}}
        .mj-bookwrap{animation:mj-bookEnter 1s cubic-bezier(.2,.8,.2,1) both}
        .mj-flipbook-wrap{animation:mj-flipbookIn .8s ease both}
        .mj-closedbook{animation:mj-glow 4s ease-in-out infinite}
        .mj-closedbook.opening{animation:mj-bookOpen .9s cubic-bezier(.5,.1,.5,1) forwards}
        .mj-closedbook:hover{transform:translateY(-4px) scale(1.01);transition:transform .35s ease}
      `}} />
 
      <div style={{
        position: 'fixed', inset: 0,
        fontFamily: "'Cormorant Garamond',serif", color: '#3a2a1a', overflow: 'hidden',
        background: `
          radial-gradient(ellipse 100% 80% at 50% 30%, #F5E8CC 0%, #E5D2AE 40%, #C9B091 80%, #9E8868 100%)
        `,
      }}>
 
        {/* Marble/wood texture overlay */}
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none',
          backgroundImage: `
            radial-gradient(circle at 15% 25%, rgba(255,245,220,.2) 0%, transparent 40%),
            radial-gradient(circle at 85% 75%, rgba(120,80,40,.08) 0%, transparent 50%),
            radial-gradient(circle at 50% 100%, rgba(80,50,20,.15) 0%, transparent 60%)
          `,
        }} />
 
        {/* Subtle gold light from top */}
        <div style={{
          position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: '60%', height: '40%',
          background: 'radial-gradient(ellipse at top, rgba(255,235,180,.3) 0%, transparent 70%)',
          pointerEvents: 'none', mixBlendMode: 'overlay',
        }} />
 
        {/* ── Loading ── */}
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'radial-gradient(ellipse at 50% 50%, #F5E8CC 0%, #C9B091 100%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px',
          transition: 'opacity .6s,visibility .6s',
          opacity: loaded ? 0 : 1,
          visibility: loaded ? 'hidden' : 'visible',
          pointerEvents: loaded ? 'none' : 'auto',
        }}>
          <div style={{ width: '40px', height: '40px', border: '1.5px solid rgba(101,67,33,.2)', borderTopColor: '#5c1f17', borderRadius: '50%', animation: 'mj-spin .9s linear infinite' }} />
          <div style={{ fontFamily: "'Caveat',cursive", fontSize: '2rem', color: '#5c1f17', fontWeight: 500 }}>{loadPct}%</div>
          <div style={{ fontSize: '.55rem', letterSpacing: '.3em', textTransform: 'uppercase', color: 'rgba(92,31,23,.5)' }}>Preparing your memories</div>
        </div>
 
        {/* ══════════════════════════════════════════════════════ */}
        {/* BOOK PHASE                                            */}
        {/* ══════════════════════════════════════════════════════ */}
        <div style={{
          position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 'clamp(18px,3vh,32px)',
          opacity: phase === 'book' ? 1 : 0,
          pointerEvents: phase === 'book' ? 'auto' : 'none',
          transition: 'opacity .6s',
          padding: '20px',
        }}>
 
          {/* ─────────── CLOSED BOOK ─────────── */}
          {!bookOpened && (
            <div className={`mj-closedbook ${openingAnim ? 'opening' : ''}`}
              onClick={openBook}
              style={{
                position: 'relative',
                width: dims.w, height: dims.h,
                cursor: 'pointer',
                transformStyle: 'preserve-3d',
                perspective: '1500px',
                transformOrigin: 'left center',
              }}
            >
              {/* Spine - dark left edge */}
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                width: '14px',
                background: 'linear-gradient(to right, #2a0a06 0%, #4a1410 50%, #5c1f17 100%)',
                borderRadius: '2px 0 0 2px',
                boxShadow: 'inset -2px 0 4px rgba(0,0,0,.4)',
                zIndex: 2,
              }} />
 
              {/* Cover face */}
              <div style={{
                position: 'absolute', left: '14px', top: 0, right: 0, bottom: 0,
                background: 'linear-gradient(135deg, #5c1f17 0%, #3d130d 50%, #5c1f17 100%)',
                borderRadius: '0 4px 4px 0',
                overflow: 'hidden',
              }}>
                {/* Leather grain */}
                <div style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none',
                  backgroundImage: `
                    radial-gradient(ellipse at 30% 30%, rgba(139,52,38,.4) 0%, transparent 50%),
                    radial-gradient(ellipse at 70% 70%, rgba(60,15,10,.5) 0%, transparent 60%),
                    repeating-linear-gradient(45deg, rgba(0,0,0,.02) 0 1px, transparent 1px 4px)
                  `,
                }} />
                <CoverFace recipient={recipient} year={year} />
              </div>
 
              {/* Pages stack peek (right edge) */}
              <div style={{
                position: 'absolute', right: '-3px', top: '6px', bottom: '6px',
                width: '6px',
                background: 'linear-gradient(to right, #f5ead2 0%, #d8c9a8 100%)',
                borderRadius: '0 2px 2px 0',
                boxShadow: '1px 0 3px rgba(0,0,0,.15)',
                zIndex: 1,
              }} />
              <div style={{
                position: 'absolute', right: '-1px', top: '4px', bottom: '4px',
                width: '4px',
                background: '#fbf6e8',
                zIndex: 1,
              }} />
            </div>
          )}
 
          {/* Click hint below closed book */}
          {!bookOpened && !openingAnim && loaded && (
            <div style={{
              position: 'absolute', bottom: 'clamp(80px,15vh,140px)', left: '50%',
              fontFamily: "'Caveat',cursive",
              fontSize: 'clamp(16px,2.4vw,20px)',
              color: 'rgba(92,31,23,.7)',
              pointerEvents: 'none', whiteSpace: 'nowrap',
              animation: 'mj-hint 2.2s ease-in-out infinite',
            }}>
              ✨ Click to open
            </div>
          )}
 
          {/* ─────────── OPEN BOOK (FlipBook) ─────────── */}
          {bookOpened && FlipBookComp && (
            <div className="mj-flipbook-wrap" style={{ position: 'relative' }}>
              <FlipBookComp
                ref={flipRef}
                width={dims.w}
                height={dims.h}
                size="fixed"
                minWidth={150}
                maxWidth={500}
                minHeight={200}
                maxHeight={700}
                showCover={true}
                mobileScrollSupport={false}
                useMouseEvents={true}
                clickEventForward={true}
                flippingTime={950}
                drawShadow={true}
                maxShadowOpacity={0.5}
                showPageCorners={false}
                disableFlipByClick={false}
                usePortrait={isMobile}
                startZIndex={10}
                autoSize={false}
                onFlip={onFlip}
                style={{}}
                className=""
                startPage={0}
                swipeDistance={30}
              >
                {renderPages}
              </FlipBookComp>
            </div>
          )}
 
          {/* Nav (only when book opened) */}
          {bookOpened && (
            <nav style={{
              display: 'flex', alignItems: 'center', gap: 'clamp(16px,3.5vw,28px)',
              marginTop: 'clamp(14px,2vh,22px)',
              animation: 'mj-fadeIn .8s ease both',
            }}>
              <button onClick={flipPrev} style={{
                width: 'clamp(36px,6vw,46px)', height: 'clamp(36px,6vw,46px)',
                background: 'rgba(92,31,23,.08)',
                border: '1px solid rgba(92,31,23,.3)', borderRadius: '50%',
                color: '#5c1f17', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: currentPage === 0 ? .25 : 1, transition: 'all .25s',
                backdropFilter: 'blur(8px)',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <div style={{
                fontFamily: "'Caveat',cursive", fontSize: 'clamp(14px,2.2vw,18px)',
                color: 'rgba(92,31,23,.85)', minWidth: '70px',
                textAlign: 'center',
              }}>
                {pageLabel}
              </div>
              <button onClick={flipNext} style={{
                width: 'clamp(36px,6vw,46px)', height: 'clamp(36px,6vw,46px)',
                background: 'rgba(92,31,23,.08)',
                border: '1px solid rgba(92,31,23,.3)', borderRadius: '50%',
                color: '#5c1f17', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: currentPage >= totalPages - 2 ? .25 : 1, transition: 'all .25s',
                backdropFilter: 'blur(8px)',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </nav>
          )}
        </div>
 
        {/* ══════════════════════════════════════════════════════ */}
        {/* CASSETTE (UNCHANGED)                                  */}
        {/* ══════════════════════════════════════════════════════ */}
        <div style={{
          position: 'fixed', inset: 0, zIndex: phase === 'cassette' ? 50 : 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'clamp(12px,2.5vh,24px)',
          background: 'radial-gradient(ellipse at 50% 45%,#F5EFE7,#E8DDD0)',
          opacity: phase === 'cassette' ? 1 : 0, pointerEvents: phase === 'cassette' ? 'auto' : 'none',
          transition: 'opacity .8s ease',
        }}>
          <div style={{ fontFamily: "'Caveat',cursive", fontSize: 'clamp(22px,3.5vw,32px)', color: '#4a3f30' }}>One Last Surprise</div>
          <div style={{ fontSize: 'clamp(8px,1.4vw,10px)', letterSpacing: '.25em', color: 'rgba(139,115,85,.5)', textTransform: 'uppercase' }}>press play to watch</div>
          <div onClick={openTV} style={{
            cursor: 'pointer', transition: 'transform .3s',
            animation: cassetteEject ? 'mj-eject .6s forwards' : 'none',
          }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.03) translateY(-3px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
            <svg width="220" height="130" viewBox="0 0 220 130" fill="none">
              <rect x="6" y="12" width="208" height="106" rx="10" fill="#e9dbc9" stroke="#b89a6e" strokeWidth=".8" />
              <rect x="14" y="20" width="192" height="86" rx="7" fill="#fef7ef" />
              <rect x="24" y="28" width="172" height="46" rx="5" fill="#f4ede3" stroke="#d4c2a8" strokeWidth=".6" />
              <text x="110" y="52" fontFamily="'Caveat',cursive" fontSize="14" fill="#b89a6e" textAnchor="middle">memories</text>
              <text x="110" y="66" fontFamily="serif" fontSize="6" fill="#a88d66" textAnchor="middle" letterSpacing="2">WITH LOVE</text>
              <rect x="30" y="84" width="60" height="18" rx="3" fill="#e9dbc9" stroke="#b89a6e" strokeWidth=".5" />
              <rect x="130" y="84" width="60" height="18" rx="3" fill="#e9dbc9" stroke="#b89a6e" strokeWidth=".5" />
              <circle cx="60" cy="93" r="7" fill="#f4ede3" stroke="#b89a6e" strokeWidth=".4" /><circle cx="60" cy="93" r="2.5" fill="#b89a6e" />
              <circle cx="160" cy="93" r="7" fill="#f4ede3" stroke="#b89a6e" strokeWidth=".4" /><circle cx="160" cy="93" r="2.5" fill="#b89a6e" />
            </svg>
          </div>
          <div onClick={() => setPhase('feedback')} style={{
            fontSize: 'clamp(7px,1.2vw,9px)', color: 'rgba(74,63,48,.2)', textTransform: 'uppercase', letterSpacing: '.2em', cursor: 'pointer',
          }}>Skip</div>
        </div>
 
        {/* ══════════════════════════════════════════════════════ */}
        {/* FEEDBACK (UNCHANGED)                                  */}
        {/* ══════════════════════════════════════════════════════ */}
        <div style={{
          position: 'fixed', inset: 0, zIndex: phase === 'feedback' ? 50 : 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'radial-gradient(ellipse at 50% 30%,#F5EFE7,#E8DDD0)',
          opacity: phase === 'feedback' ? 1 : 0, pointerEvents: phase === 'feedback' ? 'auto' : 'none',
          transition: 'opacity .8s ease',
        }}>
          <div style={{
            background: 'rgba(255,252,245,.7)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(184,154,110,.18)', borderRadius: '18px',
            padding: 'clamp(16px,3vw,28px)', maxWidth: '340px', width: '90%',
            boxShadow: '0 12px 28px -6px rgba(0,0,0,.06)',
            animation: 'mj-fadeIn .8s ease',
          }}>
            {!fbSent ? (<>
              <div style={{ fontFamily: "'Caveat',cursive", fontSize: 'clamp(22px,3.5vw,28px)', color: '#3c3326', textAlign: 'center', marginBottom: '4px' }}>How Did We Do?</div>
              <div style={{ color: '#a88d66', fontSize: 'clamp(8px,1.4vw,10px)', textAlign: 'center', marginBottom: '12px', letterSpacing: '.1em' }}>Your voice means everything</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '10px' }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <span key={n} onClick={() => setRating(n)} style={{
                    fontSize: '1.3rem', cursor: 'pointer', color: n <= rating ? '#C6A97E' : 'rgba(60,51,38,.08)', transition: 'all .12s',
                  }}>★</span>
                ))}
              </div>
              <input placeholder="Your name (optional)" value={fbName} onChange={e => setFbName(e.target.value)} style={{
                width: '100%', padding: '7px 10px', background: 'rgba(255,255,255,.4)', border: '1px solid rgba(184,154,110,.25)',
                borderRadius: '10px', fontSize: '.7rem', marginBottom: '6px', outline: 'none', fontFamily: 'inherit', color: '#2e2a24',
              }} />
              <textarea placeholder="Leave a message of love..." value={fbComment} onChange={e => setFbComment(e.target.value)} style={{
                width: '100%', padding: '7px 10px', background: 'rgba(255,255,255,.4)', border: '1px solid rgba(184,154,110,.25)',
                borderRadius: '10px', fontSize: '.7rem', marginBottom: '8px', outline: 'none', fontFamily: 'inherit', color: '#2e2a24', resize: 'none', height: '55px',
              }} />
              <button disabled={fbLoading} onClick={submitFb} style={{
                width: '100%', padding: '7px', background: 'linear-gradient(135deg,#b89a6e,#C6A97E)', border: 'none',
                borderRadius: '24px', color: '#2e2a24', fontWeight: 600, fontSize: '.7rem', cursor: 'pointer', fontFamily: 'inherit',
                opacity: fbLoading ? .35 : 1,
              }}>{fbLoading ? 'Sending...' : 'Send Love'}</button>
            </>) : (
              <div style={{ textAlign: 'center', animation: 'mj-fadeIn .6s ease' }}>
                <div style={{ fontFamily: "'Caveat',cursive", fontSize: 'clamp(22px,3.5vw,28px)', color: '#b89a6e', marginBottom: '4px' }}>Thank You</div>
                <div style={{ color: '#6b5a48', fontSize: '.65rem' }}>Your message has been received with love.</div>
              </div>
            )}
          </div>
        </div>
 
        {/* ══════════════════════════════════════════════════════ */}
        {/* TV OVERLAY (UNCHANGED)                                */}
        {/* ══════════════════════════════════════════════════════ */}
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,.92)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: showTV ? 1 : 0, pointerEvents: showTV ? 'auto' : 'none', transition: 'opacity .4s',
        }}>
          <div style={{ position: 'relative', width: 'min(65vw,380px)', background: '#2a251e', borderRadius: '14px 14px 20px 20px', padding: '10px 12px 22px', boxShadow: '0 16px 32px rgba(0,0,0,.5),0 0 0 1.5px #5e4e38' }}>
            <div style={{ background: '#0f0e0a', borderRadius: '8px', padding: '4px' }}>
              <div style={{ position: 'relative', borderRadius: '6px', overflow: 'hidden', aspectRatio: '16/9', background: '#000' }}>
                <div style={{ position: 'absolute', inset: 0, background: '#555', transition: 'opacity .5s', zIndex: 5, opacity: tvStatic ? 1 : 0 }} />
                <video ref={vRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', zIndex: 2 }} playsInline controls onEnded={closeTV} />
                <iframe ref={iRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 2, border: 'none', display: 'none' }} allow="autoplay" title="Video" />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '4px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%,#6b5a48,#4a3e30)', boxShadow: '0 1px 2px rgba(0,0,0,.4)' }} />
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%,#6b5a48,#4a3e30)', boxShadow: '0 1px 2px rgba(0,0,0,.4)' }} />
            </div>
            <div style={{ textAlign: 'center', marginTop: '3px', fontFamily: "'Caveat',cursive", fontSize: '.7rem', color: '#5e4e38' }}>memoria</div>
            <div style={{ position: 'absolute', bottom: '-8px', right: '12px', width: '4px', height: '4px', borderRadius: '50%', background: tvLed ? '#2eff5e' : '#2a251e', boxShadow: tvLed ? '0 0 6px #2eff5e' : 'none', transition: 'all .3s' }} />
            <div onClick={closeTV} style={{ position: 'absolute', top: '-8px', right: '-8px', width: '22px', height: '22px', borderRadius: '50%', background: '#3c3326', border: '1px solid #C6A97E', color: '#C6A97E', fontSize: '.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ✕
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
 
/* ══════════════════════════════════════════════════════════ */
/* COVER FACE — shared between closed book & FlipBook cover    */
/* ══════════════════════════════════════════════════════════ */
function CoverFace({ recipient, year }: { recipient: string; year: string }) {
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 'clamp(20px,5vw,40px)', textAlign: 'center', position: 'relative',
    }}>
      {/* Gold double border */}
      <div style={{ position: 'absolute', inset: '14px', border: '1px solid rgba(212,180,131,.6)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: '20px', border: '.5px solid rgba(212,180,131,.3)', pointerEvents: 'none' }} />
 
      {/* Top ornament */}
      <div style={{ fontSize: 'clamp(10px,1.8vw,14px)', color: '#D4B483', letterSpacing: '8px', marginBottom: 'clamp(16px,3vw,28px)', opacity: .9 }}>
        ❦
      </div>
 
      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 'clamp(11px,2vw,14px)', fontWeight: 400, color: '#D4B483', letterSpacing: '6px', textTransform: 'uppercase', marginBottom: '14px', opacity: .9 }}>
        For
      </div>
      <div style={{ fontFamily: "'Caveat',cursive", fontSize: 'clamp(34px,7vw,58px)', color: '#F5E6CC', lineHeight: 1, marginBottom: '6px' }}>
        {recipient}
      </div>
 
      <div style={{
        width: '50px', height: '1px',
        background: 'linear-gradient(to right, transparent, #D4B483, transparent)',
        margin: 'clamp(20px,3vw,30px) auto',
      }} />
 
      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 'clamp(10px,1.6vw,12px)', fontWeight: 400, color: '#C9A06B', letterSpacing: '6px', textTransform: 'uppercase', opacity: .85 }}>
        Album of Memories
      </div>
 
      <div style={{ position: 'absolute', bottom: 'clamp(28px,5vw,44px)', left: '50%', transform: 'translateX(-50%)', fontFamily: "'Cormorant Garamond',serif", fontSize: 'clamp(8px,1.3vw,10px)', color: '#C9A06B', letterSpacing: '4px', fontStyle: 'italic', opacity: .65 }}>
        Memoraa · {year}
      </div>
    </div>
  );
}
