'use client';
import { useEffect, useRef, useState, useCallback, useMemo, forwardRef } from 'react';
import type { Album } from '@/lib/types';
 
/*
  ═══════════════════════════════════════════════════════════════
  MEMORA — MothersDayJourney  [v5 — caption overlay, FB-style]
  ═══════════════════════════════════════════════════════════════
  Fix v4 issues:
   - Caption now OVERLAYS on the photo page (no separate page)
   - Page corners curl on hover (showPageCorners=true)
   - Better 2-page spread on desktop, single on mobile but with peek
   - Photos are now PROPERLY paired (left=photo N, right=photo N+1)
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
 
/* ── Page wrapper for react-pageflip ─────────────────────── */
const BookPage = forwardRef<HTMLDivElement, { children: React.ReactNode; bg?: string; className?: string }>(
  ({ children, bg, className }, ref) => (
    <div ref={ref} className={`mj-page ${className || ''}`} style={{
      width: '100%', height: '100%',
      background: bg || '#F5EFE7',
      overflow: 'hidden',
      position: 'relative',
    }}>
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
 
  /* ── State ── */
  const [loaded, setLoaded] = useState(false);
  const [loadPct, setLoadPct] = useState(0);
  const [FlipBookComp, setFlipBookComp] = useState<any>(null);
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
 
  /* Total: cover + N photo pages + back cover, even-padded */
  const totalPages = useMemo(() => {
    let count = 1 + photos.length + 1;
    if (count % 2 !== 0) count++;
    return count;
  }, [photos.length]);
 
  /* ── Load library ── */
  useEffect(() => {
    import('react-pageflip').then(mod => {
      setFlipBookComp(() => mod.default);
    }).catch(() => {});
  }, []);
 
  /* ── Responsive sizing ── */
  useEffect(() => {
    const update = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const mobile = vw < 768;
      setIsMobile(mobile);
 
      let pw: number, ph: number;
      if (mobile) {
        // Mobile: single page, fits nicely centered with margin
        pw = Math.min(vw * 0.78, 360);
        ph = pw * 1.35;
        const maxH = vh * 0.7;
        if (ph > maxH) { ph = maxH; pw = ph / 1.35; }
      } else {
        // Desktop: book opens to 2 pages → each page width is half book width
        const maxBookW = Math.min(vw * 0.7, 900);
        const maxBookH = vh * 0.78;
        pw = maxBookW / 2;
        ph = pw * 1.4;
        if (ph > maxBookH) { ph = maxBookH; pw = ph / 1.4; }
      }
      setDims({ w: Math.round(pw), h: Math.round(ph) });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
 
  /* ── Preload images ── */
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
 
  /* ── Audio init ── */
  useEffect(() => {
    const h = () => { initAudio(); document.removeEventListener('click', h); document.removeEventListener('touchstart', h); };
    document.addEventListener('click', h); document.addEventListener('touchstart', h);
    return () => { document.removeEventListener('click', h); document.removeEventListener('touchstart', h); };
  }, []);
 
  /* ── Background music ── */
  useEffect(() => {
    const mu = (album as any).background_music_url;
    if (!mu) return;
    const a = new Audio(mu); a.loop = true; a.volume = 0.2;
    const p = () => { a.play().catch(() => {}); document.removeEventListener('click', p); document.removeEventListener('touchstart', p); };
    document.addEventListener('click', p); document.addEventListener('touchstart', p);
    return () => { a.pause(); a.src = ''; document.removeEventListener('click', p); document.removeEventListener('touchstart', p); };
  }, [album]);
 
  /* ── Flip event ── */
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
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') flipNext();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') flipPrev();
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);
 
  /* ── TV (UNCHANGED) ── */
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
 
    /* COVER */
    pages.push(
      <BookPage key="cover" bg="linear-gradient(135deg,#0B0B0B 0%,#1a1410 100%)">
        <div style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: 'clamp(20px,5vw,40px)', textAlign: 'center', position: 'relative',
        }}>
          <div style={{ position: 'absolute', inset: '12px', border: '1px solid rgba(198,169,126,.35)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', inset: '17px', border: '1px solid rgba(198,169,126,.12)', pointerEvents: 'none' }} />
 
          <div style={{ fontSize: 'clamp(8px,1.5vw,11px)', color: '#C6A97E', letterSpacing: '6px', marginBottom: 'clamp(12px,2.5vw,20px)', opacity: .7 }}>
            &#10022; &nbsp; &#10022; &nbsp; &#10022;
          </div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(16px,3.4vw,26px)', fontWeight: 400, color: '#F5EFE7', lineHeight: 1.5, marginBottom: '8px' }}>
            For the Most Wonderful
          </div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(20px,4.5vw,34px)', color: '#C6A97E', fontStyle: 'italic', marginBottom: '4px', lineHeight: 1.2 }}>
            {recipient}
          </div>
          <div style={{ width: '36px', height: '1px', background: '#C6A97E', opacity: .5, margin: 'clamp(14px,2.5vw,20px) auto' }} />
          <div style={{ fontSize: 'clamp(7px,1.3vw,9px)', fontWeight: 300, color: '#D4BA94', letterSpacing: '5px', textTransform: 'uppercase' }}>
            Album of Memories
          </div>
          <div style={{ fontSize: 'clamp(7px,1.2vw,9px)', color: '#9E7E56', letterSpacing: '3px', fontStyle: 'italic', opacity: .7, marginTop: 'clamp(12px,2.5vw,18px)' }}>
            Memoraa &middot; {year}
          </div>
        </div>
      </BookPage>
    );
 
    /* PHOTO PAGES — caption overlays at bottom */
    photos.forEach((photo, i) => {
      const title = getCaptionTitle(photo);
      const caption = getCaptionText(photo);
      const hasText = !!(title || caption);
 
      pages.push(
        <BookPage key={`photo-${i}`} bg="#0e0e0e">
          {/* Photo */}
          <div style={{ position: 'absolute', inset: 0, background: '#0e0e0e' }}>
            <img
              src={imageUrls[i] || ''}
              alt=""
              decoding="async"
              draggable={false}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
 
          {/* Caption overlay - bottom */}
          {hasText && (
            <div style={{
              position: 'absolute', left: 0, right: 0, bottom: 0,
              padding: 'clamp(20px,4vw,32px) clamp(14px,3vw,24px) clamp(14px,3vw,22px)',
              background: 'linear-gradient(to top, rgba(0,0,0,.85) 0%, rgba(0,0,0,.7) 50%, rgba(0,0,0,0) 100%)',
              color: '#F5EFE7',
              fontFamily: "'Cormorant Garamond','Georgia',serif",
            }}>
              {title && (
                <div style={{
                  fontFamily: "'Playfair Display',serif",
                  fontSize: 'clamp(13px,2.4vw,17px)', fontWeight: 600,
                  color: '#F5EFE7', lineHeight: 1.4, marginBottom: '5px',
                  textShadow: '0 1px 3px rgba(0,0,0,.5)',
                }}>
                  {title}
                </div>
              )}
              {caption && (
                <div style={{
                  fontSize: 'clamp(10px,1.9vw,13px)',
                  fontStyle: 'italic', fontWeight: 400,
                  color: 'rgba(245,239,231,.95)', lineHeight: 1.7,
                  textShadow: '0 1px 2px rgba(0,0,0,.4)',
                  maxHeight: '6.8em', overflow: 'hidden',
                }}>
                  {caption}
                </div>
              )}
            </div>
          )}
 
          {/* Page number - top right */}
          <div style={{
            position: 'absolute', top: 'clamp(8px,1.5vw,14px)', right: 'clamp(10px,2vw,16px)',
            fontSize: 'clamp(8px,1.4vw,10px)', color: 'rgba(255,255,255,.55)',
            letterSpacing: '3px', fontFamily: "'Playfair Display',serif",
            background: 'rgba(0,0,0,.3)', padding: '3px 8px', borderRadius: '2px',
            backdropFilter: 'blur(4px)',
          }}>
            {String(i + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}
          </div>
        </BookPage>
      );
    });
 
    /* BACK COVER */
    pages.push(
      <BookPage key="back" bg="linear-gradient(135deg,#0B0B0B 0%,#1a1410 100%)">
        <div style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '14px', position: 'relative',
        }}>
          <div style={{ position: 'absolute', inset: '12px', border: '1px solid rgba(198,169,126,.25)' }} />
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(11px,2vw,14px)', color: '#C6A97E', letterSpacing: '8px', textTransform: 'uppercase', opacity: .6 }}>
            Memoraa
          </div>
          <div style={{ width: '32px', height: '1px', background: '#C6A97E', opacity: .35 }} />
          <div style={{ fontSize: 'clamp(8px,1.3vw,10px)', color: '#9E7E56', letterSpacing: '3px', opacity: .5, fontStyle: 'italic' }}>
            Made with love &middot; {year}
          </div>
        </div>
      </BookPage>
    );
 
    /* Pad to even */
    if (pages.length % 2 !== 0) {
      pages.push(
        <BookPage key="pad" bg="#0B0B0B">
          <div style={{ width: '100%', height: '100%' }} />
        </BookPage>
      );
    }
 
    return pages;
  }, [photos, imageUrls, recipient, year]);
 
  /* ══════════════════════════════════════════════════════════ */
  /* RENDER                                                      */
  /* ══════════════════════════════════════════════════════════ */
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400;1,500&family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
        .stf__wrapper{margin:0 auto!important;background:transparent!important}
        .stf__parent{
          box-shadow:
            0 30px 60px -12px rgba(0,0,0,.5),
            0 18px 36px -8px rgba(0,0,0,.35),
            0 0 0 1px rgba(0,0,0,.1)!important;
          border-radius:2px!important;
          background:transparent!important;
        }
        .stf__block{background:transparent!important}
        .mj-page{user-select:none;-webkit-user-select:none}
        .mj-page img{-webkit-user-drag:none}
        @keyframes mj-spin{to{transform:rotate(360deg)}}
        @keyframes mj-hint{0%,100%{opacity:.25;transform:translateX(-50%) translateY(0)}50%{opacity:.7;transform:translateX(-50%) translateY(-2px)}}
        @keyframes mj-eject{0%{transform:translateY(0) scale(1);opacity:1}30%{transform:translateY(-12px) scale(1.03)}100%{transform:translateY(40px) scale(.5);opacity:0}}
        @keyframes mj-fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes mj-bookEnter{from{opacity:0;transform:scale(.92) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}
        .mj-bookwrap{animation:mj-bookEnter 1s cubic-bezier(.2,.8,.2,1) both}
      `}} />
 
      <div style={{
        position: 'fixed', inset: 0,
        fontFamily: "'Cormorant Garamond',serif", color: '#2e2a24', overflow: 'hidden',
        background: `
          radial-gradient(ellipse 100% 80% at 50% 50%, #2a1f15 0%, #14100c 60%, #0a0806 100%)
        `,
      }}>
 
        {/* Ambient texture overlay */}
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(198,169,126,.04) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(198,169,126,.03) 0%, transparent 50%)',
          mixBlendMode: 'screen',
        }} />
 
        {/* ── Loading ── */}
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999, background: '#0B0B0B',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px',
          transition: 'opacity .6s,visibility .6s',
          opacity: loaded && FlipBookComp ? 0 : 1,
          visibility: loaded && FlipBookComp ? 'hidden' : 'visible',
          pointerEvents: loaded && FlipBookComp ? 'none' : 'auto',
        }}>
          <div style={{ width: '40px', height: '40px', border: '1.5px solid rgba(198,169,126,.15)', borderTopColor: '#C6A97E', borderRadius: '50%', animation: 'mj-spin .9s linear infinite' }} />
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.5rem', color: '#C6A97E', fontWeight: 300, letterSpacing: '.1em' }}>{loadPct}%</div>
          <div style={{ fontSize: '.55rem', letterSpacing: '.3em', textTransform: 'uppercase', color: 'rgba(198,169,126,.4)' }}>Preparing your memories</div>
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
          {/* Title above book */}
          <div style={{
            fontFamily: "'Playfair Display',serif",
            fontSize: 'clamp(11px,1.6vw,14px)',
            color: 'rgba(198,169,126,.55)',
            letterSpacing: '8px', textTransform: 'uppercase',
            opacity: currentPage === 0 ? 1 : 0, transition: 'opacity .5s',
            position: 'absolute', top: 'clamp(20px,5vh,50px)',
          }}>
            Memoraa
          </div>
 
          {/* Book */}
          <div className="mj-bookwrap" style={{ position: 'relative' }}>
            {FlipBookComp && (
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
                flippingTime={900}
                drawShadow={true}
                maxShadowOpacity={0.5}
                showPageCorners={true}
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
            )}
 
            {/* Tap hint on cover */}
            {currentPage === 0 && loaded && FlipBookComp && (
              <div style={{
                position: 'absolute', bottom: '-32px', left: '50%',
                fontSize: 'clamp(8px,1.3vw,10px)', color: 'rgba(198,169,126,.55)', letterSpacing: '4px',
                textTransform: 'uppercase', pointerEvents: 'none', whiteSpace: 'nowrap',
                animation: 'mj-hint 2.2s ease-in-out infinite',
              }}>
                {isMobile ? 'swipe to open' : 'click corner to flip'}
              </div>
            )}
          </div>
 
          {/* Nav */}
          <nav style={{
            display: 'flex', alignItems: 'center', gap: 'clamp(16px,3.5vw,28px)',
            marginTop: 'clamp(12px,2vh,20px)',
          }}>
            <button onClick={flipPrev} style={{
              width: 'clamp(34px,6vw,44px)', height: 'clamp(34px,6vw,44px)', background: 'rgba(198,169,126,.05)',
              border: '1px solid rgba(198,169,126,.25)', borderRadius: '50%', color: '#C6A97E',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: currentPage === 0 ? .25 : 1, transition: 'all .25s',
              backdropFilter: 'blur(8px)',
            }}
              onMouseEnter={e => { if (currentPage !== 0) e.currentTarget.style.background = 'rgba(198,169,126,.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(198,169,126,.05)'; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <div style={{
              fontFamily: "'Playfair Display',serif", fontSize: 'clamp(10px,1.8vw,12px)',
              color: 'rgba(198,169,126,.7)', letterSpacing: '4px', minWidth: '70px',
              textAlign: 'center', textTransform: 'uppercase',
            }}>
              {pageLabel}
            </div>
            <button onClick={flipNext} style={{
              width: 'clamp(34px,6vw,44px)', height: 'clamp(34px,6vw,44px)', background: 'rgba(198,169,126,.05)',
              border: '1px solid rgba(198,169,126,.25)', borderRadius: '50%', color: '#C6A97E',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: currentPage >= totalPages - 2 ? .25 : 1, transition: 'all .25s',
              backdropFilter: 'blur(8px)',
            }}
              onMouseEnter={e => { if (currentPage < totalPages - 2) e.currentTarget.style.background = 'rgba(198,169,126,.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(198,169,126,.05)'; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </nav>
        </div>
 
        {/* ══════════════════════════════════════════════════════ */}
        {/* CASSETTE PHASE (UNCHANGED)                            */}
        {/* ══════════════════════════════════════════════════════ */}
        <div style={{
          position: 'fixed', inset: 0, zIndex: phase === 'cassette' ? 50 : 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'clamp(12px,2.5vh,24px)',
          background: 'radial-gradient(ellipse at 50% 45%,#F5EFE7,#E8DDD0)',
          opacity: phase === 'cassette' ? 1 : 0, pointerEvents: phase === 'cassette' ? 'auto' : 'none',
          transition: 'opacity .8s ease',
        }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(14px,2.5vw,20px)', color: '#4a3f30', letterSpacing: '.04em' }}>One Last Surprise</div>
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
              <text x="110" y="52" fontFamily="'Playfair Display',serif" fontSize="10" fill="#b89a6e" textAnchor="middle" letterSpacing="3">MEMORIES</text>
              <text x="110" y="64" fontFamily="serif" fontSize="6" fill="#a88d66" textAnchor="middle" letterSpacing="2">WITH LOVE</text>
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
        {/* FEEDBACK PHASE (UNCHANGED)                            */}
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
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(14px,2.5vw,18px)', color: '#3c3326', textAlign: 'center', marginBottom: '4px' }}>How Did We Do?</div>
              <div style={{ color: '#a88d66', fontSize: 'clamp(8px,1.4vw,10px)', textAlign: 'center', marginBottom: '12px', letterSpacing: '.1em' }}>Your voice means everything</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '10px' }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <span key={n} onClick={() => setRating(n)} style={{
                    fontSize: '1.3rem', cursor: 'pointer', color: n <= rating ? '#C6A97E' : 'rgba(60,51,38,.08)', transition: 'all .12s',
                  }}>&#9733;</span>
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
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(14px,2.5vw,18px)', color: '#b89a6e', marginBottom: '4px' }}>Thank You</div>
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
            <div style={{ textAlign: 'center', marginTop: '3px', fontFamily: "'Playfair Display',serif", fontSize: '.4rem', letterSpacing: '.3em', color: '#5e4e38', textTransform: 'uppercase' }}>Memória</div>
            <div style={{ position: 'absolute', bottom: '-8px', right: '12px', width: '4px', height: '4px', borderRadius: '50%', background: tvLed ? '#2eff5e' : '#2a251e', boxShadow: tvLed ? '0 0 6px #2eff5e' : 'none', transition: 'all .3s' }} />
            <div onClick={closeTV} style={{ position: 'absolute', top: '-8px', right: '-8px', width: '22px', height: '22px', borderRadius: '50%', background: '#3c3326', border: '1px solid #C6A97E', color: '#C6A97E', fontSize: '.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              &#10005;
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
