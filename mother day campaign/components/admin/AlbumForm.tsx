"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type PhotoInput = { file: File | null; caption: string };

const fileInputClass =
  "block w-full max-w-full text-sm text-zinc-200 file:mr-3 file:inline-flex file:max-w-[min(100%,18rem)] file:shrink-0 file:cursor-pointer file:rounded-md file:border file:border-zinc-600 file:bg-zinc-800 file:px-3 file:py-2 file:text-zinc-100";

function storageObjectName(original: string, index: number) {
  const ext = original.includes(".") ? original.slice(original.lastIndexOf(".")).toLowerCase() : "";
  return `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}${ext}`;
}

export function AlbumForm() {
  const [recipientName, setRecipientName] = useState("");
  const [photos, setPhotos] = useState<PhotoInput[]>(
    Array.from({ length: 6 }, () => ({ file: null, caption: "" })),
  );
  const [video, setVideo] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [albumUrl, setAlbumUrl] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const photoCount = useMemo(() => photos.filter((p) => p.file).length, [photos]);
  const canSubmit = useMemo(
    () =>
      recipientName.trim().length > 0 &&
      photoCount >= 6 &&
      photoCount <= 10 &&
      !!video &&
      !!audio &&
      !!cover,
    [audio, cover, photoCount, recipientName, video],
  );
  const missingHint = useMemo(() => {
    const parts: string[] = [];
    if (!recipientName.trim()) parts.push("tên người nhận");
    if (photoCount < 6) parts.push(`ít nhất 6 ảnh (hiện: ${photoCount})`);
    if (!cover) parts.push("ảnh bìa");
    if (!video) parts.push("video");
    if (!audio) parts.push("nhạc nền");
    return parts.length ? `Còn thiếu: ${parts.join(", ")}.` : null;
  }, [audio, cover, photoCount, recipientName, video]);

  function updatePhoto(index: number, patch: Partial<PhotoInput>) {
    setPhotos((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSubmitting(false);
      setError("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
      return;
    }

    const usedPhotos = photos.filter((p): p is { file: File; caption: string } => !!p.file);
    const albumId = crypto.randomUUID();
    const uploadBase = `${user.id}/${albumId}`;

    const uploadedPhotos: { url: string; caption: string }[] = [];
    for (let i = 0; i < usedPhotos.length; i += 1) {
      const p = usedPhotos[i];
      const path = `${uploadBase}/photos/${storageObjectName(p.file.name, i)}`;
      const { error: upErr } = await supabase.storage.from("albums-images").upload(path, p.file);
      if (upErr) {
        setSubmitting(false);
        setError(`Upload ảnh thất bại: ${upErr.message}. Kiểm tra bucket albums-images và Storage policies (cho phép user đã đăng nhập upload).`);
        return;
      }
      const { data } = supabase.storage.from("albums-images").getPublicUrl(path);
      uploadedPhotos.push({ url: data.publicUrl, caption: p.caption });
    }

    if (uploadedPhotos.length < 6 || uploadedPhotos.length > 10) {
      setSubmitting(false);
      setError(`Số ảnh sau upload không hợp lệ (${uploadedPhotos.length}). Cần 6–10 ảnh.`);
      return;
    }

    const coverPath = `${uploadBase}/cover/${storageObjectName(cover!.name, 0)}`;
    {
      const { error: upErr } = await supabase.storage.from("albums-images").upload(coverPath, cover!);
      if (upErr) {
        setSubmitting(false);
        setError(`Upload ảnh bìa thất bại: ${upErr.message}`);
        return;
      }
    }
    const { data: coverData } = supabase.storage.from("albums-images").getPublicUrl(coverPath);

    const videoPath = `${uploadBase}/video/${storageObjectName(video!.name, 0)}`;
    {
      const { error: upErr } = await supabase.storage.from("albums-videos").upload(videoPath, video!);
      if (upErr) {
        setSubmitting(false);
        setError(`Upload video thất bại: ${upErr.message}`);
        return;
      }
    }
    const { data: videoData } = supabase.storage.from("albums-videos").getPublicUrl(videoPath);

    const audioPath = `${uploadBase}/audio/${storageObjectName(audio!.name, 0)}`;
    {
      const { error: upErr } = await supabase.storage.from("albums-audio").upload(audioPath, audio!);
      if (upErr) {
        setSubmitting(false);
        setError(`Upload nhạc thất bại: ${upErr.message}`);
        return;
      }
    }
    const { data: audioData } = supabase.storage.from("albums-audio").getPublicUrl(audioPath);

    const { error: insertErr } = await supabase.from("albums").insert({
      id: albumId,
      admin_id: user.id,
      recipient_name: recipientName.trim(),
      cover_image: coverData.publicUrl,
      photos: uploadedPhotos,
      video_url: videoData.publicUrl,
      background_music_url: audioData.publicUrl,
    });

    if (insertErr) {
      setSubmitting(false);
      setError(
        `Lưu album thất bại: ${insertErr.message}. Nếu liên quan "photos" hoặ RLS, chạy lại schema SQL hoặc kiểm tra quyền bảng albums.`,
      );
      return;
    }

    const url = `${window.location.origin}/album/${albumId}`;
    setAlbumUrl(url);
    setQrDataUrl(await QRCode.toDataURL(url));
    setSubmitting(false);
  }

  return (
    <form className="relative z-0 space-y-4 rounded-xl border border-zinc-800 p-4" onSubmit={onSubmit}>
      <input
        className="w-full rounded-md border border-zinc-700 px-3 py-2"
        placeholder="Recipient name"
        value={recipientName}
        onChange={(e) => setRecipientName(e.target.value)}
        required
      />
      <div className="space-y-3">
        <p className="font-medium">Photos (6-10)</p>
        {photos.map((photo, index) => (
          <div key={index} className="grid grid-cols-1 gap-2 md:grid-cols-2 md:items-center">
            <input
              type="file"
              accept="image/*"
              className={fileInputClass}
              onChange={(e) => updatePhoto(index, { file: e.target.files?.[0] ?? null })}
            />
            <input
              className="rounded-md border border-zinc-700 px-3 py-2"
              placeholder={`Caption ${index + 1}`}
              value={photo.caption}
              onChange={(e) => updatePhoto(index, { caption: e.target.value })}
            />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4 md:grid md:grid-cols-3 md:gap-4">
        <label className="flex min-h-[5.5rem] flex-col gap-2 rounded-lg border border-zinc-700 bg-zinc-900/40 p-3">
          <span className="text-sm font-medium text-zinc-300">Ảnh bìa (Cover)</span>
          <input
            type="file"
            accept="image/*"
            className={fileInputClass}
            onChange={(e) => setCover(e.target.files?.[0] ?? null)}
          />
        </label>
        <label className="flex min-h-[5.5rem] flex-col gap-2 rounded-lg border border-zinc-700 bg-zinc-900/40 p-3">
          <span className="text-sm font-medium text-zinc-300">Video</span>
          <input
            type="file"
            accept="video/*"
            className={fileInputClass}
            onChange={(e) => setVideo(e.target.files?.[0] ?? null)}
          />
        </label>
        <label className="flex min-h-[5.5rem] flex-col gap-2 rounded-lg border border-zinc-700 bg-zinc-900/40 p-3">
          <span className="text-sm font-medium text-zinc-300">Nhạc nền (Audio)</span>
          <input
            type="file"
            accept="audio/*"
            className={fileInputClass}
            onChange={(e) => setAudio(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      {missingHint ? <p className="text-sm text-amber-300">{missingHint}</p> : null}
      {error ? <p className="rounded-md border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">{error}</p> : null}

      <div className="relative z-10 pt-2">
        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="rounded-md bg-white px-4 py-2 text-black disabled:pointer-events-none disabled:opacity-45"
        >
          {submitting ? "Đang tạo..." : "Create Album"}
        </button>
      </div>

      {albumUrl ? (
        <div className="rounded-lg border border-zinc-800 p-3 space-y-2">
          <p className="text-sm text-zinc-300">Album URL</p>
          <p className="text-sky-400 break-all">{albumUrl}</p>
          {qrDataUrl ? (
            <Image
              src={qrDataUrl}
              alt="Album QR code"
              width={160}
              height={160}
              className="w-40 h-40 bg-white p-2 rounded"
              unoptimized
            />
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
