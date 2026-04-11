'use client';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { Album, AlbumPhoto } from '@/lib/types';

const CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; overflow: hidden; background: #f8f5f0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #2e2a24; -webkit-font-smoothing: antialiased; }
  
  /* Grain texture */
  .grain { position: fixed; inset: 0; pointer-events: none; z-index: 9999; opacity: 0.015; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E"); background-repeat: repeat; }
  
  /* Progress bar */
  .progress-bar { position: fixed; top: 0; left: 0; right: 0; height: 2px; background: rgba(0,0,0,0.05); z-index: 8000; }
  .progress-fill { height: 100%; background: linear-gradient(90deg, #b8922e, #e4c87a); width: 0%; transition: width 0.8s cubic-bezier(0.2, 0.9, 0.4, 1.1); }
  
  /* Screens */
  .screen { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.8s cubic-bezier(0.2, 0.9, 0.4, 1.1); z-index: 1; }
  .screen.active { opacity: 1; pointer-events: auto; z-index: 10; }
  
  /* Intro */
  .intro { background: radial-gradient(ellipse at 50% 40%, #fefaf5, #f4ede3); cursor: pointer; }
  .intro-canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
  .intro-content { position: relative; z-index: 2; text-align: center; opacity: 0; transform: translateY(20px); transition: opacity 1.2s, transform 1.2s; }
  .intro-content.visible { opacity: 1; transform: translateY(0); }
  .intro-title { font-family: 'Playfair Display', serif; font-size: clamp(1.5rem, 5vw, 2.8rem); font-weight: 400; letter-spacing: 0.05em; color: #3c3326; line-height: 1.4; }
  .intro-sub { font-size: 0.7rem; letter-spacing: 0.3em; text-transform: uppercase; color: #b89a6e; margin-top: 1rem; animation: pulse 2.5s infinite; }
  .intro-tap { position: absolute; bottom: 2rem; font-size: 0.6rem; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(60,51,38,0.2); animation: bounce 2s infinite; }
  
  /* Greeting */
  .greeting { background: radial-gradient(ellipse at 50% 35%, #fef7ef, #f9efdf); flex-direction: column; }
  .greeting-card { max-width: 560px; padding: 2rem; text-align: center; position: relative; z-index: 2; }
  .greeting-label { font-size: 0.65rem; letter-spacing: 0.4em; color: #b89a6e; margin-bottom: 1.5rem; }
  .greeting-text { font-family: 'Playfair Display', serif; font-size: clamp(1.2rem, 4vw, 2.2rem); line-height: 1.6; color: #2e2a24; white-space: pre-wrap; min-height: 4em; }
  .cursor { display: inline-block; width: 2px; height: 1em; background: #b89a6e; vertical-align: middle; margin-left: 3px; animation: blink 0.8s step-end infinite; }
  .greeting-cta { margin-top: 2rem; font-size: 0.7rem; letter-spacing: 0.3em; text-transform: uppercase; color: #b89a6e; cursor: pointer; opacity: 0; transition: opacity 0.5s; animation: pulse 2s infinite; }
  .greeting-cta.visible { opacity: 1; }
  
  /* Book */
  .book { overflow: hidden; }
  .book-bg { position: absolute; inset: 0; transition: background 1s ease; }
  .book-particles { position: absolute; inset: 0; pointer-events: none; z-index: 1; }
  .book-container { position: relative; z-index: 10; display: flex; flex-direction: column; align-items: center; gap: 1rem; width: 100%; max-width: 1000px; padding: 0 1rem; }
  .book-season { font-size: 0.7rem; letter-spacing: 0.4em; color: #b89a6e; text-transform: uppercase; opacity: 0.7; }
  
  /* Book 3D */
  .book-wrapper { position: relative; width: min(95vw, 880px); aspect-ratio: 1.6 / 1; }
  @media (max-width: 640px) { .book-wrapper { aspect-ratio: 1.5 / 1; } }
  .book-shadow { position: absolute; bottom: -10px; left: 5%; right: 5%; height: 20px; background: rgba(0,0,0,0.1); filter: blur(12px); border-radius: 50%; }
  .book-3d { position: relative; width: 100%; height: 100%; perspective: 2200px; }
  
  /* Spread */
  .spread { position: absolute; inset: 0; display: flex; border-radius: 8px; overflow: hidden; box-shadow: 0 20px 40px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(184,154,110,0.2); }
  .spread-left { width: 50%; height: 100%; background: linear-gradient(145deg, #fffcf7, #fef7ef); display: flex; align-items: center; justify-content: center; padding: 1.5rem; position: relative; }
  .spread-left::after { content: ''; position: absolute; right: 0; top: 0; bottom: 0; width: 16px; background: linear-gradient(to left, rgba(0,0,0,0.02), transparent); }
  .spread-right { width: 50%; height: 100%; background: #fef9f2; cursor: pointer; overflow: hidden; position: relative; }
  .spread-right img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .spine { position: absolute; top: 0; left: calc(50% - 8px); width: 16px; height: 100%; z-index: 40; background: linear-gradient(90deg, #c9aa6c, #e4c87a, #f5e2b0, #e4c87a, #c9aa6c); box-shadow: 0 0 6px rgba(0,0,0,0.1); pointer-events: none; }
  
  /* Flip animation */
  .flip { position: absolute; top: 0; width: 50%; height: 100%; z-index: 25; pointer-events: none; transform-style: preserve-3d; }
  .flip-forward { left: 50%; transform-origin: left center; animation: flipForward 0.55s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
  .flip-backward { left: 0; transform-origin: right center; animation: flipBackward 0.55s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
  @keyframes flipForward { from { transform: rotateY(0deg); } to { transform: rotateY(-180deg); } }
  @keyframes flipBackward { from { transform: rotateY(0deg); } to { transform: rotateY(180deg); } }
  .flip-front, .flip-back { position: absolute; inset: 0; backface-visibility: hidden; overflow: hidden; }
  .flip-front { background: #fef9f2; border-radius: 0 8px 8px 0; }
  .flip-front img { width: 100%; height: 100%; object-fit: cover; }
  .flip-back { transform: rotateY(180deg); background: linear-gradient(145deg, #fffcf7, #fef7ef); border-radius: 8px 0 0 8px; display: flex; align-items: center; justify-content: center; padding: 1.5rem; }
  .flip-front-caption { border-radius: 8px 0 0 8px; background: linear-gradient(145deg, #fffcf7, #fef7ef); display: flex; align-items: center; justify-content: center; padding: 1.5rem; }
  .flip-back-photo { transform: rotateY(180deg); border-radius: 0 8px 8px 0; background: #fef9f2; overflow: hidden; }
  .flip-back-photo img { width: 100%; height: 100%; object-fit: cover; }
  
  /* Cover */
  .cover { position: absolute; top: 0; right: 0; width: 50%; height: 100%; z-index: 30; transform-style: preserve-3d; transform-origin: left center; transition: transform 1s cubic-bezier(0.23, 1, 0.32, 1); cursor: pointer; border-radius: 0 8px 8px 0; }
  .cover.open { transform: rotateY(-178deg); pointer-events: none; }
  .cover-front, .cover-back { position: absolute; inset: 0; backface-visibility: hidden; }
  .cover-front { background: linear-gradient(135deg, #e9dbc9, #ddceb8); border: 1px solid rgba(184,154,110,0.4); border-radius: 0 8px 8px 0; box-shadow: inset 0 0 30px rgba(0,0,0,0.03), -2px 0 12px rgba(0,0,0,0.1); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; }
  .cover-front::before { content: ''; position: absolute; inset: 12px; border: 1px solid rgba(184,154,110,0.2); border-radius: 4px; pointer-events: none; }
  .cover-back { transform: rotateY(180deg); background: linear-gradient(135deg, #ddceb8, #d4c2a8); border-radius: 0 8px 8px 0; }
  
  /* Caption component */
  .caption { text-align: center; max-width: 85%; }
  .caption-number { font-size: 0.6rem; letter-spacing: 0.2em; color: #a88d66; margin-bottom: 0.5rem; }
  .caption-icon { font-size: 1.2rem; margin-bottom: 0.2rem; color: #b89a6e; }
  .caption-season { font-family: 'Playfair Display', serif; font-size: 0.9rem; color: #4a3e30; margin-bottom: 0.3rem; }
  .caption-divider { width: 30px; height: 1px; background: linear-gradient(90deg, transparent, #b89a6e, transparent); margin: 0.5rem auto; }
  .caption-text { font-size: 0.75rem; color: #6b5a48; line-height: 1.5; font-style: italic; }
  .caption-year { font-size: 0.6rem; letter-spacing: 0.2em; color: #b89a6e; margin-top: 0.5rem; }
  
  /* Navigation */
  .nav { display: flex; align-items: center; gap: 1rem; opacity: 0; transition: opacity 0.5s; margin-top: 0.5rem; }
  .nav.visible { opacity: 1; }
  .nav-btn { width: 38px; height: 38px; border-radius: 50%; background: rgba(184,154,110,0.1); border: 1px solid rgba(184,154,110,0.3); color: #b89a6e; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
  .nav-btn:hover:not(:disabled) { background: rgba(184,154,110,0.2); transform: scale(1.02); }
  .nav-btn:disabled { opacity: 0.2; cursor: not-allowed; }
  .nav-dots { display: flex; gap: 6px; }
  .dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(0,0,0,0.12); cursor: pointer; transition: all 0.3s; }
  .dot.active { background: #b89a6e; transform: scale(1.3); box-shadow: 0 0 6px rgba(184,154,110,0.5); }
  
  /* Cassette screen */
  .cassette { flex-direction: column; gap: 1.5rem; background: radial-gradient(ellipse at 50% 55%, #fef7ef, #f9efdf); }
  .cassette-title { font-family: 'Playfair Display', serif; font-size: 1.2rem; color: #3c3326; letter-spacing: 0.05em; }
  .cassette-sub { font-size: 0.7rem; letter-spacing: 0.2em; color: #b89a6e; text-transform: uppercase; }
  .cassette-icon { cursor: pointer; transition: transform 0.3s, filter 0.3s; }
  .cassette-icon:hover { transform: scale(1.02) translateY(-3px); }
  .cassette-icon.eject { animation: eject 0.6s forwards; pointer-events: none; }
  @keyframes eject { 0% { transform: translateY(0) scale(1); opacity: 1; } 30% { transform: translateY(-12px) scale(1.02); } 100% { transform: translateY(40px) scale(0.6); opacity: 0; } }
  .cassette-skip { font-size: 0.65rem; color: rgba(60,51,38,0.3); text-transform: uppercase; letter-spacing: 0.2em; cursor: pointer; transition: color 0.2s; }
  .cassette-skip:hover { color: rgba(60,51,38,0.6); }
  
  /* TV Modal */
  .tv-modal { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.92); display: flex; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.4s; }
  .tv-modal.active { opacity: 1; pointer-events: auto; }
  .tv-frame { position: relative; width: min(90vw, 560px); background: #2a251e; border-radius: 20px 20px 28px 28px; padding: 16px 20px 32px; box-shadow: 0 20px 40px rgba(0,0,0,0.5), 0 0 0 2px #5e4e38, 0 0 0 6px #1f1b14; }
  .tv-screen { background: #0f0e0a; border-radius: 12px; padding: 6px; }
  .tv-screen-inner { position: relative; border-radius: 8px; overflow: hidden; aspect-ratio: 4/3; background: #000; }
  .tv-static { position: absolute; inset: 0; background: #555; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E"); transition: opacity 0.6s; z-index: 5; }
  .tv-static.hide { opacity: 0; }
  .tv-video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 2; }
  .tv-iframe { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 2; border: none; display: none; }
  .tv-led { position: absolute; bottom: -14px; right: 16px; width: 6px; height: 6px; border-radius: 50%; background: #2a251e; transition: all 0.3s; }
  .tv-led.on { background: #2eff5e; box-shadow: 0 0 8px #2eff5e; }
  .tv-knobs { display: flex; justify-content: center; gap: 10px; margin-top: 8px; }
  .tv-knob { width: 22px; height: 22px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #6b5a48, #4a3e30); box-shadow: 0 1px 3px rgba(0,0,0,0.5); }
  .tv-brand { text-align: center; margin-top: 6px; font-family: monospace; font-size: 0.5rem; letter-spacing: 0.3em; color: #5e4e38; text-transform: uppercase; }
  .tv-close { position: absolute; top: -12px; right: -12px; width: 28px; height: 28px; border-radius: 50%; background: #3c3326; border: 1px solid #b89a6e; color: #e4c87a; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; z-index: 15; }
  .tv-close:hover { background: #b3472c; color: white; }
  
  /* Feedback */
  .feedback { flex-direction: column; padding: 1.5rem; background: radial-gradient(ellipse at 50% 30%, #fef7ef, #f9efdf); overflow-y: auto; }
  .feedback-card { background: rgba(255,252,245,0.85); backdrop-filter: blur(10px); border: 1px solid rgba(184,154,110,0.3); border-radius: 24px; padding: 2rem; max-width: 460px; width: 100%; box-shadow: 0 20px 40px -12px rgba(0,0,0,0.1); }
  .feedback-title { font-family: 'Playfair Display', serif; font-size: 1.4rem; color: #3c3326; text-align: center; margin-bottom: 0.25rem; }
  .feedback-sub { color: #a88d66; font-size: 0.7rem; text-align: center; margin-bottom: 1.5rem; }
  .stars { display: flex; justify-content: center; gap: 0.5rem; margin-bottom: 1rem; }
  .star { font-size: 1.8rem; cursor: pointer; color: rgba(60,51,38,0.1); transition: all 0.1s; }
  .star.active { color: #e4c87a; text-shadow: 0 0 6px rgba(228,200,122,0.4); transform: scale(1.05); }
  .feedback-input { width: 100%; padding: 0.8rem; background: rgba(255,255,255,0.6); border: 1px solid rgba(184,154,110,0.4); border-radius: 12px; font-size: 0.8rem; margin-bottom: 0.8rem; outline: none; font-family: inherit; color: #2e2a24; }
  .feedback-input:focus { border-color: #b89a6e; }
  .feedback-input::placeholder { color: rgba(60,51,38,0.2); }
  textarea.feedback-input { resize: none; height: 80px; }
  .feedback-btn { width: 100%; padding: 0.8rem; background: linear-gradient(135deg, #b89a6e, #e4c87a); border: none; border-radius: 40px; color: #2e2a24; font-weight: 600; letter-spacing: 0.05em; cursor: pointer; transition: all 0.2s; }
  .feedback-btn:hover { filter: brightness(1.02); transform: scale(1.01); }
  .feedback-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .thankyou { text-align: center; }
  .thankyou-icon { font-size: 2.5rem; margin-bottom: 0.5rem; }
  .thankyou-title { font-family: 'Playfair Display', serif; font-size: 1.3rem; color: #b89a6e; margin-bottom: 0.25rem; }
  .thankyou-text { color: #6b5a48; font-size: 0.75rem; }
  
  /* Animations */
  @keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
  @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
  @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
`;

const SEASONS = [
  { name: 'Spring', bg: 'radial-gradient(ellipse at 50% 35%, #fef7ef, #f9efdf)', em: '◈' },
  { name: 'Summer', bg: 'radial-gradient(ellipse at 50% 35%, #fff4e8, #faead4)', em: '✦' },
  { name: 'Autumn', bg: 'radial-gradient(ellipse at 50% 35%, #fef0e4, #fbe6d0)', em: '⌘' },
  { name: 'Winter', bg: 'radial-gradient(ellipse at 50% 35%, #f0f4fa, #e8edf5)', em: '❄' },
];

function gd(url: string) {
  if (!url) return '';
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? `https://drive.google.com/uc?export=view&id=${match[1]}` : url;
}
function isYouTube(url: string) { return /youtu\.?be/.test(url); }
function youtubeId(url: string) {
  const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : '';
}

let audioCtx: AudioContext | null = null;
let audioReady = false;
async function initAudio() {
  if (audioReady) return true;
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    audioReady = true;
    return true;
  } catch { return false; }
}
function playFlipSound() {
  if (!audioReady) return;
  try {
    const ctx = audioCtx!;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = 1100;
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.start();
    osc.stop(now + 0.12);
  } catch {}
}

const Caption = ({ photo, index, year }: { photo: AlbumPhoto; index: number; year: string }) => {
  const season = SEASONS[index % 4];
  return (
    <div className="caption">
      <div className="caption-number">{String(index + 1).padStart(2, '0')}</div>
      <div className="caption-icon">{season.em}</div>
      <div className="caption-season">{season.name}</div>
      <div className="caption-divider" />
      <div className="caption-text">{photo.caption || 'A cherished memory'}</div>
      <div className="caption-year">{year}</div>
    </div>
  );
};

export function MothersDayJourney({ album }: { album: Album }) {
  const photos = album.photos || [];
  const videoUrl = album.video_url || '';
  const recipient = album.recipient_name || 'Mom';
  const year = new Date(album.created_at).getFullYear().toString();
  const greetingMessage = "Happy Mother's Day\nWith all our love";

  const imageUrls = useMemo(() => photos.map(p => gd(p.url || '')), [photos]);

  // Preload all images
  useEffect(() => {
    imageUrls.forEach(url => { if (url) { const img = new Image(); img.src = url; } });
  }, [imageUrls]);

  const [activeScreen, setActiveScreen] = useState<'intro' | 'greeting' | 'book' | 'cassette' | 'feedback'>('intro');
  const [introVisible, setIntroVisible] = useState(false);
  const [greetingReady, setGreetingReady] = useState(false);
  const [coverOpen, setCoverOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [flipDirection, setFlipDirection] = useState<'fwd' | 'bwd' | null>(null);
  const [flipFromPage, setFlipFromPage] = useState(0);
  const [isBusy, setIsBusy] = useState(false);
  const [navVisible, setNavVisible] = useState(false);
  const [tvActive, setTvActive] = useState(false);
  const [tvStaticOn, setTvStaticOn] = useState(true);
  const [tvLedOn, setTvLedOn] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackName, setFeedbackName] = useState('');
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<HTMLCanvasElement>(null);
  const typewriterRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const flipElementRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);

  const currentSeason = SEASONS[currentPage % 4];
  const progress = activeScreen === 'intro' ? 5 : activeScreen === 'greeting' ? 18 : activeScreen === 'book' ? 35 + (currentPage / Math.max(1, photos.length - 1)) * 45 : activeScreen === 'cassette' ? 85 : 98;

  // Background music
  useEffect(() => {
    const musicUrl = (album as any).background_music_url;
    if (!musicUrl) return;
    const audio = new Audio(musicUrl);
    audio.loop = true;
    audio.volume = 0.25;
    const playMusic = () => {
      audio.play().catch(() => {});
      document.removeEventListener('click', playMusic);
      document.removeEventListener('touchstart', playMusic);
    };
    document.addEventListener('click', playMusic);
    document.addEventListener('touchstart', playMusic);
    return () => {
      audio.pause();
      audio.src = '';
      document.removeEventListener('click', playMusic);
      document.removeEventListener('touchstart', playMusic);
    };
  }, [album]);

  // Init audio context on first interaction
  useEffect(() => {
    const handler = () => { initAudio(); document.removeEventListener('click', handler); };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // Inject CSS
  useEffect(() => {
    let style = document.getElementById('journey-css') as HTMLStyleElement;
    if (!style) {
      style = document.createElement('style');
      style.id = 'journey-css';
      document.head.appendChild(style);
    }
    style.textContent = CSS;
  }, []);

  // Intro stars
  useEffect(() => {
    if (activeScreen !== 'intro') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let animationId: number;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const stars: Array<{ x: number; y: number; r: number; alpha: number; delta: number }> = [];
    for (let i = 0; i < 180; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.2 + 0.3,
        alpha: Math.random(),
        delta: (Math.random() * 0.006 + 0.001) * (Math.random() > 0.5 ? 1 : -1),
      });
    }
    setTimeout(() => setIntroVisible(true), 800);

    function draw() {
      animationId = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const s of stars) {
        s.alpha += s.delta;
        if (s.alpha > 0.8 || s.alpha < 0.1) s.delta *= -1;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(60,51,38,${0.08 + s.alpha * 0.12})`;
        ctx.fill();
      }
      if (Math.random() < 0.008) {
        const x = Math.random() * canvas.width * 0.7;
        const y = Math.random() * canvas.height * 0.3;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 20, y + 30);
        ctx.lineTo(x + 20, y + 30);
        ctx.fillStyle = `rgba(184,154,110,0.15)`;
        ctx.fill();
      }
    }
    draw();
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, [activeScreen]);

  // Typewriter effect
  useEffect(() => {
    if (activeScreen !== 'greeting') return;
    const el = typewriterRef.current;
    if (!el) return;
    el.innerHTML = '';
    setGreetingReady(false);
    let i = 0;
    const timer = setInterval(() => {
      if (i >= greetingMessage.length) {
        clearInterval(timer);
        setTimeout(() => setGreetingReady(true), 400);
        return;
      }
      const ch = greetingMessage[i++];
      if (ch === '\n') el.innerHTML += '<br>';
      else {
        el.innerHTML += ch;
        if (audioReady) {
          try {
            const ctx = audioCtx!;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 1600;
            gain.gain.setValueAtTime(0.015, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
            osc.start();
            osc.stop(ctx.currentTime + 0.05);
          } catch {}
        }
      }
    }, 48);
    return () => clearInterval(timer);
  }, [activeScreen, greetingMessage]);

  // Book particles
  useEffect(() => {
    if (activeScreen !== 'book') return;
    const canvas = particlesRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let anim: number;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const particles: Array<{ x: number; y: number; vx: number; vy: number; size: number; char: string; life: number; maxLife: number; angle: number; spin: number }> = [];
    let frame = 0;
    function add() {
      particles.push({
        x: Math.random() * canvas.width,
        y: canvas.height + 8,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -0.7 - Math.random() * 1,
        size: 12 + Math.random() * 10,
        char: currentSeason.em,
        life: 0,
        maxLife: 140 + Math.random() * 80,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.02,
      });
    }
    for (let i = 0; i < 6; i++) add();
    function drawParticles() {
      anim = requestAnimationFrame(drawParticles);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;
      if (frame % 35 === 0) add();
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        p.angle += p.spin;
        const alpha = p.life < 25 ? p.life / 25 : p.life > p.maxLife - 25 ? (p.maxLife - p.life) / 25 : 0.45;
        if (p.life > p.maxLife || p.y < -40) { particles.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.font = `${p.size}px "Times New Roman", serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#b89a6e';
        ctx.fillText(p.char, 0, 0);
        ctx.restore();
      }
    }
    drawParticles();
    return () => {
      cancelAnimationFrame(anim);
      window.removeEventListener('resize', resize);
    };
  }, [activeScreen, currentSeason]);

  // Preload adjacent pages
  useEffect(() => {
    const next = currentPage + 1;
    if (next < imageUrls.length && imageUrls[next]) {
      const img = new Image();
      img.src = imageUrls[next];
    }
    const prev = currentPage - 1;
    if (prev >= 0 && imageUrls[prev]) {
      const img = new Image();
      img.src = imageUrls[prev];
    }
  }, [currentPage, imageUrls]);

  const flipPage = useCallback(async (direction: 'fwd' | 'bwd') => {
    if (isBusy || !coverOpen || flipDirection) return;
    const target = direction === 'fwd' ? currentPage + 1 : currentPage - 1;
    if (target < 0 || target >= photos.length) return;

    const targetUrl = imageUrls[target];
    if (targetUrl) {
      const img = new Image();
      img.src = targetUrl;
      await img.decode().catch(() => {});
    }

    setIsBusy(true);
    setFlipFromPage(currentPage);
    setFlipDirection(direction);
    playFlipSound();

    setTimeout(() => {
      setCurrentPage(target);
      setFlipDirection(null);
      setIsBusy(false);
      if (direction === 'fwd' && target === photos.length - 1) {
        setTimeout(() => setActiveScreen(videoUrl ? 'cassette' : 'feedback'), 700);
      }
    }, 560);
  }, [isBusy, coverOpen, flipDirection, currentPage, photos.length, imageUrls, videoUrl]);

  // Listen to animation end for more accurate flip
  useEffect(() => {
    const el = flipElementRef.current;
    if (!el) return;
    const onEnd = () => {
      if (flipDirection === 'fwd') setCurrentPage(prev => prev + 1);
      else if (flipDirection === 'bwd') setCurrentPage(prev => prev - 1);
      setFlipDirection(null);
      setIsBusy(false);
    };
    el.addEventListener('animationend', onEnd);
    return () => el.removeEventListener('animationend', onEnd);
  }, [flipDirection]);

  const openCover = useCallback(() => {
    if (coverOpen || isBusy) return;
    initAudio();
    setIsBusy(true);
    setCoverOpen(true);
    setTimeout(() => {
      setNavVisible(true);
      setIsBusy(false);
    }, 1000);
  }, [coverOpen, isBusy]);

  const openTV = () => {
    const cassetteEl = document.querySelector('.cassette-icon');
    cassetteEl?.classList.add('eject');
    setTimeout(() => {
      setTvActive(true);
      setTvStaticOn(true);
      setTvLedOn(false);
      setTimeout(() => {
        setTvStaticOn(false);
        setTvLedOn(true);
        if (videoUrl) {
          if (isYouTube(videoUrl)) {
            const iframe = iframeRef.current;
            if (iframe) {
              iframe.src = `https://www.youtube-nocookie.com/embed/${youtubeId(videoUrl)}?autoplay=1&controls=1&rel=0`;
              iframe.style.display = 'block';
            }
          } else {
            const video = videoRef.current;
            if (video) {
              video.src = gd(videoUrl);
              video.muted = false;
              video.play().catch(() => { if (video) video.muted = true; video.play(); });
            }
          }
        }
      }, 800);
    }, 500);
  };

  const closeTV = () => {
    setTvActive(false);
    setTvStaticOn(true);
    setTvLedOn(false);
    if (videoRef.current) { videoRef.current.pause(); videoRef.current.src = ''; }
    if (iframeRef.current) { iframeRef.current.src = ''; iframeRef.current.style.display = 'none'; }
    document.querySelector('.cassette-icon')?.classList.remove('eject');
    setActiveScreen('feedback');
  };

  const submitFeedback = async () => {
    if (!rating) { alert('Please select a rating'); return; }
    setFeedbackLoading(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          album_id: album.id,
          rating,
          comment: feedbackComment.trim() || (feedbackName ? `From ${feedbackName}` : 'Sent with love'),
        }),
      });
      if (!res.ok) throw new Error();
      setFeedbackSent(true);
    } catch {
      alert('Could not send feedback. Please try again.');
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!coverOpen) { openCover(); return; }
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 35) flipPage(delta < 0 ? 'fwd' : 'bwd');
  };

  return (
    <>
      <div className="grain" />
      <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>

      {/* INTRO */}
      <div className={`screen intro ${activeScreen === 'intro' ? 'active' : ''}`} onClick={() => setActiveScreen('greeting')}>
        <canvas ref={canvasRef} className="intro-canvas" />
        <div className={`intro-content ${introVisible ? 'visible' : ''}`}>
          <div className="intro-title">To the world, you are a mother.<br /><span style={{ fontSize: '0.7em', opacity: 0.7 }}>To our family, you are the world.</span></div>
          <div className="intro-sub">Begin your journey</div>
        </div>
        <div className="intro-tap">TAP TO OPEN</div>
      </div>

      {/* GREETING */}
      <div className={`screen greeting ${activeScreen === 'greeting' ? 'active' : ''}`}>
        <div className="greeting-card">
          <div className="greeting-label">A MESSAGE FOR YOU</div>
          <div className="greeting-text" ref={typewriterRef}><span className="cursor" /></div>
          <div className={`greeting-cta ${greetingReady ? 'visible' : ''}`} onClick={() => { if (greetingReady) setActiveScreen('book'); }}>OPEN YOUR ALBUM →</div>
        </div>
      </div>

      {/* BOOK */}
      <div className={`screen book ${activeScreen === 'book' ? 'active' : ''}`}>
        <div className="book-bg" style={{ background: currentSeason.bg }} />
        <canvas ref={particlesRef} className="book-particles" />
        <div className="book-container">
          <div className="book-season">{currentSeason.name.toUpperCase()} ✦</div>
          <div className="book-wrapper">
            <div className="book-shadow" />
            <div className="book-3d" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
              {/* Static spread */}
              <div className="spread">
                <div className="spread-left">
                  {photos[currentPage] && <Caption photo={photos[currentPage]} index={currentPage} year={year} />}
                </div>
                <div className="spread-right" onClick={() => { if (coverOpen && !isBusy) flipPage('fwd'); }}>
                  {imageUrls[currentPage] && <img src={imageUrls[currentPage]} alt="" />}
                </div>
              </div>
              <div className="spine" />

              {/* Flip animation overlay */}
              {flipDirection && (
                <div key={flipFromPage} ref={flipElementRef} className={`flip ${flipDirection === 'fwd' ? 'flip-forward' : 'flip-backward'}`}>
                  {flipDirection === 'fwd' && (
                    <>
                      <div className="flip-front">{imageUrls[flipFromPage] && <img src={imageUrls[flipFromPage]} alt="" />}</div>
                      <div className="flip-back">{photos[flipFromPage + 1] && <Caption photo={photos[flipFromPage + 1]} index={flipFromPage + 1} year={year} />}</div>
                    </>
                  )}
                  {flipDirection === 'bwd' && (
                    <>
                      <div className="flip-front-caption">{photos[flipFromPage] && <Caption photo={photos[flipFromPage]} index={flipFromPage} year={year} />}</div>
                      <div className="flip-back-photo">{imageUrls[flipFromPage] && <img src={imageUrls[flipFromPage]} alt="" />}</div>
                    </>
                  )}
                </div>
              )}

              {/* Cover */}
              <div className={`cover ${coverOpen ? 'open' : ''}`} onClick={() => { if (!coverOpen) openCover(); }}>
                <div className="cover-front">
                  <div style={{ fontSize: '2rem', fontWeight: 300 }}>📖</div>
                  <div style={{ width: 50, height: 1, background: 'linear-gradient(90deg, transparent, #b89a6e, transparent)', margin: '0.5rem 0' }} />
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(0.9rem, 3vw, 1.3rem)', color: '#3c3326', textAlign: 'center', padding: '0 1rem' }}>
                    For the Most Wonderful<br /><em style={{ color: '#b89a6e' }}>{recipient}</em>
                  </div>
                  <div style={{ width: 50, height: 1, background: 'linear-gradient(90deg, transparent, #b89a6e, transparent)', margin: '0.5rem 0' }} />
                  <div style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: '#b89a6e', textTransform: 'uppercase' }}>{year}</div>
                  {!coverOpen && <div style={{ position: 'absolute', bottom: 12, fontSize: '0.55rem', color: 'rgba(60,51,38,0.3)', letterSpacing: '0.2em', animation: 'pulse 2s infinite' }}>TAP TO OPEN</div>}
                </div>
                <div className="cover-back" />
              </div>
            </div>
          </div>
          <nav className={`nav ${navVisible ? 'visible' : ''}`}>
            <button className="nav-btn" disabled={currentPage === 0 || isBusy} onClick={() => flipPage('bwd')}>←</button>
            <div className="nav-dots">
              {photos.map((_, idx) => (
                <div key={idx} className={`dot ${idx === currentPage ? 'active' : ''}`} onClick={() => { if (!isBusy && coverOpen && idx !== currentPage) flipPage(idx > currentPage ? 'fwd' : 'bwd'); }} />
              ))}
            </div>
            <button className="nav-btn" disabled={isBusy} onClick={() => { if (currentPage < photos.length - 1) flipPage('fwd'); else setActiveScreen(videoUrl ? 'cassette' : 'feedback'); }}>→</button>
          </nav>
        </div>
      </div>

      {/* CASSETTE */}
      <div className={`screen cassette ${activeScreen === 'cassette' ? 'active' : ''}`}>
        <div className="cassette-title">One Last Surprise</div>
        <div className="cassette-sub">press play to watch</div>
        <div className="cassette-icon" onClick={openTV}>
          <svg width="260" height="160" viewBox="0 0 260 160" fill="none">
            <rect x="8" y="16" width="244" height="128" rx="12" fill="#e9dbc9" stroke="#b89a6e" strokeWidth="1.2" />
            <rect x="16" y="24" width="228" height="104" rx="8" fill="#fef7ef" />
            <rect x="28" y="34" width="204" height="56" rx="6" fill="#f4ede3" stroke="#d4c2a8" strokeWidth="0.8" />
            <text x="130" y="62" fontFamily="'Playfair Display', serif" fontSize="12" fill="#b89a6e" textAnchor="middle" letterSpacing="4">MEMORIES</text>
            <text x="130" y="78" fontFamily="sans-serif" fontSize="7" fill="#a88d66" textAnchor="middle" letterSpacing="2">WITH LOVE</text>
            <rect x="36" y="106" width="72" height="22" rx="4" fill="#e9dbc9" stroke="#b89a6e" strokeWidth="0.6" />
            <rect x="152" y="106" width="72" height="22" rx="4" fill="#e9dbc9" stroke="#b89a6e" strokeWidth="0.6" />
            <circle cx="72" cy="117" r="8" fill="#f4ede3" stroke="#b89a6e" strokeWidth="0.6" /><circle cx="72" cy="117" r="3" fill="#b89a6e" />
            <circle cx="188" cy="117" r="8" fill="#f4ede3" stroke="#b89a6e" strokeWidth="0.6" /><circle cx="188" cy="117" r="3" fill="#b89a6e" />
          </svg>
        </div>
        <div className="cassette-skip" onClick={() => setActiveScreen('feedback')}>Skip →</div>
      </div>

      {/* TV MODAL */}
      <div className={`tv-modal ${tvActive ? 'active' : ''}`}>
        <div className="tv-frame">
          <div className="tv-screen">
            <div className="tv-screen-inner">
              <div className={`tv-static ${tvStaticOn ? '' : 'hide'}`} />
              <video ref={videoRef} className="tv-video" playsInline controls onEnded={closeTV} />
              <iframe ref={iframeRef} className="tv-iframe" allow="autoplay" title="Video" />
            </div>
          </div>
          <div className="tv-knobs"><div className="tv-knob" /><div className="tv-knob" /></div>
          <div className="tv-brand">MEMÓRIA</div>
          <div className={`tv-led ${tvLedOn ? 'on' : ''}`} />
          <div className="tv-close" onClick={closeTV}>✕</div>
        </div>
      </div>

      {/* FEEDBACK */}
      <div className={`screen feedback ${activeScreen === 'feedback' ? 'active' : ''}`}>
        <div className="feedback-card">
          {!feedbackSent ? (
            <>
              <div className="feedback-title">How Did We Do?</div>
              <div className="feedback-sub">Your voice means everything</div>
              <div className="stars">
                {[1, 2, 3, 4, 5].map(n => (
                  <span key={n} className={`star ${n <= rating ? 'active' : ''}`} onClick={() => setRating(n)}>★</span>
                ))}
              </div>
              <input className="feedback-input" placeholder="Your name (optional)" value={feedbackName} onChange={e => setFeedbackName(e.target.value)} />
              <textarea className="feedback-input" placeholder="Leave a message of love..." value={feedbackComment} onChange={e => setFeedbackComment(e.target.value)} />
              <button className="feedback-btn" disabled={feedbackLoading} onClick={submitFeedback}>{feedbackLoading ? 'Sending...' : 'Send Love'}</button>
            </>
          ) : (
            <div className="thankyou">
              <div className="thankyou-icon">💝</div>
              <div className="thankyou-title">Thank You</div>
              <div className="thankyou-text">Your message has been received with love.</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}