"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type PhotoInput = {
  file: File | null;
  caption: string;
  title: string;
  chapter: string;
  hidden_note: string;
  highlight: boolean;
};

const chapterOptions = ["How it started", "Little things", "Favorite us", "Still choosing you", "One last thing"];

const fileInputClass =
  "block w-full text-sm text-zinc-200 file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-zinc-600 file:bg-zinc-800 file:px-3 file:py-2 file:text-zinc-100";

function emptyPhoto(file: File | null = null): PhotoInput {
  return { file, caption: "", title: "", chapter: chapterOptions[0], hidden_note: "", highlight: false };
}

function storageObjectName(original: string, index: number) {
  const ext = original.includes(".") ? original.slice(original.lastIndexOf(".")).toLowerCase() : "";
  return `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}${ext}`;
}

export function AlbumForm() {
  const [recipientName, setRecipientName] = useState("");
  const [senderName, setSenderName] = useState("");
  const [occasion, setOccasion] = useState("");
  const [letterTitle, setLetterTitle] = useState("");
  const [letterMessage, setLetterMessage] = useState("");
  const [letterHint, setLetterHint] = useState("");
  const [letterClosing, setLetterClosing] = useState("");
  const [photos, setPhotos] = useState<PhotoInput[]>(Array.from({ length: 1 }, () => emptyPhoto()));
  const [video, setVideo] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [albumUrl, setAlbumUrl] = useState<string | null>(null);
  const [setupUrl, setSetupUrl] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const usedPhotos = useMemo(() => photos.filter((p) => p.file), [photos]);
  const photoCount = usedPhotos.length;
  const canSubmit = recipientName.trim().length > 0 && photoCount >= 1 && photoCount <= 30;

  function updatePhoto(index: number, patch: Partial<PhotoInput>) {
    setPhotos((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function addPhotoSlot(file: File | null = null) {
    setPhotos((prev) => (prev.length >= 30 ? prev : [...prev, emptyPhoto(file)]));
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  function movePhoto(index: number, dir: -1 | 1) {
    setPhotos((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setPhotos((prev) => {
      const next = [...prev];
      for (const file of Array.from(files)) {
        const emptyIndex = next.findIndex((item) => !item.file);
        if (emptyIndex >= 0) next[emptyIndex] = { ...next[emptyIndex], file };
        else if (next.length < 30) next.push(emptyPhoto(file));
      }
      return next.slice(0, 30);
    });
  }

  async function uploadFile(bucket: string, path: string, file: File) {
    const supabase = createSupabaseBrowserClient();
    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (uploadError) throw uploadError;
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError("Your login session expired. Please log in again.");
        setSubmitting(false);
        return;
      }

      const albumId = crypto.randomUUID();
      const uploadBase = `${user.id}/${albumId}`;
      const uploadedPhotos = [];

      for (let i = 0; i < usedPhotos.length; i += 1) {
        const item = usedPhotos[i];
        if (!item.file) continue;
        const path = `${uploadBase}/photos/${storageObjectName(item.file.name, i)}`;
        const url = await uploadFile("albums-images", path, item.file);
        uploadedPhotos.push({
          url,
          caption: item.caption,
          title: item.title,
          chapter: item.chapter,
          hidden_note: item.hidden_note,
          highlight: item.highlight,
        });
      }

      let coverUrl = uploadedPhotos[0]?.url ?? "";
      if (cover) {
        coverUrl = await uploadFile("albums-images", `${uploadBase}/cover/${storageObjectName(cover.name, 0)}`, cover);
      }

      let videoUrl = "";
      if (video) {
        videoUrl = await uploadFile("albums-videos", `${uploadBase}/video/${storageObjectName(video.name, 0)}`, video);
      }

      let audioUrl = "";
      if (audio) {
        audioUrl = await uploadFile("albums-audio", `${uploadBase}/audio/${storageObjectName(audio.name, 0)}`, audio);
      }

      const { error: insertError } = await supabase.from("albums").insert({
        id: albumId,
        admin_id: user.id,
        recipient_name: recipientName.trim(),
        sender_name: senderName.trim() || null,
        cover_image: coverUrl,
        photos: uploadedPhotos,
        video_url: videoUrl,
        background_music_url: audioUrl,
        letter_title: letterTitle.trim() || null,
        letter_message: letterMessage.trim() || null,
        letter_hint: letterHint.trim() || null,
        letter_closing: letterClosing.trim() || null,
        opening_letter: letterMessage.trim() || null,
      });

      if (insertError) throw insertError;

      const classicUrl = `${window.location.origin}/album/${albumId}?profile=classic`;
      setAlbumUrl(classicUrl);
      setSetupUrl(`${window.location.origin}/setup/${albumId}`);
      setQrDataUrl(await QRCode.toDataURL(classicUrl, { margin: 2, width: 220 }));
      setSubmitting(false);
    } catch (err) {
      setSubmitting(false);
      setError(err instanceof Error ? err.message : "Could not create album.");
    }
  }

  return (
    <form className="space-y-6 rounded-3xl border border-zinc-800 bg-zinc-900/45 p-5" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="space-y-2">
          <span className="text-xs uppercase tracking-widest text-zinc-400">Recipient name</span>
          <input className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-zinc-100" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} required />
        </label>
        <label className="space-y-2">
          <span className="text-xs uppercase tracking-widest text-zinc-400">Sender name</span>
          <input className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-zinc-100" value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="Optional" />
        </label>
        <label className="space-y-2">
          <span className="text-xs uppercase tracking-widest text-zinc-400">Occasion</span>
          <input className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-zinc-100" value={occasion} onChange={(e) => setOccasion(e.target.value)} placeholder="Anniversary, birthday..." />
        </label>
      </div>

      <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950/45 p-4">
        <div>
          <p className="text-sm font-semibold text-zinc-100">Opening Letter</p>
          <p className="mt-1 text-xs text-zinc-500">Optional sealed letter shown before the album opens.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs uppercase tracking-widest text-zinc-400">Letter title</span>
            <input className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100" value={letterTitle} onChange={(e) => setLetterTitle(e.target.value)} placeholder="A letter before the story" />
          </label>
          <label className="space-y-2">
            <span className="text-xs uppercase tracking-widest text-zinc-400">Envelope hint</span>
            <input className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100" value={letterHint} onChange={(e) => setLetterHint(e.target.value)} placeholder="Tap the seal to open" />
          </label>
        </div>
        <label className="space-y-2 block">
          <span className="text-xs uppercase tracking-widest text-zinc-400">Letter message</span>
          <textarea className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100" value={letterMessage} onChange={(e) => setLetterMessage(e.target.value)} placeholder="I made this from the small moments..." rows={4} />
        </label>
        <label className="space-y-2 block">
          <span className="text-xs uppercase tracking-widest text-zinc-400">Closing / sign-off</span>
          <input className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100" value={letterClosing} onChange={(e) => setLetterClosing(e.target.value)} placeholder={`From ${senderName || "[sender]"}`} />
        </label>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/45 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-zinc-100">Photo manager</p>
            <p className="mt-1 text-xs text-zinc-500">1-30 photos. Upload many at once, then reorder and add captions.</p>
          </div>
          <label className="cursor-pointer rounded-full border border-amber-300/35 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-amber-200">
            Add many photos
            <input type="file" accept="image/*" multiple hidden onChange={(e) => addFiles(e.target.files)} />
          </label>
        </div>

        <div className="mt-4 space-y-4">
          {photos.map((photo, index) => (
            <div key={index} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="grid gap-3 lg:grid-cols-[140px_1fr_auto]">
                <div className="relative min-h-36 overflow-hidden rounded-xl bg-zinc-950">
                  {photo.file ? (
                    <Image src={URL.createObjectURL(photo.file)} alt="" fill className="object-cover" unoptimized />
                  ) : (
                    <div className="flex h-full min-h-36 items-center justify-center text-xs text-zinc-600">No photo</div>
                  )}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <input type="file" accept="image/*" className={`${fileInputClass} md:col-span-2`} onChange={(e) => updatePhoto(index, { file: e.target.files?.[0] ?? null })} />
                  <input className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" placeholder="Title" value={photo.title} onChange={(e) => updatePhoto(index, { title: e.target.value })} />
                  <select className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" value={photo.chapter} onChange={(e) => updatePhoto(index, { chapter: e.target.value })}>
                    {chapterOptions.map((chapter) => (
                      <option key={chapter}>{chapter}</option>
                    ))}
                  </select>
                  <textarea className="min-h-20 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm md:col-span-2" placeholder={`Caption ${index + 1}`} value={photo.caption} onChange={(e) => updatePhoto(index, { caption: e.target.value })} />
                  <input className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm md:col-span-2" placeholder="Hidden note (optional)" value={photo.hidden_note} onChange={(e) => updatePhoto(index, { hidden_note: e.target.value })} />
                  <label className="flex items-center gap-2 text-sm text-zinc-400">
                    <input type="checkbox" checked={photo.highlight} onChange={(e) => updatePhoto(index, { highlight: e.target.checked })} />
                    Highlight photo
                  </label>
                </div>
                <div className="flex gap-2 lg:flex-col">
                  <button type="button" className="rounded-lg border border-zinc-700 px-3 py-2 text-sm" onClick={() => movePhoto(index, -1)}>Up</button>
                  <button type="button" className="rounded-lg border border-zinc-700 px-3 py-2 text-sm" onClick={() => movePhoto(index, 1)}>Down</button>
                  <button type="button" className="rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-300" onClick={() => removePhoto(index)}>Remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button type="button" onClick={() => addPhotoSlot()} disabled={photos.length >= 30} className="mt-4 rounded-full border border-zinc-700 px-5 py-3 text-sm text-zinc-200 disabled:opacity-40">
          Add empty slot
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-950/45 p-4">
          <span className="text-xs uppercase tracking-widest text-zinc-400">Cover image (optional)</span>
          <input type="file" accept="image/*" className={fileInputClass} onChange={(e) => setCover(e.target.files?.[0] ?? null)} />
        </label>
        <label className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-950/45 p-4">
          <span className="text-xs uppercase tracking-widest text-zinc-400">Final video (optional)</span>
          <input type="file" accept="video/*" className={fileInputClass} onChange={(e) => setVideo(e.target.files?.[0] ?? null)} />
        </label>
        <label className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-950/45 p-4">
          <span className="text-xs uppercase tracking-widest text-zinc-400">Music (optional)</span>
          <input type="file" accept="audio/*" className={fileInputClass} onChange={(e) => setAudio(e.target.files?.[0] ?? null)} />
        </label>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/45 p-4 text-sm text-zinc-400">
        Ready check: {photoCount}/30 photos selected.
      </div>

      {error ? <p className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</p> : null}

      <button type="submit" disabled={!canSubmit || submitting} className="w-full rounded-full bg-white px-6 py-4 text-sm font-bold uppercase tracking-widest text-black disabled:opacity-40">
        {submitting ? "Creating..." : "Create Memora album"}
      </button>

      {albumUrl ? (
        <div className="grid gap-4 rounded-2xl border border-zinc-800 bg-zinc-950/45 p-4 md:grid-cols-[180px_1fr]">
          {qrDataUrl ? <Image src={qrDataUrl} alt="Album QR code" width={180} height={180} className="rounded-xl bg-white p-2" unoptimized /> : null}
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-zinc-500">Classic album link</p>
              <p className="break-all text-sky-300">{albumUrl}</p>
            </div>
            <div>
              <p className="text-zinc-500">Customer setup link</p>
              <p className="break-all text-amber-200">{setupUrl}</p>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}