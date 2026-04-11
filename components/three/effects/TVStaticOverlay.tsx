"use client";

export function TVStaticOverlay({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(255,255,255,0.2)_1px,_transparent_1px)] [background-size:3px_3px] animate-pulse pointer-events-none" />
  );
}
