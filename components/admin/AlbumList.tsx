"use client";

import Link from "next/link";
import type { Album } from "@/lib/types";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function AlbumList({ albums }: { albums: Album[] }) {
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const siteUrl = typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");

  useEffect(() => {
    const generateQRs = async () => {
      const qrs: Record<string, string> = {};
      for (const album of albums) {
        const url = `${siteUrl}/album/${album.id}`;
        try {
          qrs[album.id] = await QRCode.toDataURL(url, {
            margin: 2,
            width: 160,
            color: { dark: "#ffffff", light: "#18181b" },
          });
        } catch (err) {
          console.error(err);
        }
      }
      setQrCodes(qrs);
    };
    generateQRs();
  }, [albums, siteUrl]);

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Your Memory Albums</h2>
        <span className="px-3 py-1 rounded-full bg-zinc-800 text-xs text-zinc-400 font-medium">
          {albums.length} Total
        </span>
      </div>
      
      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
        {albums.map((album) => {
          const url = `${siteUrl}/album/${album.id}`;
          return (
            <div key={album.id} className="group relative rounded-xl border border-zinc-800 bg-zinc-900 p-5 hover:border-zinc-700 transition-all">
              <div className="flex gap-5">
                {qrCodes[album.id] ? (
                  <div className="flex flex-col items-center gap-2">
                    <img src={qrCodes[album.id]} alt="QR Code" className="w-24 h-24 rounded-lg border border-zinc-700 p-1" />
                    <a href={qrCodes[album.id]} download={`qr-${album.recipient_name}.png`} className="text-[10px] text-zinc-500 hover:text-zinc-300 uppercase tracking-widest">
                      Download QR
                    </a>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-lg bg-zinc-800 animate-pulse" />
                )}
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-zinc-100">{album.recipient_name}</h3>
                    <Link href={`/admin/albums/${album.id}/edit`} className="text-[10px] text-amber-400 hover:text-amber-300 uppercase tracking-widest font-bold">
                      Edit Album
                    </Link>
                  </div>
                  <p className="text-xs text-zinc-500">{new Date(album.created_at).toLocaleDateString()}</p>
                  <div className="pt-2 flex flex-col gap-2">
                    <Link className="text-xs text-sky-400 hover:text-sky-300 truncate block" href={`/album/${album.id}`} target="_blank">
                      {url}
                    </Link>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(url);
                        alert("Link copied!");
                      }}
                      className="text-[10px] text-zinc-500 hover:text-zinc-300 uppercase tracking-widest text-left"
                    >
                      Copy Link
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {albums.length === 0 ? (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-zinc-800 rounded-2xl">
            <p className="text-zinc-500 italic">No albums created yet.</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
