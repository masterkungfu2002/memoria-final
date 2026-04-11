"use client";

export function MemoraLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[#04040c] text-[#f3ecdf] px-8">
      <div
        className="h-14 w-14 rounded-full border-2 border-[#f3ecdf]/25 border-t-[#e8c48a] animate-spin"
        style={{ animationDuration: "1.15s" }}
        aria-hidden
      />
      <div className="text-center space-y-2 max-w-md memora-serif">
        <p className="text-xs uppercase tracking-[0.35em] text-[#f3ecdf]/55">Memora Premium</p>
        <p className="text-lg text-[#f3ecdf]/90">Gathering light and memory…</p>
      </div>
    </div>
  );
}
