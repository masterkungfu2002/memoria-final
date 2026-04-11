import type { Feedback } from "@/lib/types";

export function FeedbackPanel({ feedbacks }: { feedbacks: Feedback[] }) {
  return (
    <section className="rounded-xl border border-zinc-800 p-4 space-y-3">
      <h2 className="text-xl font-semibold">Feedbacks</h2>
      <div className="space-y-2">
        {feedbacks.map((fb) => (
          <div key={fb.id} className="rounded-lg border border-zinc-800 p-3">
            <p className="text-amber-300">{"★".repeat(fb.rating)}{"☆".repeat(5 - fb.rating)}</p>
            {fb.comment ? <p className="text-zinc-200 mt-1">{fb.comment}</p> : null}
            <p className="text-xs text-zinc-500 mt-2">{new Date(fb.created_at).toLocaleString()}</p>
          </div>
        ))}
        {feedbacks.length === 0 ? <p className="text-zinc-400">No feedback yet.</p> : null}
      </div>
    </section>
  );
}
