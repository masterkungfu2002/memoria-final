import Link from "next/link";
import type { Album } from "@/lib/types";
import { MothersDayJourney } from "@/components/journey/MothersDayJourney";
import { headers } from "next/headers";

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
    const res = await fetch(new URL(`/api/album/${encodeURIComponent(albumId)}`, baseUrl), { cache: "no-store" });
    if (res.ok) {
      const album = (await res.json()) as Album;
      return <MothersDayJourney album={album} />;
    }
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl space-y-6">
        <h1 className="font-serif text-3xl">Mother&apos;s Day</h1>
        <p className="text-white/60 text-sm leading-relaxed">
          Scan a QR code to open an album. Admins can create albums and share links from the dashboard.
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
