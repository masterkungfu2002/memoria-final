import type { Album } from "@/lib/types";
import { MothersDayJourney } from "@/components/journey/MothersDayJourney";
import { headers } from "next/headers";

export default async function AlbumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const baseUrl = host ? `${proto}://${host}` : "http://localhost:3000";
  const res = await fetch(new URL(`/api/album/${encodeURIComponent(id)}`, baseUrl), { cache: "no-store" });
  if (res.ok) {
    const album = (await res.json()) as Album;
    return <MothersDayJourney album={album} />;
  }
  const j = (await res.json().catch(() => null)) as { error?: string } | null;
  const msg = j?.error ?? "Album not found.";
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl text-center space-y-3">
        <p className="font-serif text-2xl">Could not open this album</p>
        <p className="text-xs text-red-300/90">{msg}</p>
      </div>
    </main>
  );
}
