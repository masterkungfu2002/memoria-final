"use client";

import { motion } from "framer-motion";

export function HookPhase({
  onStart,
  recipientName,
}: {
  onStart: () => void;
  recipientName: string;
}) {
  const stars = Array.from({ length: 16 }, (_, i) => ({
    x: `${(i * 13) % 100}vw`,
    duration: 2.5 + (i % 5) * 0.7,
    delay: i * 0.18,
  }));

  return (
    <section className="relative min-h-screen overflow-hidden bg-black flex items-center justify-center px-6">
      {stars.map((star, i) => (
        <motion.span
          key={i}
          className="absolute h-1 w-1 rounded-full bg-white/70"
          initial={{ x: star.x, y: -20, opacity: 0.2 }}
          animate={{ y: "110vh", opacity: [0.2, 1, 0] }}
          transition={{ duration: star.duration, repeat: Infinity, delay: star.delay }}
        />
      ))}
      <div className="z-10 text-center space-y-5 max-w-md">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.6 }}
          className="serif-title text-3xl text-zinc-100"
        >
          A special memory for you, {recipientName}...
        </motion.h1>
        <motion.button
          onClick={onStart}
          whileTap={{ scale: 0.98 }}
          className="rounded-full px-6 py-3 border border-zinc-500 bg-zinc-900/70 shadow-[0_0_30px_rgba(255,255,255,0.15)]"
        >
          Tap to open your memories
        </motion.button>
      </div>
    </section>
  );
}
