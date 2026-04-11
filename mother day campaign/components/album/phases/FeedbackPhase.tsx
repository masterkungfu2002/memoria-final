"use client";

import { useState } from "react";
import { StarRating } from "@/components/album/ui/StarRating";

export function FeedbackPhase({
  albumId,
  onSubmitted,
}: {
  albumId: string;
  onSubmitted: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!rating) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        album_id: albumId,
        rating,
        comment,
      }),
    });

    const json = (await res.json()) as { ok?: boolean; error?: string };
    setLoading(false);

    if (!res.ok) {
      setError(json.error ?? `Gửi thất bại (${res.status})`);
      return;
    }

    onSubmitted();
  }

  return (
    <section className="min-h-screen bg-black/90 backdrop-blur-sm flex items-center justify-center px-6">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-900/70 p-6 space-y-4">
        <h2 className="text-2xl serif-title">How did this make you feel?</h2>
        <StarRating value={rating} onChange={setRating} />
        <textarea
          className="w-full min-h-28 rounded-lg border border-zinc-700 bg-transparent p-3"
          placeholder="Share your feelings..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <button
          onClick={handleSubmit}
          disabled={!rating || loading}
          className="rounded-lg bg-white text-black px-4 py-2 disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </div>
    </section>
  );
}
