"use client";

import gsap from "gsap";
import { useEffect, useRef, useState } from "react";

export function MemoraEcho({ albumId }: { albumId: string }) {
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!root.current) return;
    gsap.fromTo(root.current, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 1.1, ease: "power3.out" });
  }, []);

  async function submit() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        album_id: albumId,
        rating: rating,
        comment: message.trim() || "Sent with love",
      }),
    });

    const json = (await res.json()) as { ok?: boolean; error?: string };
    setLoading(false);

    if (!res.ok) {
      setError(json.error ?? "Could not send your message. Please try again.");
      return;
    }

    setDone(true);
  }

  return (
    <div
      ref={root}
      className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-black/75 px-6 backdrop-blur-xl"
    >
      {!done ? (
        <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#1a1612]/90 p-10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] space-y-8 text-center">
          <div className="space-y-2">
            <h2 className="memora-serif text-3xl text-[#f8f1e4]">How was your experience?</h2>
            <p className="text-[#c9bcaa]/60 text-sm tracking-widest uppercase">Your feedback means the world to us</p>
          </div>

          <div className="flex justify-center gap-4 py-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`text-3xl transition-all duration-300 transform hover:scale-125 ${
                  star <= rating ? "text-[#e8c48a] drop-shadow-[0_0_10px_rgba(232,196,138,0.5)]" : "text-white/10"
                }`}
              >
                ★
              </button>
            ))}
          </div>

          <textarea
            className="w-full min-h-32 rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-[#f4ead8] placeholder:text-[#c9bcaa]/30 focus:outline-none focus:ring-2 focus:ring-[#e8c48a]/20 transition-all"
            placeholder="Leave a message for the creator..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          {error ? <p className="text-sm text-red-400/90 animate-shake">{error}</p> : null}

          <button
            type="button"
            disabled={loading}
            onClick={() => void submit()}
            className="w-full rounded-full bg-gradient-to-r from-[#d4af37] via-[#f1d592] to-[#d4af37] px-8 py-4 text-sm font-bold uppercase tracking-[0.3em] text-[#1c130c] shadow-lg shadow-black/20 hover:shadow-[#e8c48a]/10 transition-all active:scale-95 disabled:opacity-40"
          >
            {loading ? "Sending..." : "Share your heart"}
          </button>
        </div>
      ) : (
        <div className="text-center space-y-8 animate-fade-in">
          <div className="inline-block p-4 rounded-full bg-[#e8c48a]/10 text-[#e8c48a] text-4xl animate-bounce">
            ♥
          </div>
          <p className="memora-serif text-[clamp(1.6rem,5vw,2.4rem)] text-[#f8f1e4] max-w-xl leading-relaxed px-6">
            You are loved more than words can say.
          </p>
          <p className="text-[#c9bcaa]/50 text-sm tracking-[0.4em] uppercase">Happy Mother&apos;s Day</p>
        </div>
      )}
    </div>
  );
}
