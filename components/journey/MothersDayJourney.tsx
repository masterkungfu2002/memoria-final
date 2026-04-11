'use client';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { Album, AlbumPhoto } from '@/lib/types';
 
/*
  Architecture: Leaf-based flipbook (proven working from album-flip.html)
  
  Each "leaf" = 1 physical page that flips from right → left
  - leaf.front = right-side content (visible before flip)
  - leaf.back  = left-side content (visible after flip)
  
  Leaf 0: front=COVER,        back=caption[0]
  Leaf 1: front=photo[0],     back=caption[1]
  Leaf 2: front=photo[1],     back=caption[2]
  ...
  Leaf N: front=photo[N-1],   back=BACK_COVER
  
  When you flip leaf 0: cover goes left, revealing photo[0] on right + caption[0] on left
*/
 
/* ═══ Helper ═══ */
function resolveUrl(url: string): string {
  if (!url) return '';
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return m ? `https://drive.google.com/uc?export=view&id=${m[1]}` : url;
}
function isYT(u: string) { return /youtu\.?be/.test(u); }
function ytId(u: string) { return u.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1] || ''; }
 
/* Get caption text — try every possible field name */
function getCaptionText(photo: any): string {
  return photo?.caption || photo?.description || photo?.text || photo?.message || photo?.content || 'A cherished memory';
}
function getCaptionTitle(photo: any): string {
  return photo?.title || photo?.name || photo?.heading || '';
}
 
/* ═══ Audio ═══ */
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
 
/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════ */
export function MothersDayJourney({ album }: { album: Album }) {
  const photos = album.photos || [];
  const videoUrl = album.video_url || '';
  const recipient = album.recipient_name || 'Mom';
  const year = new Date(album.created_at).getFullYear().toString();
 
  const imageUrls = useMemo(() => photos.map(p => resolveUrl(p.url || '')), [photos]);
  const numLeaves = photos.length + 1; // +1 for cover leaf
 
  const [loaded, setLoaded] = useState(false);
  const [loadPct, setLoadPct] = useState(0);
  const [spread, setSpread] = useState(0); // which leaf we're "on" (0 = cover showing)
  const [animating, setAnimating] = useState(false);
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
 
  const vRef = useRef<HTMLVideoElement>(null);
  const iRef = useRef<HTMLIFrameElement>(null);
  const txRef = useRef(0);
 
  /* ═══ Preload ═══ */
  useEffect(() => {
    const urls = imageUrls.filter(Boolean);
    if (!urls.length) { setLoadPct(100); setLoaded(true); return; }
    let done = 0;
    Promise.all(urls.map(u => new Promise<void>(r => {
      const img = new Image();
      img.onload = img.onerror = () => { done++; setLoadPct(Math.round((done / urls.length) * 100)); r(); };
      img.src = u;
    }))).then(() => setTimeout(() => setLoaded(true), 300));
  }, [imageUrls]);
 
  /* ═══ Audio init ═══ */
  useEffect(() => {
    const h = () => { initAudio(); document.removeEventListener('click', h); document.removeEventListener('touchstart', h); };
    document.addEventListener('click', h); document.addEventListener('touchstart', h);
    return () => { document.removeEventListener('click', h); document.removeEventListener('touchstart', h); };
  }, []);
 
  /* ═══ Music ═══ */
  useEffect(() => {
    const mu = (album as any).background_music_url;
    if (!mu) return;
    const a = new Audio(mu); a.loop = true; a.volume = 0.2;
    const p = () => { a.play().catch(() => {}); document.removeEventListener('click', p); document.removeEventListener('touchstart', p); };
    document.addEventListener('click', p); document.addEventListener('touchstart', p);
    return () => { a.pause(); a.src = ''; document.removeEventListener('click', p); document.removeEventListener('touchstart', p); };
  }, [album]);
 
  /* ═══ Navigate ═══ */
  const goTo = useCallback((target: number) => {
    if (animating) return;
    const t = Math.max(0, Math.min(numLeaves, target));
    if (t === spread) return;
    setAnimating(true);
    playFlip();
    setSpread(t);
    setTimeout(() => {
      setAnimating(false);
      // Auto-transition to cassette/feedback when reaching the end
      if (t === numLeaves) {
        setTimeout(() => setPhase(videoUrl ? 'cassette' : 'feedback'), 600);
      }
    }, 950);
  }, [animating, spread, numLeaves]);
 
  /* ═══ Keyboard ═══ */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goTo(spread + 1);
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goTo(spread - 1);
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [goTo, spread]);
 
  /* ═══ Touch swipe ═══ */
  const onTS = (e: React.TouchEvent) => { txRef.current = e.touches[0].clientX; };
  const onTE = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - txRef.current;
    if (Math.abs(dx) > 48) goTo(spread + (dx < 0 ? 1 : -1));
  };
 
  /* ═══ Book click ═══ */
  const onBookClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x > rect.width / 2) goTo(spread + 1);
    else goTo(spread - 1);
  };
 
  /* ═══ TV ═══ */
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
 
  /* ═══ Feedback ═══ */
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
 
  /* ═══ Z-index for leaves ═══ */
  const getLeafZ = (i: number) => {
    if (i < spread) return i + 1;           // flipped leaves: most recent on top
    return numLeaves * 2 - i;               // unflipped: current on top
  };
 
  /* ═══ Page indicator ═══ */
  const pageText = spread === 0 ? 'Cover' : spread === numLeaves ? 'End' : `${spread} / ${photos.length}`;
 
  /* ═════════════════════════════════════
     INLINE STYLES (no CSS class conflicts!)
     ═════════════════════════════════════ */
 
  return (
    <>
      {/* ── Global styles (only layout, not caption content) ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400;1,500&family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap');
        .mj-root *{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
        .mj-leaf{
          position:absolute;top:0;left:var(--pw);
          width:var(--pw);height:var(--ph);
          transform-origin:left center;
          transform-style:preserve-3d;
          transition:transform .9s cubic-bezier(.77,0,.175,1);
          will-change:transform;cursor:pointer;
        }
        .mj-leaf.flipped{transform:rotateY(-180deg)}
        .mj-lf,.mj-lb{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;overflow:hidden}
        .mj-lb{transform:rotateY(180deg)}
        .mj-lf::before{content:'';position:absolute;left:0;top:0;width:18px;height:100%;background:linear-gradient(to right,rgba(0,0,0,.1),transparent);z-index:1;pointer-events:none}
        .mj-lb::after{content:'';position:absolute;right:0;top:0;width:18px;height:100%;background:linear-gradient(to left,rgba(0,0,0,.1),transparent);z-index:1;pointer-events:none}
        .mj-lf{border-radius:0 3px 3px 0}
        .mj-lb{border-radius:3px 0 0 3px}
        @media(orientation:portrait){.mj-rotate{display:flex!important}.mj-main{display:none!important}}
        @keyframes mj-hint{0%,100%{opacity:.2}50%{opacity:.7}}
        @keyframes mj-spin{to{transform:rotate(360deg)}}
        @keyframes mj-eject{0%{transform:translateY(0) scale(1);opacity:1}30%{transform:translateY(-12px) scale(1.03)}100%{transform:translateY(40px) scale(.5);opacity:0}}
        @keyframes mj-fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
      `}} />
 
      {/* ── Rotate notice ── */}
      <div className="mj-rotate" style={{ display:'none',position:'fixed',inset:0,zIndex:99999,background:'#F0E8DA',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'16px',fontFamily:"'Playfair Display',serif",color:'#8B7355',textAlign:'center' }}>
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#8B7355" strokeWidth="1.5" strokeLinecap="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M12 18h.01"/></svg>
        <p style={{ fontSize:'1rem',lineHeight:1.5,color:'#4a3f30' }}>Please rotate your phone<br/>to landscape mode</p>
        <span style={{ fontSize:'.6rem',letterSpacing:'.3em',opacity:.5 }}>FOR THE BEST EXPERIENCE</span>
      </div>
 
      {/* ── Hidden preload ── */}
      <div style={{ position:'fixed',left:'-9999px',top:'-9999px',width:'1px',height:'1px',overflow:'hidden',opacity:0,pointerEvents:'none',visibility:'hidden' as any }} aria-hidden="true">
        {imageUrls.map((u, i) => u ? <img key={i} src={u} alt="" /> : null)}
      </div>
 
      <div className="mj-main mj-root" style={{ position:'fixed',inset:0,userSelect:'none',WebkitUserSelect:'none',fontFamily:"'Cormorant Garamond',serif",background:'#F0E8DA',color:'#2e2a24',overflow:'hidden' }}>
 
        {/* ── Loading ── */}
        <div style={{
          position:'fixed',inset:0,zIndex:999,background:'#F0E8DA',
          display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'14px',
          transition:'opacity .6s,visibility .6s',
          opacity:loaded?0:1,visibility:loaded?'hidden':'visible',pointerEvents:loaded?'none':'auto',
        }}>
          <div style={{ width:'40px',height:'40px',border:'1.5px solid rgba(139,115,85,.15)',borderTopColor:'#8B7355',borderRadius:'50%',animation:'mj-spin .9s linear infinite' }} />
          <div style={{ fontFamily:"'Playfair Display',serif",fontSize:'1.5rem',color:'#8B7355',fontWeight:300,letterSpacing:'.1em' }}>{loadPct}%</div>
          <div style={{ fontSize:'.55rem',letterSpacing:'.3em',textTransform:'uppercase',color:'rgba(139,115,85,.4)' }}>Preparing your memories</div>
        </div>
 
        {/* ── Scene ── */}
        <div style={{
          position:'fixed',inset:0,display:'flex',flexDirection:'column',
          alignItems:'center',justifyContent:'center',
          gap:'clamp(12px,2.5vh,28px)',
          background:'radial-gradient(ellipse 80% 60% at 50% 55%,#F5EFE7,#E8DDD0)',
        }} onTouchStart={onTS} onTouchEnd={onTE}>
 
          {/* Book wrapper */}
          <div style={{ position:'relative',perspective:'clamp(800px,250vw,3000px)',opacity:phase==='book'?1:0,transition:'opacity .6s',pointerEvents:phase==='book'?'auto':'none' }}>
            <div onClick={onBookClick} style={{
              position:'relative',
              width:'calc(var(--pw) * 2)',height:'var(--ph)',
              transformStyle:'preserve-3d',
              // @ts-ignore
              '--pw':'clamp(130px,30vw,340px)','--ph':'clamp(190px,45vw,460px)',
            } as any}>
 
              {/* Book halves (paper stack background) */}
              <div style={{ position:'absolute',top:0,left:0,width:'var(--pw)',height:'var(--ph)',background:'linear-gradient(to right,#E8DDD0,#F5EFE7 6%)',borderRadius:'3px 0 0 3px',boxShadow:'-6px 0 28px -4px rgba(0,0,0,.55),-2px 0 8px rgba(0,0,0,.3)',pointerEvents:'none' }}>
                <div style={{ position:'absolute',right:0,top:0,width:'20px',height:'100%',background:'linear-gradient(to right,transparent,rgba(0,0,0,.08))' }} />
              </div>
              <div style={{ position:'absolute',top:0,right:0,width:'var(--pw)',height:'var(--ph)',background:'linear-gradient(to left,#E8DDD0,#F5EFE7 6%)',borderRadius:'0 3px 3px 0',boxShadow:'6px 0 28px -4px rgba(0,0,0,.55),2px 0 8px rgba(0,0,0,.3)',pointerEvents:'none' }}>
                <div style={{ position:'absolute',left:0,top:0,width:'20px',height:'100%',background:'linear-gradient(to left,transparent,rgba(0,0,0,.08))' }} />
              </div>
 
              {/* Spine */}
              <div style={{ position:'absolute',left:'50%',top:0,transform:'translateX(-50%)',width:'6px',height:'100%',background:'linear-gradient(to right,#7a6040,#c9a97a 35%,#c9a97a 65%,#7a6040)',zIndex:200,boxShadow:'0 0 12px rgba(0,0,0,.4)' }} />
 
              {/* ═══ LEAVES ═══ */}
              {Array.from({ length: numLeaves }, (_, i) => {
                const isFlipped = i < spread;
                const zIdx = animating && ((spread > 0 && i === spread - 1) || i === spread)
                  ? numLeaves * 10
                  : getLeafZ(i);
 
                return (
                  <div key={i} className={`mj-leaf ${isFlipped ? 'flipped' : ''}`} style={{ zIndex: zIdx }}>
                    {/* FRONT (right page) */}
                    <div className="mj-lf">
                      {i === 0 ? (
                        /* ── COVER ── */
                        <div style={{
                          width:'100%',height:'100%',background:'#0B0B0B',
                          display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                          padding:'clamp(24px,5vw,48px)',textAlign:'center',position:'relative',overflow:'hidden',
                        }}>
                          <div style={{ position:'absolute',inset:'12px',border:'1px solid rgba(158,126,86,.3)',pointerEvents:'none' }} />
                          <div style={{ position:'absolute',inset:'16px',border:'1px solid rgba(158,126,86,.12)',pointerEvents:'none' }} />
                          <div style={{ fontSize:'clamp(9px,1.8vw,12px)',color:'#C6A97E',letterSpacing:'8px',marginBottom:'clamp(12px,2.5vw,20px)',opacity:.6 }}>
                            &#10022; &nbsp; &#10022; &nbsp; &#10022;
                          </div>
                          <div style={{ fontFamily:"'Playfair Display',serif",fontSize:'clamp(16px,3.5vw,26px)',fontWeight:400,color:'#F5EFE7',lineHeight:1.45,marginBottom:'8px' }}>
                            For the Most Wonderful<br/><span style={{ color:'#C6A97E',fontStyle:'italic' }}>{recipient}</span>
                          </div>
                          <div style={{ width:'28px',height:'1px',background:'#C6A97E',opacity:.5,margin:'clamp(12px,2.5vw,18px) auto' }} />
                          <div style={{ fontSize:'clamp(8px,1.5vw,10px)',fontWeight:300,color:'#D4BA94',letterSpacing:'4px',textTransform:'uppercase' }}>
                            Album of Memories
                          </div>
                          <div style={{ fontSize:'clamp(8px,1.4vw,10px)',color:'#9E7E56',letterSpacing:'3px',fontStyle:'italic',opacity:.7,marginTop:'clamp(12px,2.5vw,18px)' }}>
                            Memoraa &middot; {year}
                          </div>
                        </div>
                      ) : (
                        /* ── PHOTO PAGE ── */
                        <div style={{ width:'100%',height:'100%',background:'#111',position:'relative' }}>
                          <img src={imageUrls[i - 1] || ''} alt="" style={{ width:'100%',height:'100%',objectFit:'contain',display:'block',background:'#111' }} />
                          <div style={{ position:'absolute',bottom:0,left:0,right:0,height:'25%',pointerEvents:'none',background:'linear-gradient(to top,rgba(0,0,0,.3),transparent)' }} />
                          <div style={{ position:'absolute',bottom:'clamp(8px,1.5vw,14px)',right:'clamp(10px,2vw,16px)',fontSize:'clamp(8px,1.4vw,10px)',color:'rgba(255,255,255,.4)',letterSpacing:'3px' }}>
                            {String(i).padStart(2, '0')}
                          </div>
                        </div>
                      )}
                    </div>
 
                    {/* BACK (left page after flip) */}
                    <div className="mj-lb">
                      {i < photos.length ? (
                        /* ── CAPTION PAGE — 100% inline styles ── */
                        <div style={{
                          width:'100%',height:'100%',
                          background:'#F5EFE7',
                          display:'flex',flexDirection:'column',
                          justifyContent:'center',
                          padding:'clamp(24px,5vw,48px) clamp(20px,4vw,40px)',
                          position:'relative',
                          fontFamily:"'Cormorant Garamond','Georgia',serif",
                        }}>
                          {/* Left accent line */}
                          <div style={{
                            position:'absolute',
                            left:'clamp(14px,3vw,24px)',top:'clamp(14px,3vw,24px)',
                            bottom:'clamp(14px,3vw,24px)',width:'1px',
                            background:'linear-gradient(to bottom,transparent,#C6A97E,transparent)',
                            opacity:.35,
                          }} />
 
                          {/* Big number */}
                          <div style={{
                            fontFamily:"'Playfair Display',serif",
                            fontSize:'clamp(36px,8vw,60px)',fontWeight:400,
                            color:'#C6A97E',opacity:.1,lineHeight:1,marginBottom:'-6px',
                          }}>
                            {String(i + 1).padStart(2, '0')}
                          </div>
 
                          {/* Title (if available) */}
                          {getCaptionTitle(photos[i]) && (
                            <div style={{
                              fontFamily:"'Playfair Display',serif",
                              fontSize:'clamp(13px,2.5vw,18px)',fontWeight:600,
                              color:'#0B0B0B',lineHeight:1.5,
                              marginBottom:'clamp(8px,2vw,14px)',
                            }}>
                              {getCaptionTitle(photos[i])}
                            </div>
                          )}
 
                          {/* Rule */}
                          <div style={{ width:'32px',height:'1px',background:'#C6A97E',opacity:.45,marginBottom:'clamp(8px,2vw,14px)' }} />
 
                          {/* Caption text */}
                          <div style={{
                            fontSize:'clamp(11px,2.2vw,14.5px)',
                            fontStyle:'italic',fontWeight:400,
                            color:'#4a3f30',lineHeight:1.9,
                            marginBottom:'clamp(8px,2vw,14px)',
                            overflowY:'auto',maxHeight:'60%',
                          }}>
                            {getCaptionText(photos[i])}
                          </div>
 
                          {/* Rule */}
                          <div style={{ width:'32px',height:'1px',background:'#C6A97E',opacity:.45,marginBottom:'clamp(8px,2vw,14px)' }} />
 
                          {/* Year */}
                          <div style={{
                            fontSize:'clamp(7px,1.3vw,9px)',
                            letterSpacing:'3px',textTransform:'uppercase',
                            color:'#9E7E56',opacity:.6,
                          }}>
                            {year}
                          </div>
                        </div>
                      ) : (
                        /* ── BACK COVER ── */
                        <div style={{ width:'100%',height:'100%',background:'#0B0B0B',display:'flex',alignItems:'center',justifyContent:'center' }}>
                          <div style={{ fontSize:'clamp(8px,1.5vw,10px)',color:'#C6A97E',letterSpacing:'6px',textTransform:'uppercase',opacity:.35 }}>
                            Memoraa
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
 
            {/* Flip hint */}
            {spread === 0 && (
              <div style={{
                position:'absolute',bottom:'clamp(6px,1.5vw,12px)',left:'50%',transform:'translateX(-50%)',
                fontSize:'clamp(7px,1.3vw,9px)',color:'rgba(74,63,48,.35)',letterSpacing:'3px',textTransform:'uppercase',
                pointerEvents:'none',whiteSpace:'nowrap',animation:'mj-hint 2.2s ease-in-out infinite',
              }}>
                tap to flip
              </div>
            )}
          </div>
 
          {/* ── Navigation ── */}
          <nav style={{ display:'flex',alignItems:'center',gap:'clamp(14px,3.5vw,28px)',opacity:phase==='book'?1:0,transition:'opacity .5s' }}>
            <button disabled={spread === 0 || animating} onClick={() => goTo(spread - 1)} style={{
              width:'clamp(32px,6vw,42px)',height:'clamp(32px,6vw,42px)',background:'none',
              border:'1px solid rgba(139,115,85,.25)',borderRadius:'50%',color:'#8B7355',
              cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',
              opacity:spread === 0 ? .15 : 1,transition:'all .2s',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
 
            <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:'clamp(9px,1.8vw,12px)',color:'#8B7355',letterSpacing:'3px',opacity:.5,minWidth:'60px',textAlign:'center' }}>
              {pageText}
            </div>
 
            <button disabled={spread === numLeaves || animating} onClick={() => goTo(spread + 1)} style={{
              width:'clamp(32px,6vw,42px)',height:'clamp(32px,6vw,42px)',background:'none',
              border:'1px solid rgba(139,115,85,.25)',borderRadius:'50%',color:'#8B7355',
              cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',
              opacity:spread === numLeaves ? .15 : 1,transition:'all .2s',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </nav>
        </div>
 
        {/* ═══ CASSETTE SCREEN ═══ */}
        <div style={{
          position:'fixed',inset:0,zIndex:phase==='cassette'?50:0,
          display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'clamp(12px,2.5vh,24px)',
          background:'radial-gradient(ellipse at 50% 45%,#F5EFE7,#E8DDD0)',
          opacity:phase==='cassette'?1:0,pointerEvents:phase==='cassette'?'auto':'none',
          transition:'opacity .8s ease',
        }}>
          <div style={{ fontFamily:"'Playfair Display',serif",fontSize:'clamp(14px,2.5vw,20px)',color:'#4a3f30',letterSpacing:'.04em' }}>One Last Surprise</div>
          <div style={{ fontSize:'clamp(8px,1.4vw,10px)',letterSpacing:'.25em',color:'rgba(139,115,85,.5)',textTransform:'uppercase' }}>press play to watch</div>
          
          {/* Cassette tape SVG */}
          <div onClick={openTV} style={{
            cursor:'pointer',transition:'transform .3s',
            animation:cassetteEject?'mj-eject .6s forwards':'none',
          }}
          onMouseEnter={e=>(e.currentTarget.style.transform='scale(1.03) translateY(-3px)')}
          onMouseLeave={e=>(e.currentTarget.style.transform='scale(1)')}>
            <svg width="220" height="130" viewBox="0 0 220 130" fill="none">
              <rect x="6" y="12" width="208" height="106" rx="10" fill="#e9dbc9" stroke="#b89a6e" strokeWidth=".8"/>
              <rect x="14" y="20" width="192" height="86" rx="7" fill="#fef7ef"/>
              <rect x="24" y="28" width="172" height="46" rx="5" fill="#f4ede3" stroke="#d4c2a8" strokeWidth=".6"/>
              <text x="110" y="52" fontFamily="'Playfair Display',serif" fontSize="10" fill="#b89a6e" textAnchor="middle" letterSpacing="3">MEMORIES</text>
              <text x="110" y="64" fontFamily="serif" fontSize="6" fill="#a88d66" textAnchor="middle" letterSpacing="2">WITH LOVE</text>
              <rect x="30" y="84" width="60" height="18" rx="3" fill="#e9dbc9" stroke="#b89a6e" strokeWidth=".5"/>
              <rect x="130" y="84" width="60" height="18" rx="3" fill="#e9dbc9" stroke="#b89a6e" strokeWidth=".5"/>
              <circle cx="60" cy="93" r="7" fill="#f4ede3" stroke="#b89a6e" strokeWidth=".4"/><circle cx="60" cy="93" r="2.5" fill="#b89a6e"/>
              <circle cx="160" cy="93" r="7" fill="#f4ede3" stroke="#b89a6e" strokeWidth=".4"/><circle cx="160" cy="93" r="2.5" fill="#b89a6e"/>
            </svg>
          </div>
          
          <div onClick={() => setPhase('feedback')} style={{
            fontSize:'clamp(7px,1.2vw,9px)',color:'rgba(74,63,48,.2)',textTransform:'uppercase',letterSpacing:'.2em',cursor:'pointer',
          }}>Skip</div>
        </div>
 
        {/* ═══ FEEDBACK SCREEN ═══ */}
        <div style={{
          position:'fixed',inset:0,zIndex:phase==='feedback'?50:0,
          display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
          background:'radial-gradient(ellipse at 50% 30%,#F5EFE7,#E8DDD0)',
          opacity:phase==='feedback'?1:0,pointerEvents:phase==='feedback'?'auto':'none',
          transition:'opacity .8s ease',
        }}>
          <div style={{
            background:'rgba(255,252,245,.7)',backdropFilter:'blur(8px)',
            border:'1px solid rgba(184,154,110,.18)',borderRadius:'18px',
            padding:'clamp(16px,3vw,28px)',maxWidth:'340px',width:'90%',
            boxShadow:'0 12px 28px -6px rgba(0,0,0,.06)',
            animation:'mj-fadeIn .8s ease',
          }}>
            {!fbSent ? (<>
              <div style={{ fontFamily:"'Playfair Display',serif",fontSize:'clamp(14px,2.5vw,18px)',color:'#3c3326',textAlign:'center',marginBottom:'4px' }}>How Did We Do?</div>
              <div style={{ color:'#a88d66',fontSize:'clamp(8px,1.4vw,10px)',textAlign:'center',marginBottom:'12px',letterSpacing:'.1em' }}>Your voice means everything</div>
              <div style={{ display:'flex',justifyContent:'center',gap:'6px',marginBottom:'10px' }}>
                {[1,2,3,4,5].map(n => (
                  <span key={n} onClick={() => setRating(n)} style={{
                    fontSize:'1.3rem',cursor:'pointer',color:n <= rating ? '#C6A97E' : 'rgba(60,51,38,.08)',transition:'all .12s',
                  }}>&#9733;</span>
                ))}
              </div>
              <input placeholder="Your name (optional)" value={fbName} onChange={e => setFbName(e.target.value)} style={{
                width:'100%',padding:'7px 10px',background:'rgba(255,255,255,.4)',border:'1px solid rgba(184,154,110,.25)',
                borderRadius:'10px',fontSize:'.7rem',marginBottom:'6px',outline:'none',fontFamily:'inherit',color:'#2e2a24',
              }} />
              <textarea placeholder="Leave a message of love..." value={fbComment} onChange={e => setFbComment(e.target.value)} style={{
                width:'100%',padding:'7px 10px',background:'rgba(255,255,255,.4)',border:'1px solid rgba(184,154,110,.25)',
                borderRadius:'10px',fontSize:'.7rem',marginBottom:'8px',outline:'none',fontFamily:'inherit',color:'#2e2a24',resize:'none',height:'55px',
              }} />
              <button disabled={fbLoading} onClick={submitFb} style={{
                width:'100%',padding:'7px',background:'linear-gradient(135deg,#b89a6e,#C6A97E)',border:'none',
                borderRadius:'24px',color:'#2e2a24',fontWeight:600,fontSize:'.7rem',cursor:'pointer',fontFamily:'inherit',
                opacity:fbLoading?.35:1,
              }}>{fbLoading ? 'Sending...' : 'Send Love'}</button>
            </>) : (
              <div style={{ textAlign:'center',animation:'mj-fadeIn .6s ease' }}>
                <div style={{ fontFamily:"'Playfair Display',serif",fontSize:'clamp(14px,2.5vw,18px)',color:'#b89a6e',marginBottom:'4px' }}>Thank You</div>
                <div style={{ color:'#6b5a48',fontSize:'.65rem' }}>Your message has been received with love.</div>
              </div>
            )}
          </div>
        </div>
 
        {/* ── TV Modal (smaller) ── */}
        <div style={{
          position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,.92)',
          display:'flex',alignItems:'center',justifyContent:'center',
          opacity:showTV?1:0,pointerEvents:showTV?'auto':'none',transition:'opacity .4s',
        }}>
          <div style={{ position:'relative',width:'min(65vw,380px)',background:'#2a251e',borderRadius:'14px 14px 20px 20px',padding:'10px 12px 22px',boxShadow:'0 16px 32px rgba(0,0,0,.5),0 0 0 1.5px #5e4e38' }}>
            <div style={{ background:'#0f0e0a',borderRadius:'8px',padding:'4px' }}>
              <div style={{ position:'relative',borderRadius:'6px',overflow:'hidden',aspectRatio:'16/9',background:'#000' }}>
                <div style={{ position:'absolute',inset:0,background:'#555',transition:'opacity .5s',zIndex:5,opacity:tvStatic?1:0 }} />
                <video ref={vRef} style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'contain',zIndex:2 }} playsInline controls onEnded={closeTV} />
                <iframe ref={iRef} style={{ position:'absolute',inset:0,width:'100%',height:'100%',zIndex:2,border:'none',display:'none' }} allow="autoplay" title="Video" />
              </div>
            </div>
            <div style={{ display:'flex',justifyContent:'center',gap:'6px',marginTop:'4px' }}>
              <div style={{ width:'12px',height:'12px',borderRadius:'50%',background:'radial-gradient(circle at 35% 30%,#6b5a48,#4a3e30)',boxShadow:'0 1px 2px rgba(0,0,0,.4)' }} />
              <div style={{ width:'12px',height:'12px',borderRadius:'50%',background:'radial-gradient(circle at 35% 30%,#6b5a48,#4a3e30)',boxShadow:'0 1px 2px rgba(0,0,0,.4)' }} />
            </div>
            <div style={{ textAlign:'center',marginTop:'3px',fontFamily:"'Playfair Display',serif",fontSize:'.4rem',letterSpacing:'.3em',color:'#5e4e38',textTransform:'uppercase' }}>Memória</div>
            <div style={{ position:'absolute',bottom:'-8px',right:'12px',width:'4px',height:'4px',borderRadius:'50%',background:tvLed?'#2eff5e':'#2a251e',boxShadow:tvLed?'0 0 6px #2eff5e':'none',transition:'all .3s' }} />
            <div onClick={closeTV} style={{ position:'absolute',top:'-8px',right:'-8px',width:'22px',height:'22px',borderRadius:'50%',background:'#3c3326',border:'1px solid #C6A97E',color:'#C6A97E',fontSize:'.65rem',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>
              &#10005;
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
