'use client';
import { useEffect, useRef, useState, useCallback, CSSProperties, ReactNode } from 'react';

/* ═══════════════════════════════════════════════════════════════
   CASSETTE + WOODEN TV SCENE — self-contained
   Port from Memora design zip (scene_cassette.jsx + textures.jsx)
   Flow: cassette spins → tap → flies into TV slot → video plays
   ═══════════════════════════════════════════════════════════════ */

function isYT(u: string) { return /youtu\.?be/.test(u); }
function ytId(u: string) { return u.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1] || ''; }
function resolveUrl(url: string): string {
  if (!url) return '';
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return m ? `https://drive.google.com/uc?export=view&id=${m[1]}` : url;
}

/* ─── Ambient gold dust particles ─── */
const AmbientDust = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    const parts = Array.from({ length: 40 }).map(() => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vy: .05 + Math.random() * .15,
      vx: (Math.random() - .5) * .08,
      r: .3 + Math.random() * .9,
      a: .2 + Math.random() * .35,
    }));
    let raf = 0;
    const tick = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      parts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.y > c.height + 5) { p.y = -5; p.x = Math.random() * c.width; }
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
        g.addColorStop(0, `rgba(184,137,58,${p.a})`);
        g.addColorStop(1, 'rgba(184,137,58,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2); ctx.fill();
      });
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', mixBlendMode: 'multiply', opacity: .6 }} />;
};

/* ─── Walnut wood panel ─── */
type WoodVariant = 'face' | 'lid' | 'dark' | 'warm';
const WoodPanel = ({ grainSeed = 3, variant = 'face', radius = 4, style = {}, children }: {
  grainSeed?: number; variant?: WoodVariant; radius?: number; style?: CSSProperties; children?: ReactNode;
}) => {
  const base: Record<WoodVariant, string> = {
    face: 'linear-gradient(170deg, #6a3d20 0%, #4a2a18 40%, #2a170e 100%)',
    lid:  'linear-gradient(160deg, #7a4628 0%, #4d2a15 55%, #2a1508 100%)',
    dark: 'linear-gradient(180deg, #2a170e 0%, #150a05 100%)',
    warm: 'linear-gradient(160deg, #8a5a30 0%, #5c3620 60%, #2e1a0e 100%)',
  };
  return (
    <div style={{ position: 'relative', background: base[variant], borderRadius: radius, overflow: 'hidden', ...style }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `repeating-linear-gradient(91deg,
          transparent 0px, rgba(10,5,3,.38) 1px, transparent 2px, transparent 5px,
          rgba(20,10,5,.22) 6px, transparent 8px, transparent 14px,
          rgba(60,35,20,.1) 15px, transparent 22px)`,
        mixBlendMode: 'multiply', opacity: .9,
      }} />
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: .55, mixBlendMode: 'multiply' }} preserveAspectRatio="none">
        <filter id={`wv${grainSeed}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.003 0.8" numOctaves="3" seed={grainSeed} />
          <feColorMatrix values="0 0 0 0 0.04 0 0 0 0 0.02 0 0 0 0 0.01 0 0 0 1.1 -0.15" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#wv${grainSeed})`} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 30% 20%, rgba(220,150,80,.15) 0%, transparent 55%)', pointerEvents: 'none' }} />
      {children}
    </div>
  );
};

const Gold = ({ children, style = {} }: { children: ReactNode; style?: CSSProperties }) => (
  <span style={{
    background: 'linear-gradient(180deg, #e8c478 0%, #b8893a 50%, #7a5a26 100%)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
    filter: 'drop-shadow(0 1px 0 rgba(0,0,0,.35))',
    ...style,
  }}>{children}</span>
);

/* ─── Spinning reel ─── */
const Reel = ({ spinning }: { spinning: boolean }) => (
  <div style={{ width: '28%', aspectRatio: '1', position: 'relative', animation: spinning ? 'cs-spin 2.2s linear infinite' : 'none' }}>
    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle, #d4c090 0%, #8a7550 50%, #3a2413 100%)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.4)' }} />
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} style={{ position: 'absolute', left: '50%', top: '50%', width: '8%', height: '80%', background: '#2a1810', transform: `translate(-50%,-50%) rotate(${i * 30}deg)`, borderRadius: 2 }} />
    ))}
    <div style={{ position: 'absolute', left: '42%', top: '42%', width: '16%', height: '16%', borderRadius: '50%', background: '#0a0503' }} />
  </div>
);

/* ─── Cassette (reels spin when spinning=true) ─── */
const Cassette = ({ spinning, recipient, year }: { spinning: boolean; recipient: string; year: string }) => (
  <div style={{
    position: 'relative', width: '100%', height: '100%', borderRadius: 6,
    background: 'linear-gradient(180deg, #e8d9b8 0%, #c8b48a 60%, #8a7550 100%)',
    boxShadow: '0 14px 30px rgba(60,30,10,.35), 0 4px 8px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,245,220,.6), inset 0 -3px 8px rgba(0,0,0,.2)',
    overflow: 'hidden',
  }}>
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: .35, mixBlendMode: 'multiply' }}>
      <filter id="cs-noise">
        <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7" />
        <feColorMatrix values="0 0 0 0 .25 0 0 0 0 .2 0 0 0 0 .15 0 0 0 .4 0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#cs-noise)" />
    </svg>
    <div style={{
      position: 'absolute', left: '8%', right: '8%', top: '8%', height: '38%',
      background: 'linear-gradient(180deg, #fcf6e4, #f0e5c8)',
      border: '1px solid rgba(90,60,30,.25)', borderRadius: 2, padding: '6% 6%',
      boxShadow: 'inset 0 1px 2px rgba(90,60,30,.15)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Cinzel', serif", fontSize: 'clamp(7px,.9vw,9px)', letterSpacing: '.3em', color: '#7a5a26' }}>
        <span>SIDE A</span><span>C-60</span>
      </div>
      <div style={{ fontFamily: "'DM Serif Display', serif", fontStyle: 'italic', fontSize: 'clamp(16px,2.8vw,24px)', color: '#3d2416', lineHeight: 1, marginTop: 4 }}>memora</div>
      <div style={{ fontFamily: "'EB Garamond', serif", fontSize: 'clamp(9px,1.1vw,11px)', color: '#5c3620', fontStyle: 'italic', marginTop: 2 }}>for {recipient} — with love</div>
      <div style={{ position: 'absolute', bottom: 6, left: '6%', right: '6%', borderTop: '1px dashed rgba(90,60,30,.3)' }} />
    </div>
    <div style={{
      position: 'absolute', left: '8%', right: '8%', bottom: '10%', height: '38%',
      background: 'linear-gradient(180deg, #2a1810, #0a0503)', borderRadius: 3,
      boxShadow: 'inset 0 2px 6px rgba(0,0,0,.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
    }}>
      <Reel spinning={spinning} />
      <div style={{ width: '20%', height: 4, background: '#5a3620', borderRadius: 2, boxShadow: 'inset 0 1px 2px rgba(0,0,0,.5)' }} />
      <Reel spinning={spinning} />
    </div>
    <div style={{ position: 'absolute', bottom: '4%', left: '12%', width: '8%', height: '3%', background: '#3a2413', borderRadius: 1 }} />
    <div style={{ position: 'absolute', bottom: '4%', right: '12%', width: '8%', height: '3%', background: '#3a2413', borderRadius: 1 }} />
  </div>
);

/* ─── Knob ─── */
const Knob = ({ label }: { label: string }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
    <div style={{
      width: 'clamp(28px, 5vw, 44px)', aspectRatio: '1', borderRadius: '50%',
      background: 'radial-gradient(circle at 30% 30%, #d4b080, #7a5a26 55%, #2a1810 100%)',
      boxShadow: '0 2px 4px rgba(0,0,0,.4), inset 0 1px 2px rgba(255,220,170,.4)',
      position: 'relative',
    }}>
      <div style={{ position: 'absolute', left: '48%', top: '10%', width: '4%', height: '35%', background: '#0a0503', borderRadius: 2 }} />
    </div>
    <div style={{ fontFamily: "'Cinzel', serif", fontSize: 8, letterSpacing: '.3em', color: 'rgba(232,196,120,.65)' }}>{label}</div>
  </div>
);

/* ─── Wooden TV with real video inside screen ─── */
const WoodenTV = ({
  playing, videoUrl, onVideoEnded,
}: {
  playing: boolean; videoUrl: string; onVideoEnded: () => void;
}) => {
  const vRef = useRef<HTMLVideoElement>(null);
  const iRef = useRef<HTMLIFrameElement>(null);
  const youtubeMode = !!videoUrl && isYT(videoUrl);

  useEffect(() => {
    if (!playing || !videoUrl) return;
    if (youtubeMode) {
      const f = iRef.current;
      if (f) { f.src = `https://www.youtube-nocookie.com/embed/${ytId(videoUrl)}?autoplay=1&controls=1&rel=0&playsinline=1`; }
    } else {
      const v = vRef.current;
      if (v) {
        v.src = resolveUrl(videoUrl);
        v.muted = false;
        v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });
      }
    }
  }, [playing, videoUrl, youtubeMode]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <WoodPanel variant="face" grainSeed={6} radius={14} style={{
        position: 'absolute', inset: 0,
        boxShadow: '0 30px 60px rgba(60,30,10,.4), inset 0 0 60px rgba(0,0,0,.4)',
      }}>
        {/* gold inlay */}
        <div style={{ position: 'absolute', inset: 12, border: '1px solid rgba(232,196,120,.55)', borderRadius: 8, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 20, border: '0.5px solid rgba(232,196,120,.3)', borderRadius: 6, pointerEvents: 'none' }} />

        {/* screen bezel */}
        <div style={{
          position: 'absolute', left: '8%', right: '8%', top: '10%', bottom: '30%',
          borderRadius: 20,
          background: 'linear-gradient(180deg, #1a0e08, #0a0503)',
          boxShadow: 'inset 0 3px 8px rgba(0,0,0,.8), inset 0 -2px 6px rgba(80,40,20,.2)',
          padding: '3%',
        }}>
          {/* screen */}
          <div style={{
            position: 'relative', width: '100%', height: '100%', borderRadius: 14,
            background: playing ? '#000' : '#050302',
            overflow: 'hidden', transition: 'background .6s',
          }}>
            {/* Real video — hidden until playing */}
            {playing && videoUrl && !youtubeMode && (
              <video
                ref={vRef}
                playsInline
                controls
                onEnded={onVideoEnded}
                style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%',
                  objectFit: 'contain', zIndex: 2, background: '#000',
                  animation: 'cs-tvOn .8s ease-out',
                }}
              />
            )}
            {playing && videoUrl && youtubeMode && (
              <iframe
                ref={iRef}
                allow="autoplay; encrypted-media; picture-in-picture"
                title="Memora video"
                style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%',
                  border: 'none', zIndex: 2, background: '#000',
                  animation: 'cs-tvOn .8s ease-out',
                }}
              />
            )}

            {/* Warm glow when just turned on (fades) */}
            {playing && (
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3,
                background: 'radial-gradient(ellipse at center, rgba(232,196,120,.2) 0%, transparent 60%)',
                animation: 'cs-glowFade 1.2s ease-out forwards',
              }} />
            )}

            {/* scanlines */}
            <div style={{
              position: 'absolute', inset: 0, zIndex: 4,
              background: 'repeating-linear-gradient(0deg, transparent 0 2px, rgba(0,0,0,.18) 2px 3px)',
              opacity: playing ? .35 : .2, pointerEvents: 'none',
              mixBlendMode: 'multiply',
            }} />
            {/* curvature vignette */}
            <div style={{
              position: 'absolute', inset: 0, zIndex: 4, borderRadius: 14,
              boxShadow: 'inset 0 0 60px rgba(0,0,0,.6), inset 0 0 12px rgba(0,0,0,.5)',
              pointerEvents: 'none',
            }} />
            {/* glass reflection */}
            <div style={{
              position: 'absolute', inset: 0, zIndex: 4,
              background: 'linear-gradient(135deg, rgba(255,240,200,.08) 0%, transparent 40%)',
              pointerEvents: 'none',
            }} />
          </div>
        </div>

        {/* below-screen: knobs + slot */}
        <div style={{
          position: 'absolute', left: '6%', right: '6%', bottom: '6%', height: '18%',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2%',
        }}>
          <Knob label="VOL" />
          <div style={{
            position: 'relative', width: '42%', height: '70%',
            background: 'linear-gradient(180deg, #0a0503, #1a0e08)', borderRadius: 3,
            boxShadow: 'inset 0 3px 8px rgba(0,0,0,.9), 0 1px 0 rgba(230,180,110,.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              fontFamily: "'Cinzel', serif", fontSize: 'clamp(7px,.9vw,9px)', letterSpacing: '.3em',
              color: playing ? '#e8c478' : 'rgba(232,196,120,.4)', transition: 'color .3s',
            }}>◉ PLAYING</div>
          </div>
          <Knob label="TUNE" />
        </div>

        {/* brand plate */}
        <div style={{
          position: 'absolute', left: '50%', top: 'calc(70% - 8px)', transform: 'translateX(-50%)',
          fontFamily: "'Cinzel', serif", fontSize: 'clamp(7px,.9vw,9px)', letterSpacing: '.5em',
        }}><Gold>MEMORA</Gold></div>
      </WoodPanel>
      {/* feet */}
      <div style={{ position: 'absolute', left: '8%', bottom: -8, width: '14%', height: 12, background: '#2a1810', borderRadius: '0 0 4px 4px', boxShadow: '0 2px 6px rgba(0,0,0,.4)' }} />
      <div style={{ position: 'absolute', right: '8%', bottom: -8, width: '14%', height: 12, background: '#2a1810', borderRadius: '0 0 4px 4px', boxShadow: '0 2px 6px rgba(0,0,0,.4)' }} />
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   MAIN EXPORT — CassetteTVScene
   ═══════════════════════════════════════════════════════════════ */
export function CassetteTVScene({
  videoUrl, recipient = 'you', year = new Date().getFullYear().toString(), onEnded,
}: {
  videoUrl: string;
  recipient?: string;
  year?: string;
  onEnded: () => void;
}) {
  const [inserted, setInserted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const endedFiredRef = useRef(false);

  const insert = useCallback(() => {
    if (inserted) return;
    setInserted(true);
    // cassette fly + scale animation runs 1.2s → TV glows on after
    setTimeout(() => setPlaying(true), 1200);
  }, [inserted]);

  const handleVideoEnded = useCallback(() => {
    if (endedFiredRef.current) return;
    endedFiredRef.current = true;
    setTimeout(() => onEnded(), 800);
  }, [onEnded]);

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'var(--memora-cs-bg, #FCF9F2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {/* Keyframes */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600&family=DM+Serif+Display&family=EB+Garamond:ital,wght@0,400;1,400&display=swap');
        @keyframes cs-spin { to { transform: rotate(360deg); } }
        @keyframes cs-tvOn {
          0% { opacity: 0; filter: brightness(2.5) blur(4px); transform: scale(1.06); }
          60% { opacity: 1; filter: brightness(1.2) blur(0); transform: scale(1); }
          100% { opacity: 1; filter: brightness(1) blur(0); transform: scale(1); }
        }
        @keyframes cs-glowFade {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes cs-fadeInSurprise {
          from { opacity: 0; transform: translate(-50%, -12px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      ` }} />

      <AmbientDust />

      {/* Warm radial top glow */}
      <div style={{
        position: 'absolute', left: '50%', top: '-10%', width: '80%', height: '60%',
        transform: 'translateX(-50%)',
        background: 'radial-gradient(ellipse, rgba(230,180,110,.2), transparent 60%)',
        pointerEvents: 'none',
      }} />

      {/* Title */}
      <div style={{
        position: 'absolute', top: '6%', left: '50%', transform: 'translateX(-50%)',
        textAlign: 'center', zIndex: 2,
        animation: 'cs-fadeInSurprise 1s ease-out both',
      }}>
        <div style={{
          fontFamily: "'Cinzel', serif", fontSize: 'clamp(9px,1.1vw,11px)',
          letterSpacing: '.6em', color: '#5c3620',
        }}>SIDE A · {year}</div>
        <div style={{
          marginTop: 8, fontFamily: "'DM Serif Display', serif", fontStyle: 'italic',
          fontSize: 'clamp(26px,4.5vw,40px)', color: '#2a1810',
        }}>for {recipient}, on tape</div>
      </div>

      {/* Stage */}
      <div style={{
        position: 'relative',
        width: 'min(620px, 88vw)',
        aspectRatio: '5 / 6',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'flex-end',
      }}>
        {/* TV */}
        <div style={{ position: 'relative', width: '100%', aspectRatio: '5 / 4' }}>
          <WoodenTV
            playing={playing}
            videoUrl={videoUrl}
            onVideoEnded={handleVideoEnded}
          />
        </div>

        {/* Cassette — flies into slot when inserted */}
        <div
          onClick={insert}
          onTouchEnd={(e) => { e.preventDefault(); insert(); }}
          style={{
            position: 'absolute',
            width: 'min(260px, 50%)',
            aspectRatio: '8 / 5',
            left: '50%',
            top: inserted ? '58%' : '18%',
            transform: `translate(-50%, -50%) rotate(${inserted ? 0 : -4}deg) scale(${inserted ? .42 : 1})`,
            transition: 'all 1.2s cubic-bezier(.5,.02,.3,1)',
            cursor: inserted ? 'default' : 'pointer',
            zIndex: inserted ? 1 : 5,
            filter: inserted ? 'brightness(.6)' : 'none',
          }}
        >
          <Cassette spinning={!inserted} recipient={recipient} year={year} />
          {!inserted && (
            <div style={{
              position: 'absolute', left: '50%', bottom: -28, transform: 'translateX(-50%)',
              fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: '.5em',
              color: '#5c3620', whiteSpace: 'nowrap',
            }}>— TAP TO INSERT —</div>
          )}
        </div>
      </div>

      {/* Manual continue after video ends (in case onEnded doesn't fire for YT) */}
      {playing && (
        <button
          onClick={() => onEnded()}
          style={{
            position: 'absolute', bottom: 'clamp(24px, 4vh, 40px)', left: '50%',
            transform: 'translateX(-50%)',
            padding: '10px 28px',
            background: 'linear-gradient(180deg, #b8893a, #7a5a26)',
            border: '1px solid rgba(232,196,120,.5)',
            borderRadius: 40,
            color: '#1a0d07',
            fontFamily: "'Cinzel', serif",
            fontWeight: 500,
            fontSize: 'clamp(10px, 1.4vw, 12px)',
            letterSpacing: '.25em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            boxShadow: '0 8px 24px -6px rgba(60,30,10,.4)',
            animation: 'cs-fadeInSurprise 1.2s ease 1.5s both',
            opacity: 0,
          }}
        >Continue</button>
      )}
    </div>
  );
}
