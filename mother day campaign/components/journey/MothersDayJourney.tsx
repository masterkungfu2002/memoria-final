'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import type { Album, AlbumPhoto } from '@/lib/types';

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Lato:wght@300;400&family=Cormorant+Garamond:ital,wght@0,400;1,400&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100%;overflow:hidden;background:#000;color:#fff;font-family:'Lato',sans-serif;-webkit-tap-highlight-color:transparent}
.g-grain{position:fixed;inset:0;pointer-events:none;z-index:9000;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");opacity:0.03}
.g-bar{position:fixed;top:0;left:0;right:0;height:2px;background:rgba(255,255,255,.06);z-index:8000}
.g-bar-f{height:100%;background:#c9a84c;transition:width 1.2s ease}
.g-scr{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity 1s ease;z-index:1}
.g-scr.on{opacity:1;pointer-events:all;z-index:10}
#g-intro{background:#000;overflow:hidden;cursor:pointer}
#g-stars{position:absolute;inset:0;width:100%;height:100%}
.g-i-txt{position:relative;z-index:2;text-align:center;opacity:0;animation:gIn 2s ease 1.2s forwards}
.g-i-h{font-family:'Playfair Display',serif;font-size:clamp(1.4rem,5vw,2.6rem);color:rgba(255,255,255,.95);letter-spacing:.18em;text-shadow:0 0 40px rgba(201,168,76,.9),0 0 80px rgba(201,168,76,.4);margin-bottom:.5rem}
.g-i-sub{font-size:clamp(.7rem,2vw,.9rem);color:rgba(201,168,76,.7);letter-spacing:.4em;text-transform:uppercase;animation:gPulse 2.5s ease-in-out infinite}
.g-tap{position:absolute;bottom:40px;font-size:.72rem;color:rgba(255,255,255,.22);letter-spacing:.3em;text-transform:uppercase;opacity:0;animation:gIn 1s ease 2.5s forwards,gPulse 2s ease-in-out 2.5s infinite}
#g-greet{flex-direction:column;background:radial-gradient(ellipse at 50% 40%,#100820 0%,#000 100%);overflow:hidden}
.g-bk-wrap{position:absolute;inset:0;overflow:hidden;pointer-events:none}
.g-bk{position:absolute;border-radius:50%;filter:blur(30px);opacity:0;animation:gBokeh linear infinite}
@keyframes gBokeh{0%{transform:translateY(100vh) scale(.3);opacity:0}10%{opacity:.12}85%{opacity:.1}100%{transform:translateY(-20vh) scale(1);opacity:0}}
.g-greet-card{position:relative;z-index:2;text-align:center;max-width:640px;padding:3rem 2rem}
.g-greet-lbl{font-size:clamp(.6rem,1.5vw,.78rem);color:#c9a84c;letter-spacing:.45em;text-transform:uppercase;margin-bottom:1.8rem;opacity:0;animation:gUp .8s ease forwards .5s}
#g-tw{font-family:'Playfair Display',serif;font-size:clamp(1.3rem,4.5vw,2.4rem);color:#faf0e6;line-height:1.75;min-height:2em}
.g-cursor{display:inline-block;width:3px;height:1.1em;background:#c9a84c;vertical-align:text-bottom;margin-left:3px;animation:gBlink .65s infinite}
@keyframes gBlink{0%,49%{opacity:1}50%,100%{opacity:0}}
.g-cta{margin-top:2.5rem;font-size:.72rem;color:rgba(201,168,76,.45);letter-spacing:.3em;text-transform:uppercase;cursor:pointer;opacity:0;transition:opacity 1s;animation:gPulse 2s ease-in-out infinite}
.g-cta.vis{opacity:1}
#g-book{flex-direction:column;overflow:hidden}
#g-sbg{position:absolute;inset:0;transition:background 2s ease}
.g-pcv{position:absolute;inset:0;pointer-events:none;z-index:1;width:100%;height:100%}
.g-bwrap{position:relative;z-index:10;display:flex;flex-direction:column;align-items:center;gap:1rem;width:100%;max-width:960px;padding:1rem}
.g-slbl{font-size:clamp(.6rem,2vw,.8rem);color:#c9a84c;letter-spacing:.42em;text-transform:uppercase;opacity:.75;font-family:'Cormorant Garamond',serif;font-style:italic}
.g-aout{position:relative;width:min(92vw,780px);height:min(63vw,490px)}
.g-ash{position:absolute;bottom:-14px;left:5%;right:5%;height:22px;background:rgba(0,0,0,.65);filter:blur(18px);border-radius:50%}
.g-alb{position:relative;width:100%;height:100%;perspective:2800px}
.g-spread{position:absolute;inset:0;display:flex;border-radius:6px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.7),0 0 0 1px rgba(255,255,255,.08)}
.g-left{width:50%;height:100%;background:linear-gradient(145deg,#fffaf5 0%,#fef5e8 45%,#faeedc 100%);display:flex;align-items:center;justify-content:center;padding:1.8rem 1.5rem;box-shadow:inset -5px 0 14px rgba(0,0,0,.06);position:relative}
.g-left::before{content:'';position:absolute;inset:14px;border:.5px solid rgba(201,168,76,.2);border-radius:3px;pointer-events:none}
.g-right{width:50%;height:100%;position:relative;overflow:hidden;background:#f0e4d2;cursor:pointer}
.g-right img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .5s}
.g-right:hover img{transform:scale(1.03)}
.g-vig{position:absolute;inset:0;pointer-events:none;background:linear-gradient(135deg,rgba(0,0,0,.08) 0%,transparent 50%,rgba(0,0,0,.12) 100%)}
.g-spine{position:absolute;top:0;left:calc(50% - 8px);width:16px;height:100%;z-index:5;pointer-events:none;background:linear-gradient(to right,#5c3d12,#c9a84c,#e8c97a,#c9a84c,#5c3d12);box-shadow:0 0 10px rgba(0,0,0,.6)}
.g-cap{text-align:center}
.g-cn{font-family:'Cormorant Garamond',serif;font-size:.6rem;color:#b89a6a;letter-spacing:.25em;margin-bottom:.7rem}
.g-ci{font-size:1.4rem;margin-bottom:.5rem}
.g-ct{font-family:'Playfair Display',serif;font-size:clamp(.8rem,2vw,1.2rem);color:#2a1f14;margin-bottom:.4rem;line-height:1.4}
.g-chr{width:32px;height:1.5px;background:#c9a84c;margin:.5rem auto}
.g-cc{font-size:clamp(.65rem,1.5vw,.85rem);color:#7a5c3e;line-height:1.8;font-style:italic;font-family:'Cormorant Garamond',serif}
.g-cy{margin-top:.6rem;font-size:.6rem;color:#b89a6a;letter-spacing:.2em;font-family:'Cormorant Garamond',serif}
#g-tp{position:absolute;top:0;width:50%;height:100%;transform-style:preserve-3d;z-index:20;display:none;will-change:transform;backface-visibility:hidden}
#g-tp.fwd{left:50%;transform-origin:left center;display:block;animation:gFwd 0.55s cubic-bezier(0.23,1,0.32,1) forwards}
#g-tp.bwd{left:0;transform-origin:right center;display:block;animation:gBwd 0.55s cubic-bezier(0.23,1,0.32,1) forwards}
@keyframes gFwd{from{transform:rotateY(0deg)}to{transform:rotateY(-180deg)}}
@keyframes gBwd{from{transform:rotateY(0deg)}to{transform:rotateY(180deg)}}
.g-tf,.g-tb{position:absolute;inset:0;overflow:hidden;backface-visibility:hidden}
.g-tf{background:#111;border-radius:0 6px 6px 0;box-shadow:-5px 0 18px rgba(0,0,0,.4)}
.g-tf img{width:100%;height:100%;object-fit:cover;display:block}
.g-tb{transform:rotateY(180deg);background:linear-gradient(145deg,#fffaf5,#fef5e8);border-radius:6px 0 0 6px;display:flex;align-items:center;justify-content:center;padding:1.8rem;box-shadow:inset 4px 0 14px rgba(0,0,0,.06)}
.g-tb.ph{background:#111;padding:0;border-radius:0 6px 6px 0;transform:rotateY(-180deg)}
.g-tb.ph img{width:100%;height:100%;object-fit:cover;display:block}
#g-cov{position:absolute;inset:0;z-index:30;transform-style:preserve-3d;transform-origin:left center;transition:transform 1.1s cubic-bezier(0.23,1,0.32,1);border-radius:0 6px 6px 0}
#g-cov.open{transform:rotateY(-180deg);pointer-events:none}
.g-cf{position:absolute;inset:0;backface-visibility:hidden;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:.7rem}
.g-cfr{background:linear-gradient(150deg,#faf3e8 0%,#f5e8d8 45%,#efe0ce 100%);border:1.5px solid rgba(201,168,76,.35);border-radius:0 6px 6px 0;box-shadow:inset 0 0 50px rgba(0,0,0,.08),4px 0 20px rgba(0,0,0,.15)}
.g-cfr::before{content:'';position:absolute;inset:14px;border:1px solid rgba(201,168,76,.2);border-radius:4px;pointer-events:none}
.g-cfr::after{content:'';position:absolute;inset:22px;border:.5px solid rgba(201,168,76,.1);border-radius:3px;pointer-events:none}
.g-corn{width:60px;height:1px;background:linear-gradient(90deg,transparent,#c9a84c,transparent);opacity:.6;position:relative}
.g-corn::after{content:'✦';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#c9a84c;font-size:.5rem;background:#f5e8d8;padding:0 8px}
.g-ctitle{font-family:'Playfair Display',serif;font-size:clamp(1rem,3.5vw,1.75rem);color:#3a2a1a;text-align:center;padding:0 2rem;line-height:1.3;text-shadow:0 0 20px rgba(201,168,76,.2)}
.g-cyear{font-size:clamp(.6rem,1.5vw,.75rem);color:#c9a84c;letter-spacing:.5em;text-transform:uppercase;opacity:.8}
.g-ctap{position:absolute;bottom:14px;font-size:.68rem;color:rgba(58,42,26,.4);letter-spacing:.25em;animation:gPulse 2s infinite}
.g-cbk{background:linear-gradient(150deg,#faf3e8,#efe0ce);border-radius:0 6px 6px 0;transform:rotateY(180deg)}
.g-nav{display:flex;align-items:center;gap:1.2rem;opacity:0;transition:opacity .8s}
.g-nav.vis{opacity:1}
.g-nb{width:42px;height:42px;border-radius:50%;background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.35);color:#c9a84c;font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .3s;backdrop-filter:blur(8px)}
.g-nb:hover:not(:disabled){background:rgba(201,168,76,.25);transform:scale(1.1)}
.g-nb:disabled{opacity:.22;cursor:default}
.g-dots{display:flex;gap:7px}
.g-dot{width:7px;height:7px;border-radius:50%;background:rgba(0,0,0,.2);cursor:pointer;transition:all .35s}
.g-dot.on{background:#c9a84c;transform:scale(1.45)}
#g-cass{flex-direction:column;gap:1.5rem;background:radial-gradient(ellipse at 50% 60%,#1a120a 0%,#000 100%)}
.g-ch{font-family:'Playfair Display',serif;font-size:clamp(1rem,3vw,1.6rem);color:#faf0e6;text-align:center}
.g-csub{font-size:.78rem;color:rgba(255,255,255,.38);letter-spacing:.22em;text-transform:uppercase;text-align:center;margin-top:-.5rem}
#g-cw{cursor:pointer;filter:drop-shadow(0 12px 35px rgba(201,168,76,.25));transition:transform .35s,filter .35s}
#g-cw:hover{transform:scale(1.04) translateY(-4px);filter:drop-shadow(0 18px 45px rgba(201,168,76,.4))}
#g-cw.ej{animation:gEj .8s ease forwards;pointer-events:none}
@keyframes gEj{0%{transform:translateY(0) scale(1);opacity:1}40%{transform:translateY(-22px) scale(1.05);opacity:1}100%{transform:translateY(60px) scale(.7);opacity:0}}
.g-skip{margin-top:.5rem;cursor:pointer;font-size:.72rem;color:rgba(255,255,255,.2);letter-spacing:.2em;text-transform:uppercase}
#g-tv{position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.97);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .5s}
#g-tv.on{opacity:1;pointer-events:all}
.g-tvf{position:relative;width:min(90vw,560px)}
.g-tvb{background:linear-gradient(180deg,#1e1a0e 0%,#12100a 100%);border-radius:18px 18px 24px 24px;padding:18px 22px 38px;box-shadow:0 0 0 2px #2a2412,0 0 0 4px #0a0808,0 15px 50px rgba(0,0,0,.9),inset 0 2px 0 rgba(255,255,255,.05)}
.g-tvbz{background:#0a0a05;border-radius:10px;padding:8px;box-shadow:inset 0 0 20px rgba(0,0,0,.9),0 0 0 2px #1a1810}
.g-tvs{position:relative;border-radius:6px;overflow:hidden;aspect-ratio:4/3;background:#000}
.g-tvs::before{content:'';position:absolute;inset:0;z-index:6;pointer-events:none;background:radial-gradient(ellipse at center,transparent 55%,rgba(0,0,0,.55) 100%);border-radius:6px}
.g-tvs::after{content:'';position:absolute;inset:0;z-index:7;pointer-events:none;background:repeating-linear-gradient(to bottom,transparent 0px,transparent 3px,rgba(0,0,0,.18) 3px,rgba(0,0,0,.18) 4px);border-radius:6px}
#g-tvst{position:absolute;inset:0;z-index:5;background:#777;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E");transition:opacity 1.2s}
#g-tvst.off{opacity:0}
.g-tvgl{position:absolute;inset:-8px;z-index:3;pointer-events:none;background:radial-gradient(ellipse at center,rgba(80,200,80,.1) 0%,transparent 70%);border-radius:10px;animation:gGlow 3s ease-in-out infinite}
@keyframes gGlow{0%,100%{opacity:.5}50%{opacity:1}}
.g-tvvid{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:2;display:block}
.g-tvifr{position:absolute;inset:0;width:100%;height:100%;z-index:2;border:none;display:none}
.g-tvled{position:absolute;bottom:-22px;right:18px;width:8px;height:8px;border-radius:50%;background:#1a1812;transition:all .5s;box-shadow:0 0 3px rgba(0,0,0,.8)}
.g-tvled.on{background:#22ff55;box-shadow:0 0 8px rgba(34,255,85,.9)}
.g-tvkn{display:inline-block;width:24px;height:24px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#3a3020,#1a1810);box-shadow:0 2px 4px rgba(0,0,0,.8),inset 0 1px 0 rgba(255,255,255,.07);vertical-align:middle}
.g-tvctl{display:flex;justify-content:center;gap:12px;margin-top:8px}
.g-tvbr{text-align:center;margin-top:6px;font-family:'Courier Prime',monospace;font-size:.62rem;color:#2a2515;letter-spacing:.5em;text-transform:uppercase}
.g-tvcl{position:absolute;top:-14px;right:-14px;width:32px;height:32px;border-radius:50%;background:#1a1008;border:1px solid #333;color:rgba(255,255,255,.6);font-size:.9rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .3s;z-index:10}
.g-tvcl:hover{background:#c0392b;border-color:#c0392b;color:#fff;transform:scale(1.1)}
#g-fb{flex-direction:column;padding:1.5rem;background:radial-gradient(ellipse at 50% 30%,#0d0820 0%,#000 100%);overflow-y:auto}
.g-fbc{background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:2.5rem;max-width:480px;width:100%;backdrop-filter:blur(16px);box-shadow:0 30px 60px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.07)}
.g-fbh{font-family:'Playfair Display',serif;font-size:clamp(1.3rem,4vw,1.9rem);color:#faf0e6;text-align:center;margin-bottom:.4rem}
.g-fbsub{color:rgba(255,255,255,.38);font-size:.8rem;text-align:center;margin-bottom:2rem}
.g-strs{display:flex;justify-content:center;gap:.45rem;margin-bottom:1.5rem}
.g-str{font-size:2.2rem;cursor:pointer;color:rgba(255,255,255,.14);transition:all .2s;line-height:1}
.g-str.on{color:#c9a84c;filter:drop-shadow(0 0 8px rgba(201,168,76,.7));transform:scale(1.15)}
.g-inp{width:100%;border-radius:12px;padding:.85rem 1rem;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#fff;font-family:'Lato',sans-serif;font-size:.88rem;margin-bottom:.85rem;transition:border .3s;outline:none}
.g-inp:focus{border-color:#c9a84c}
.g-inp::placeholder{color:rgba(255,255,255,.28)}
textarea.g-inp{resize:none;height:90px}
.g-sub{width:100%;padding:.95rem;background:linear-gradient(135deg,#c9a84c,#f0d080,#c9a84c);background-size:200% auto;color:#1a1008;font-weight:700;font-size:.92rem;letter-spacing:.1em;border:none;border-radius:12px;cursor:pointer;transition:all .35s}
.g-sub:hover{background-position:right center;transform:translateY(-2px);box-shadow:0 8px 24px rgba(201,168,76,.35)}
.g-ok{text-align:center}
.g-ok-ic{font-size:3rem;margin-bottom:1rem}
.g-ok-h{font-family:'Playfair Display',serif;font-size:1.5rem;color:#c9a84c;margin-bottom:.5rem}
.g-ok-t{color:rgba(255,255,255,.45);font-size:.85rem}
@keyframes gIn{from{opacity:0}to{opacity:1}}
@keyframes gUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes gPulse{0%,100%{opacity:.4}50%{opacity:1}}
@media(max-width:480px){.g-aout{height:min(74vw,310px)}.g-fbc{padding:1.8rem}.g-str{font-size:1.9rem}}
@media(max-height:600px){.g-bwrap{gap:.5rem}.g-aout{height:min(58vw,280px)}}
`;

const SEASONS = [
  { name:'Spring', bg:'radial-gradient(ellipse at 50% 35%,#fdf8f1 0%,#f5ecdf 100%)', label:'✦ SPRING ✦', particles:['🌸','🌺','🌷','✿'] },
  { name:'Summer', bg:'radial-gradient(ellipse at 50% 35%,#fdf8f1 0%,#f5ecdf 100%)', label:'✦ SUMMER ✦', particles:['✦','★','✧','⭐'] },
  { name:'Autumn', bg:'radial-gradient(ellipse at 50% 35%,#fdf8f1 0%,#f5ecdf 100%)', label:'✦ AUTUMN ✦', particles:['🍁','🍂','🌿','🌰'] },
  { name:'Winter', bg:'radial-gradient(ellipse at 50% 35%,#fdf8f1 0%,#f5ecdf 100%)', label:'✦ WINTER ✦', particles:['❄','❅','❆','✦'] },
];

const GOLD = '#c9a84c';
const CREAM = '#faf0e6';

function gd(url: string) {
  if (!url) return '';
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return m ? `https://drive.google.com/uc?export=view&id=${m[1]}` : url;
}
function isYT(url: string) { return /youtu\.?be/.test(url); }
function ytId(url: string) {
  const m = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : '';
}

type Scr = 'intro'|'greeting'|'book'|'cassette'|'feedback';
interface Flip { dir:'fwd'|'bwd'; from:number; to:number }

export function MothersDayJourney({ album }: { album: Album }) {
  const photos: AlbumPhoto[] = album.photos || [];
  const videoUrl = album.video_url || '';
  const recipientName = album.recipient_name || 'Mom';
  const eventYear = new Date(album.created_at).getFullYear().toString();
  const greet = `Happy Mother's Day\nWith all our love`;
  const TOTAL = photos.length;

  const [scr, setScr] = useState<Scr>('intro');
  const [bookOpen, setBookOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [anim, setAnim] = useState(false);
  const [flip, setFlip] = useState<Flip|null>(null);
  const [navVis, setNavVis] = useState(false);
  const [tvOn, setTvOn] = useState(false);
  const [tvStatic, setTvStatic] = useState(true);
  const [ledOn, setLedOn] = useState(false);
  const [stars, setStars] = useState(0);
  const [fbDone, setFbDone] = useState(false);
  const [greetDone, setGreetDone] = useState(false);
  const [fbName, setFbName] = useState('');
  const [fbMsg, setFbMsg] = useState('');
  const [sending, setSending] = useState(false);

  const starsRef = useRef<HTMLCanvasElement>(null);
  const pcvRef = useRef<HTMLCanvasElement>(null);
  const typeRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ifrRef = useRef<HTMLIFrameElement>(null);
  const swipeX = useRef(0);

  const season = SEASONS[page % 4];
  const pct = scr==='intro'?5 : scr==='greeting'?20
    : scr==='book'? 35+(page/Math.max(1,TOTAL-1))*40
    : scr==='cassette'?82 : 95;

  useEffect(()=>{
    let el = document.getElementById('mjg-css') as HTMLStyleElement|null;
    if(!el){ el=document.createElement('style'); el.id='mjg-css'; document.head.appendChild(el); }
    el.textContent = STYLES;
    return ()=>{ el?.remove(); };
  },[]);

  // Shooting stars
  useEffect(()=>{
    if(scr!=='intro') return;
    const c=starsRef.current; if(!c) return;
    const ctx=c.getContext('2d')!; let af:number;
    type S={x:number;y:number;r:number;o:number;s:number};
    type M={x:number;y:number;vx:number;vy:number;mL:number;life:number;mLife:number};
    const sl:S[]=[], ml:M[]=[];
    const resize=()=>{c.width=innerWidth;c.height=innerHeight;};
    resize(); window.addEventListener('resize',resize);
    for(let i=0;i<220;i++) sl.push({x:Math.random()*innerWidth,y:Math.random()*innerHeight,r:Math.random()*1.6+.2,o:Math.random(),s:Math.random()*.006+.002});
    function frame(){
      af=requestAnimationFrame(frame); ctx.clearRect(0,0,c.width,c.height);
      sl.forEach(s=>{s.o+=s.s;if(s.o>1)s.o=0;ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fillStyle=`rgba(255,255,255,${.25+s.o*.75})`;ctx.fill();});
      if(Math.random()<.014) ml.push({x:Math.random()*c.width,y:Math.random()*c.height*.45,vx:3+Math.random()*4.5,vy:1.8+Math.random()*2.8,mL:80+Math.random()*130,life:0,mLife:38+Math.random()*35});
      for(let i=ml.length-1;i>=0;i--){
        const m=ml[i]; m.x+=m.vx;m.y+=m.vy;m.life++;
        if(m.life>m.mLife){ml.splice(i,1);continue;}
        const p=m.life/m.mLife;
        const g=ctx.createLinearGradient(m.x,m.y,m.x-m.vx*(m.mL/m.mLife),m.y-m.vy*(m.mL/m.mLife));
        g.addColorStop(0,`rgba(255,255,240,${.85*(1-p)})`); g.addColorStop(.4,`rgba(201,168,76,${.4*(1-p)})`); g.addColorStop(1,'rgba(0,0,0,0)');
        ctx.beginPath();ctx.moveTo(m.x,m.y);ctx.lineTo(m.x-m.vx*(m.mL/m.mLife),m.y-m.vy*(m.mL/m.mLife));
        ctx.strokeStyle=g;ctx.lineWidth=1.8-p;ctx.stroke();
      }
    }
    frame();
    return()=>{cancelAnimationFrame(af);window.removeEventListener('resize',resize);};
  },[scr]);

  // Seasonal particles
  useEffect(()=>{
    if(scr!=='book') return;
    const c=pcvRef.current; if(!c) return;
    const ctx=c.getContext('2d')!; let af:number; const s=season;
    type P={x:number;y:number;vy:number;vx:number;sz:number;em:string;rot:number;rv:number;alpha:number;life:number;mLife:number};
    const ps:P[]=[];
    const resize=()=>{c.width=innerWidth;c.height=innerHeight;};
    resize(); window.addEventListener('resize',resize);
    const spawn=()=>ps.push({x:Math.random()*c.width,y:-20,vy:.5+Math.random()*1.2,vx:(Math.random()-.5)*.8,sz:12+Math.random()*14,em:s.particles[Math.floor(Math.random()*s.particles.length)],rot:Math.random()*Math.PI*2,rv:(Math.random()-.5)*.04,alpha:0,life:0,mLife:200+Math.random()*180});
    let t=0;
    function frame(){
      af=requestAnimationFrame(frame); t++; ctx.clearRect(0,0,c.width,c.height);
      if(t%28===0) spawn();
      for(let i=ps.length-1;i>=0;i--){
        const p=ps[i]; p.x+=p.vx+Math.sin(p.life*.02)*.3; p.y+=p.vy; p.rot+=p.rv; p.life++;
        p.alpha=p.life<30?p.life/30:p.life>p.mLife-30?(p.mLife-p.life)/30:.55;
        if(p.life>p.mLife||p.y>c.height+20){ps.splice(i,1);continue;}
        ctx.save();ctx.globalAlpha=p.alpha;ctx.translate(p.x,p.y);ctx.rotate(p.rot);
        ctx.font=`${p.sz}px serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(p.em,0,0);ctx.restore();
      }
    }
    for(let i=0;i<6;i++){spawn();ps[ps.length-1].y=Math.random()*c.height;ps[ps.length-1].life=Math.floor(Math.random()*80);}
    frame();
    return()=>{cancelAnimationFrame(af);window.removeEventListener('resize',resize);};
  },[scr,page]);

  // Typewriter
  useEffect(()=>{
    if(scr!=='greeting') return;
    const el=typeRef.current; if(!el) return;
    el.innerHTML=''; let i=0;
    const t=setInterval(()=>{
      if(i>=greet.length){clearInterval(t);setTimeout(()=>setGreetDone(true),800);return;}
      const ch=greet[i++];
      if(ch==='\n') el.innerHTML+='<br>'; else el.innerHTML+=ch;
    },55);
    return()=>clearInterval(t);
  },[scr,greet]);

  const goTo = useCallback((s:Scr)=>{ setScr(s); setGreetDone(false); },[]);

  const openBook = useCallback(()=>{
    if(bookOpen||anim) return;
    setAnim(true); setBookOpen(true);
    setTimeout(()=>{ setNavVis(true); setAnim(false); },1400);
  },[bookOpen,anim]);

  const flipPage = useCallback((dir:'fwd'|'bwd')=>{
    if(anim||!bookOpen||flip) return;
    const to=dir==='fwd'?page+1:page-1;
    if(to<0||to>=TOTAL) return;
    setAnim(true);
    setFlip({dir,from:page,to});
  },[anim,bookOpen,flip,page,TOTAL]);

  const onFlipEnd = useCallback(()=>{
    if(!flip) return;
    const {to,dir}=flip;
    setPage(to);
    setFlip(null);
    setAnim(false);
    if(dir==='fwd' && to===TOTAL-1 && videoUrl){
      setTimeout(()=>goTo('cassette'),800);
    }
  },[flip,TOTAL,videoUrl,goTo]);

  const buildCap = (idx:number) => {
    const ph = photos[idx];
    if(!ph) return '';
    const s = SEASONS[idx%4];
    const captionText = ph.caption || 'A beautiful memory';
    return `<div class="g-cap"><div class="g-cn">0${idx+1}</div><div class="g-ci">${s.particles[0]}</div><div class="g-ct">${s.name}</div><div class="g-chr"></div><div class="g-cc">${captionText}</div><div class="g-cy">${eventYear}</div></div>`;
  };

  const tpFaceSrc = flip ? gd(photos[flip.dir==='fwd' ? flip.from : flip.to]?.url||'') : '';
  const tpBackHTML = flip?.dir==='fwd' ? buildCap(flip.to) : '';
  const tpBackSrc = flip?.dir==='bwd' ? gd(photos[flip.from]?.url||'') : '';

  const openTV = useCallback(()=>{
    const wrap = document.getElementById('g-cw');
    wrap?.classList.add('ej');
    setTimeout(()=>{
      setTvOn(true); setTvStatic(true); setLedOn(false);
      setTimeout(()=>{
        setTvStatic(false); setLedOn(true);
        if(videoUrl){
          if(isYT(videoUrl)){
            const ifr=ifrRef.current;
            if(ifr){ifr.src=`https://www.youtube-nocookie.com/embed/${ytId(videoUrl)}?autoplay=1&controls=1&rel=0&modestbranding=1`;ifr.style.display='block';}
          } else {
            const vid=videoRef.current;
            if(vid){vid.src=gd(videoUrl);vid.muted=false;vid.play().catch(()=>{if(vid){vid.muted=true;vid.play();}});}
          }
        }
      },1200);
    },700);
  },[videoUrl]);

  const closeTV = useCallback(()=>{
    setTvOn(false); setTvStatic(true); setLedOn(false);
    if(videoRef.current){videoRef.current.pause();videoRef.current.src='';}
    if(ifrRef.current){ifrRef.current.src='';ifrRef.current.style.display='none';}
    document.getElementById('g-cw')?.classList.remove('ej');
    goTo('feedback');
  },[goTo]);

  const onVideoEnded = useCallback(()=>closeTV(),[closeTV]);

  const submitFb = useCallback(async()=>{
    if(!stars){alert('Please give a star rating first ⭐');return;}
    setSending(true);
    try{
      const res = await fetch('/api/feedback', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ album_id: album.id, rating: stars, comment: fbMsg.trim() || (fbName ? `From ${fbName}` : 'Sent with love') }),
      });
      if(!res.ok) throw new Error('Failed to submit');
      setFbDone(true);
    }catch(err){ console.error(err); alert('Could not send feedback. Please try again.'); }
    finally{ setSending(false); }
  },[album.id,stars,fbMsg,fbName]);

  const onTS = (e:React.TouchEvent)=>{ swipeX.current=e.touches[0].clientX; };
  const onTE = (e:React.TouchEvent)=>{
    if(!bookOpen){openBook();return;}
    const dx=e.changedTouches[0].clientX-swipeX.current;
    if(Math.abs(dx)>42) flipPage(dx<0?'fwd':'bwd');
  };

  return (
    <>
      <div className="g-grain"/>
      <div className="g-bar"><div className="g-bar-f" style={{width:`${pct}%`}}/></div>
      <div id="g-intro" className={`g-scr ${scr==='intro'?'on':''}`} onClick={()=>goTo('greeting')}>
        <canvas id="g-stars" ref={starsRef}/>
        <div className="g-i-txt"><div className="g-i-h">✨ Your Gift Awaits ✨</div><div className="g-i-sub">Tap anywhere to begin</div></div>
        <div className="g-tap">TAP TO OPEN</div>
      </div>
      <div id="g-greet" className={`g-scr ${scr==='greeting'?'on':''}`}>
        <div className="g-bk-wrap">
          {[{sz:220,c:'#7b3fa0',l:'10%',d:18,dl:0},{sz:160,c:'#c9a84c',l:'75%',d:22,dl:3},{sz:140,c:'#4a2070',l:'40%',d:15,dl:7},{sz:100,c:'#a05028',l:'60%',d:19,dl:1},{sz:180,c:'#6030a0',l:'25%',d:24,dl:5}].map((b,i)=>(
            <div key={i} className="g-bk" style={{width:b.sz,height:b.sz,background:b.c,left:b.l,animationDuration:`${b.d}s`,animationDelay:`${b.dl}s`}}/>
          ))}
        </div>
        <div className="g-greet-card"><div className="g-greet-lbl">A MESSAGE FOR YOU</div><div id="g-tw" ref={typeRef}><span className="g-cursor"/></div><div className={`g-cta ${greetDone?'vis':''}`} onClick={()=>{ if(greetDone) goTo('book'); }}>TAP TO OPEN YOUR ALBUM →</div></div>
      </div>
      <div id="g-book" className={`g-scr ${scr==='book'?'on':''}`}>
        <div id="g-sbg" style={{background:season.bg}}/>
        <canvas ref={pcvRef} className="g-pcv"/>
        <div className="g-bwrap">
          <div className="g-slbl">{season.label}</div>
          <div className="g-aout"><div className="g-ash"/><div className="g-alb" onTouchStart={onTS} onTouchEnd={onTE}>
            <div className="g-spread"><div className="g-left" dangerouslySetInnerHTML={{__html:buildCap(page)}}/><div className="g-right" onClick={()=>{ if(bookOpen&&!anim) flipPage('fwd'); }}>{photos[page] && <img src={gd(photos[page].url)} alt={photos[page].caption||''}/>}<div className="g-vig"/></div></div>
            <div className="g-spine"/>
            <div id="g-tp" className={flip ? flip.dir : ''} style={{display:flip?'block':'none'}} onAnimationEnd={onFlipEnd}>
              <div className="g-tf">{flip && <img src={tpFaceSrc} alt=""/>}</div>
              <div className={`g-tb ${flip?.dir==='bwd'?'ph':''}`}>{flip?.dir==='fwd' && <div dangerouslySetInnerHTML={{__html:tpBackHTML}}/>}{flip?.dir==='bwd' && <img src={tpBackSrc} alt=""/>}</div>
            </div>
            <div id="g-cov" className={bookOpen?'open':''} onClick={()=>{ if(!bookOpen) openBook(); }}>
              <div className="g-cf g-cfr"><div style={{fontSize:'2.2rem'}}>📖</div><div className="g-corn"/><div className="g-ctitle">For the Most Wonderful<br/><em style={{color:GOLD}}>{recipientName}</em></div><div className="g-corn"/><div className="g-cyear">{eventYear}</div>{!bookOpen && <div className="g-ctap">TAP TO OPEN</div>}</div>
              <div className="g-cf g-cbk"><span style={{fontFamily:"'Playfair Display',serif",color:'#2a1508',fontSize:'1.2rem',opacity:.18}}>✦</span></div>
            </div>
          </div></div>
          <nav className={`g-nav ${navVis?'vis':''}`}>
            <button className="g-nb" disabled={page===0||anim} onClick={()=>flipPage('bwd')}>←</button>
            <div className="g-dots">{Array.from({length:TOTAL}).map((_,i)=>(<div key={i} className={`g-dot ${i===page?'on':''}`} onClick={()=>{ if(!anim&&bookOpen&&i!==page) flipPage(i>page?'fwd':'bwd'); }}/>))}</div>
            <button className="g-nb" disabled={anim} onClick={()=>{ if(page<TOTAL-1) flipPage('fwd'); else if(videoUrl) goTo('cassette'); else goTo('feedback'); }}>→</button>
          </nav>
        </div>
      </div>
      <div id="g-cass" className={`g-scr ${scr==='cassette'?'on':''}`}>
        <div className="g-ch">One Last Surprise 🎬</div><div className="g-csub">Press play to watch</div>
        <div id="g-cw" onClick={openTV}>
          <svg width="280" height="170" viewBox="0 0 280 170" fill="none"><rect x="10" y="20" width="260" height="130" rx="14" fill="#1a1208" stroke="#3a2c14" strokeWidth="1.5"/><rect x="18" y="28" width="244" height="114" rx="10" fill="#141008"/><rect x="30" y="38" width="220" height="60" rx="6" fill="#1e1610" stroke="rgba(212,168,75,0.2)" strokeWidth="0.8"/><text x="140" y="65" fontFamily="serif" fontSize="11" fill="rgba(212,168,75,0.8)" textAnchor="middle" letterSpacing="3">MEMORIES</text><text x="140" y="82" fontFamily="sans-serif" fontSize="7.5" fill="rgba(212,168,75,0.45)" textAnchor="middle" letterSpacing="2">WITH LOVE</text><line x1="30" y1="110" x2="250" y2="110" stroke="rgba(212,168,75,0.12)" strokeWidth="0.6"/><rect x="40" y="114" width="80" height="26" rx="4" fill="#0e0b06" stroke="#2a2010" strokeWidth="0.8"/><rect x="160" y="114" width="80" height="26" rx="4" fill="#0e0b06" stroke="#2a2010" strokeWidth="0.8"/><g style={{transformBox:'fill-box',transformOrigin:'80px 127px',animation:scr==='cassette'?'gFwd 2s linear infinite':'none'}}><circle cx="80" cy="127" r="10" fill="#1c1408" stroke="#3a2a10" strokeWidth="0.8"/><circle cx="80" cy="127" r="3.5" fill="#3a2a10"/><line x1="80" y1="117" x2="80" y2="122" stroke="#3a2a10" strokeWidth="1"/><line x1="80" y1="132" x2="80" y2="137" stroke="#3a2a10" strokeWidth="1"/><line x1="70" y1="127" x2="75" y2="127" stroke="#3a2a10" strokeWidth="1"/><line x1="85" y1="127" x2="90" y2="127" stroke="#3a2a10" strokeWidth="1"/></g><g style={{transformBox:'fill-box',transformOrigin:'200px 127px',animation:scr==='cassette'?'gBwd 2s linear infinite':'none'}}><circle cx="200" cy="127" r="10" fill="#1c1408" stroke="#3a2a10" strokeWidth="0.8"/><circle cx="200" cy="127" r="3.5" fill="#3a2a10"/><line x1="200" y1="117" x2="200" y2="122" stroke="#3a2a10" strokeWidth="1"/><line x1="200" y1="132" x2="200" y2="137" stroke="#3a2a10" strokeWidth="1"/><line x1="190" y1="127" x2="195" y2="127" stroke="#3a2a10" strokeWidth="1"/><line x1="205" y1="127" x2="210" y2="127" stroke="#3a2a10" strokeWidth="1"/></g><rect x="10" y="148" width="260" height="2" rx="1" fill="rgba(212,168,75,0.2)"/></svg>
        </div>
        <div className="g-skip" onClick={()=>goTo('feedback')}>Skip →</div>
      </div>
      <div id="g-tv" className={tvOn?'on':''}>
        <div className="g-tvf"><div className="g-tvb"><div className="g-tvbz"><div className="g-tvs"><div className="g-tvgl"/><div id="g-tvst" className={tvStatic?'':'off'}/><video ref={videoRef} className="g-tvvid" playsInline controls onEnded={onVideoEnded}/><iframe ref={ifrRef} className="g-tvifr" allow="autoplay" title="video"/></div></div><div className="g-tvctl"><span className="g-tvkn"/><span className="g-tvkn"/></div><div className="g-tvbr">MEMÓRIA · VHS</div><div className={`g-tvled ${ledOn?'on':''}`}/></div><div className="g-tvcl" onClick={closeTV}>✕</div></div>
      </div>
      <div id="g-fb" className={`g-scr ${scr==='feedback'?'on':''}`}>
        <div className="g-fbc">{!fbDone ? (<><div className="g-fbh">How Did We Do? 🌸</div><div className="g-fbsub">Your feedback means everything to us</div><div className="g-strs">{([1,2,3,4,5] as const).map(n=>(<span key={n} className={`g-str ${n<=stars?'on':''}`} onClick={()=>setStars(n)}>★</span>))}</div><input className="g-inp" placeholder="Your name (optional)" value={fbName} onChange={e=>setFbName(e.target.value)}/><textarea className="g-inp" placeholder="Leave a message of love..." value={fbMsg} onChange={e=>setFbMsg(e.target.value)}/><button className="g-sub" disabled={sending} onClick={submitFb}>{sending?'Sending... 💌':'Send Love ✨'}</button></>) : (<div className="g-ok"><div className="g-ok-ic">💝</div><div className="g-ok-h">Thank You!</div><div className="g-ok-t">Your message has been received with love.</div></div>)}</div>
      </div>
    </>
  );
}