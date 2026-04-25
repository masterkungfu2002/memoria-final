import Link from "next/link";
import type { Album } from "@/lib/types";
import { MemoraQrExperience } from "@/components/album/MemoraQrExperience";
import { headers } from "next/headers";

function resolveInitialProfile(album: Album): "genz" | "classic" {
  return album.profile_mode === "genz" ? "genz" : "classic";
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const raw =
    (typeof sp.albumId === "string" ? sp.albumId : "") ||
    (typeof sp.album === "string" ? sp.album : "") ||
    (typeof sp.id === "string" ? sp.id : "");
  const albumId = raw.trim();

  if (albumId) {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "http";
    const baseUrl = host ? `${proto}://${host}` : "http://localhost:3000";
    const res = await fetch(new URL(`/api/album/${encodeURIComponent(albumId)}`, baseUrl), {
      cache: "no-store",
    });
    if (res.ok) {
      const album = (await res.json()) as Album;
      return <MemoraQrExperience album={album} initialProfile={resolveInitialProfile(album)} />;
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(212,168,75,.12),transparent_30%),linear-gradient(180deg,#050404,#130d0b)] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl space-y-6 text-center">
        <p className="text-[11px] uppercase tracking-[0.36em] text-[#d4a84b]">MEMORA</p>
        <h1 className="font-serif text-4xl">Private Memory Archive</h1>
        <p className="text-white/60 text-sm leading-relaxed">
          Open a private QR memory experience or manage albums from the dashboard.
        </p>
        <div className="flex gap-3">
          <Link
            className="flex-1 rounded-full bg-[#d4a84b] px-5 py-3 text-center text-[11px] tracking-[0.26em] uppercase text-black"
            href="/admin"
          >
            Admin
          </Link>
          <Link
            className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-center text-[11px] tracking-[0.26em] uppercase text-white/80"
            href="/login"
          >
            Login
          </Link>
        </div>
      </div>
    </main>
  );
}
