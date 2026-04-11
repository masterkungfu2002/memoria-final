"use client";

import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import { useMemoraStore } from "@/lib/memora-store";
import { playMechanicalClack } from "@/lib/playMechanicalClack";

export function MemoraActOne({
  onBegin,
}: {
  onBegin: () => void | Promise<void>;
}) {
  const currentAct = useMemoraStore((s) => s.currentAct);
  const studioWarm = useMemoraStore((s) => s.studioWarm);
  const setBloomFlash = useMemoraStore((s) => s.setBloomFlash);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    if (currentAct !== 1 || studioWarm) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = (canvas.width = window.innerWidth);
    const H = (canvas.height = window.innerHeight);

    const stars: { x: number; y: number; r: number; a: number; da: number }[] = [];
    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        r: Math.random() * 1.5 + 0.5,
        a: Math.random(),
        da: (Math.random() - 0.5) * 0.005,
      });
    }

    let sx = 0, sy = 0, sdx = 0, sdy = 0, sa = 0, sActive = false;
    let sTail: { x: number; y: number; a: number }[] = [];

    function launchShooter() {
      if (sActive) return;
      sActive = true;
      sx = Math.random() * 0.3 * W;
      sy = Math.random() * 0.3 * H;
      const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.3;
      const speed = W * 0.015;
      sdx = Math.cos(angle) * speed;
      sdy = Math.sin(angle) * speed;
      sa = 1;
      sTail = [];
      setTimeout(() => {
        sActive = false;
        sTail = [];
      }, 1500);
    }

    const shooterInterval = setInterval(launchShooter, 5000);
    setTimeout(launchShooter, 800);
    setTimeout(() => setShowText(true), 1500);

    let frame: number;
    function draw() {
      ctx!.clearRect(0, 0, W, H);
      stars.forEach((s) => {
        s.a = Math.max(0.1, Math.min(1, s.a + s.da));
        if (s.a <= 0.1 || s.a >= 1) s.da *= -1;
        ctx!.beginPath();
        ctx!.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(255,255,255,${s.a})`;
        ctx!.fill();
      });

      if (sActive) {
        sa -= 0.01;
        sTail.unshift({ x: sx, y: sy, a: sa });
        if (sTail.length > 25) sTail.pop();
        sx += sdx;
        sy += sdy;
        sTail.forEach((p, i) => {
          const t = 1 - i / sTail.length;
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, 2 * t, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(255,255,220,${p.a * t})`;
          ctx!.fill();
        });
        const grd = ctx!.createRadialGradient(sx, sy, 0, sx, sy, 15);
        grd.addColorStop(0, `rgba(255,255,200,${sa * 0.9})`);
        grd.addColorStop(1, "rgba(255,255,200,0)");
        ctx!.beginPath();
        ctx!.arc(sx, sy, 15, 0, Math.PI * 2);
        ctx!.fillStyle = grd;
        ctx!.fill();
      }
      frame = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      cancelAnimationFrame(frame);
      clearInterval(shooterInterval);
    };
  }, [currentAct, studioWarm]);

  if (currentAct !== 1 || studioWarm) return null;

  function triggerBegin() {
    playMechanicalClack();
    const flash = { v: 0 };
    const tl = gsap.timeline();
    tl.to(flash, {
      v: 1,
      duration: 0.2,
      onUpdate: () => setBloomFlash(flash.v),
    });
    tl.call(() => {
      void onBegin();
    });
    tl.to(flash, {
      v: 0,
      duration: 0.8,
      onUpdate: () => setBloomFlash(flash.v),
      onComplete: () => setBloomFlash(0),
    });
  }

  return (
    <div
      className="absolute inset-0 z-[24] flex cursor-pointer flex-col items-center justify-center bg-black overflow-hidden"
      onClick={triggerBegin}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      
      <div className={`relative z-10 text-center transition-opacity duration-1000 ${showText ? 'opacity-100' : 'opacity-0'}`}>
        <h1 className="memora-serif text-[clamp(1.8rem,6vw,3.5rem)] text-white tracking-[0.15em] drop-shadow-[0_0_30px_rgba(212,168,75,0.8)] mb-4">
          To the world, you are a mother. <br/>
          <span className="text-[0.7em] opacity-80">To our family, you are the world.</span>
        </h1>
        <p className="memora-serif text-[clamp(0.8rem,2vw,1rem)] text-[#d4a84b]/80 uppercase tracking-[0.4em] animate-pulse">
          Tap anywhere to open your gift
        </p>
      </div>

      <div className="absolute bottom-12 text-[10px] text-white/20 uppercase tracking-[0.3em] animate-bounce">
        Tap to open
      </div>
    </div>
  );
}
