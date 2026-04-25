"use client";

import Link from "next/link";
import Image from "next/image";
import type { Album } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

export function AlbumList({ albums }: { albums: Album[] }) {
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const siteUrl = typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const sortedAlbums = useMemo(() => albums ?? [], [albums]);

  useEffect(() => {
    const generateQRs = async () => {
      const qrs: Record<string, string> = {};
      for (const album of sortedAlbums) {
        const url = `${siteUrl}/album/${album.id}?profile=classic`;
        qrs[album.id] = await QRCode.toDataURL(url, {
          margin: 2,
          width: 180,
          color: { dark: "#111111", light: "#ffffff" },
        });
      }
      setQrCodes(qrs);
    };
    generateQRs().catch(() => undefined);
  }, [siteUrl, sortedAlbums]);

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-500">Memora Studio</p>
          <h2 className="mt-2 text-2xl font-bold text-white">Orders and QR albums</h2>
        </div>
        <span className="rounded-full bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300">{sortedAlbums.length} total</span>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {sortedAlbums.map((album) => {
          const classicUrl = `${siteUrl}/album/${album.id}?profile=classic`;
          const genzUrl = `${siteUrl}/album/${album.id}?profile=genz`;
          const setupUrl = `${siteUrl}/setup/${album.id}`;
          return (
            <article key={album.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/55 p-5">
              <div className="grid gap-5 sm:grid-cols-[130px_1fr]">
                <div>
                  {qrCodes[album.id] ? (
                    <Image src={qrCodes[album.id]} alt="QR code" width={130} height={130} className="rounded-xl bg-white p-2" unoptimized />
                  ) : (
                    <div className="h-[130px] w-[130px] rounded-xl bg-zinc-900" />
                  )}
                  {qrCodes[album.id] ? (
                    <a href={qrCodes[album.id]} download={`memora-${album.recipient_name || album.id}.png`} className="mt-2 block text-center text-[10px] uppercase tracking-widest text-zinc-500 hover:text-zinc-300">
                      Download QR
                    </a>
                  ) : null}
                </div>
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-semibold text-zinc-100">{album.recipient_name || "Untitled"}</h3>
                      <p className="mt-1 text-xs text-zinc-500">{new Date(album.created_at).toLocaleDateString()}</p>
                    </div>
                    <Link href={`/admin/albums/${album.id}/edit`} className="rounded-full border border-amber-300/30 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-amber-200">
                      Edit
                    </Link>
                  </div>

                  <div className="mt-4 grid gap-2 text-xs">
                    <Link className="truncate rounded-xl bg-zinc-900 px-3 py-2 text-sky-300" href={classicUrl} target="_blank">
                      Classic: {classicUrl}
                    </Link>
                    <Link className="truncate rounded-xl bg-zinc-900 px-3 py-2 text-sky-300" href={genzUrl} target="_blank">
                      Genz: {genzUrl}
                    </Link>
                    <Link className="truncate rounded-xl bg-zinc-900 px-3 py-2 text-amber-200" href={setupUrl} target="_blank">
                      Setup: {setupUrl}
                    </Link>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => navigator.clipboard.writeText(classicUrl)} className="rounded-full border border-zinc-700 px-3 py-2 text-xs text-zinc-300">
                      Copy Classic
                    </button>
                    <button type="button" onClick={() => navigator.clipboard.writeText(genzUrl)} className="rounded-full border border-zinc-700 px-3 py-2 text-xs text-zinc-300">
                      Copy Genz
                    </button>
                    <button type="button" onClick={() => navigator.clipboard.writeText(setupUrl)} className="rounded-full border border-zinc-700 px-3 py-2 text-xs text-zinc-300">
                      Copy Setup
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}

        {sortedAlbums.length === 0 ? (
          <div className="col-span-full rounded-3xl border-2 border-dashed border-zinc-800 py-20 text-center">
            <p className="text-zinc-500">No albums created yet.</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
