"use client";

export function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} onClick={() => onChange(n)} className="text-3xl" type="button" aria-label={`Rate ${n}`}>
          {n <= value ? "★" : "☆"}
        </button>
      ))}
    </div>
  );
}
