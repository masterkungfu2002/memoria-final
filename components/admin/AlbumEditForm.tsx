"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import type { Album, AlbumPhoto } from "@/lib/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type EditablePhoto = AlbumPhoto & { localFile?: File | null };

const chapters = ["How it started", "Little things", "Favorite us", "Still choosing you", "One last thing"];

function storageObjectName(original: string, index: number) {
  const ext = original.includes(".") ? original.slice(original.lastIndexOf(".")).toLowerCase() : "";
  return `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}${ext}`;
}

async function uploadToPublicBucket(bucket: string, path: string, file: File) {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export function AlbumEditForm({ album }: { album: Album }) {
  const [recipientName, setRecipientName] = useState(album.recipient_name || "");
  const [videoUrl, setVideoUrl] = useState(album.video_url || "");
  const [musicUrl, setMusicUrl] = useState(album.background_music_url || "");
  const [photos, setPhotos] = useState<EditablePhoto[]>(
    (album.photos || []).map((photo, index) => ({
      url: photo.url || "",
      caption: photo.caption || "",
      title: photo.title || "",
      chapter: photo.chapter || chapters[Math.min(Math.floor(index / 6), chapters.length - 1)],
      hidden_note: photo.hidden_note || "",
      highlight: !!photo.highlight,
      localFile: null,
    })),
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingMusic, setUploadingMusic] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);
  const musicFileRef = useRef<HTMLInputElement>(null);

  const publicOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const classicLink = `${publicOrigin}/album/${album.id}?profile=classic`;
  const genzLink = `${publicOrigin}/album/${album.id}?profile=genz`;
  const setupLink = `${publicOrigin}/setup/${album.id}`;
  const photoCount = photos.filter((photo) => photo.url || photo.localFile).length;
  const canSave = useMemo(() => recipientName.trim().length > 0 && photoCount >= 1 && photoCount <= 30, [photoCount, recipientName]);

  function updatePhoto(index: number, patch: Partial<EditablePhoto>) {
    setPhotos((prev) => prev.map((photo, i) => (i === index ? { ...photo, ...patch } : photo)));
  }

  function addPhoto() {
    setPhotos((prev) =>
      prev.length >= 30
        ? prev
        : [...prev, { url: "", caption: "", title: "", chapter: chapters[0], hidden_note: "", highlight: false, localFile: null }],
    );
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

  async function addUploadedFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setMessage(null);
    try {
      const uploaded: EditablePhoto[] = [];
      for (const [index, file] of Array.from(files).entries()) {
        if (photos.length + uploaded.length >= 30) break;
        const path = `${album.admin_id}/${album.id}/photos/${storageObjectName(file.name, index)}`;
        const url = await uploadToPublicBucket("albums-images", path, file);
        uploaded.push({ url, caption: "", title: "", chapter: chapters[0], hidden_note: "", highlight: false });
      }
      setPhotos((prev) => [...prev, ...uploaded].slice(0, 30));
      setMessage({ type: "ok", text: "Photos uploaded." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Upload failed." });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function uploadSingleMedia(kind: "video" | "music", file: File | null | undefined) {
    if (!file) return;
    const isVideo = kind === "video";
    const bucket = isVideo ? "albums-videos" : "albums-audio";
    const folder = isVideo ? "video" : "audio";
    const setBusy = isVideo ? setUploadingVideo : setUploadingMusic;
    setBusy(true);
    setMessage(null);
    try {
      const path = `${album.admin_id}/${album.id}/${folder}/${storageObjectName(file.name, 0)}`;
      const url = await uploadToPublicBucket(bucket, path, file);
      if (isVideo) setVideoUrl(url);
      else setMusicUrl(url);
      setMessage({ type: "ok", text: `${isVideo ? "Video" : "Music"} uploaded. Click Save album safely to publish it.` });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Upload failed." });
    } finally {
      setBusy(false);
      if (isVideo && videoFileRef.current) videoFileRef.current.value = "";
      if (!isVideo && musicFileRef.current) musicFileRef.current.value = "";
    }
  }

  async function save() {
    if (!canSave) {
      setMessage({ type: "error", text: "Add a recipient name and keep photos between 1 and 30." });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const cleanPhotos = photos
        .filter((photo) => photo.url.trim())
        .slice(0, 30)
        .map((photo) => ({
          url: photo.url.trim(),
          caption: photo.caption || "",
          title: photo.title || "",
          chapter: photo.chapter || chapters[0],
          hidden_note: photo.hidden_note || "",
          highlight: !!photo.highlight,
        }));

      const { error } = await supabase
        .from("albums")
        .update({
          recipient_name: recipientName.trim(),
          cover_image: cleanPhotos[0]?.url || album.cover_image,
          photos: cleanPhotos,
          video_url: videoUrl.trim(),
          background_music_url: musicUrl.trim(),
        })
        .eq("id", album.id);

      if (error) throw error;
      setMessage({ type: "ok", text: "Album saved. Existing QR links still work." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Save failed." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 rounded-3xl border border-zinc-800 bg-zinc-900/45 p-5 md:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-500">Album ID</p>
          <p className="mt-2 break-all rounded-xl bg-zinc-950 p-3 text-sm text-zinc-200">{album.id}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-500">Setup link</p>
          <p className="mt-2 break-all rounded-xl bg-zinc-950 p-3 text-sm text-amber-200">{setupLink}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-500">Profile links</p>
          <div className="mt-2 space-y-2 rounded-xl bg-zinc-950 p-3 text-sm">
            <a className="block break-all text-sky-300" href={classicLink} target="_blank">Classic</a>
            <a className="block break-all text-sky-300" href={genzLink} target="_blank">Genz</a>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-zinc-800 bg-zinc-900/45 p-5">
        <label className="space-y-2 block">
          <span className="text-xs uppercase tracking-widest text-zinc-500">Recipient name</span>
          <input value={recipientName} onChange={(event) => setRecipientName(event.target.value)} className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-zinc-100" />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 block">
            <span className="text-xs uppercase tracking-widest text-zinc-500">Final video URL</span>
            <input value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-zinc-100" />
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" onClick={() => videoFileRef.current?.click()} disabled={uploadingVideo} className="rounded-full border border-amber-300/35 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-amber-200 disabled:opacity-50">
                {uploadingVideo ? "Uploading video..." : "Upload video file"}
              </button>
              <input ref={videoFileRef} type="file" accept="video/*" hidden onChange={(event) => uploadSingleMedia("video", event.target.files?.[0])} />
            </div>
          </label>
          <label className="space-y-2 block">
            <span className="text-xs uppercase tracking-widest text-zinc-500">Music URL</span>
            <input value={musicUrl} onChange={(event) => setMusicUrl(event.target.value)} className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-zinc-100" />
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" onClick={() => musicFileRef.current?.click()} disabled={uploadingMusic} className="rounded-full border border-amber-300/35 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-amber-200 disabled:opacity-50">
                {uploadingMusic ? "Uploading music..." : "Upload music file"}
              </button>
              <input ref={musicFileRef} type="file" accept="audio/*" hidden onChange={(event) => uploadSingleMedia("music", event.target.files?.[0])} />
            </div>
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/45 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-semibold">Photo manager</p>
            <p className="mt-1 text-sm text-zinc-500">{photoCount}/30 photos. Reorder, caption, add hidden notes, and mark highlights.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={addPhoto} className="rounded-full border border-zinc-700 px-4 py-2 text-sm">Add URL</button>
            <button type="button" onClick={() => fileRef.current?.click()} className="rounded-full border border-amber-300/35 px-4 py-2 text-sm text-amber-200" disabled={uploading}>
              {uploading ? "Uploading..." : "Upload photos"}
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(event) => addUploadedFiles(event.target.files)} />
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {photos.map((photo, index) => (
            <div key={`${photo.url}-${index}`} className="rounded-2xl border border-zinc-800 bg-zinc-950/55 p-4">
              <div className="grid gap-4 lg:grid-cols-[120px_1fr_auto]">
                <div className="relative h-36 overflow-hidden rounded-xl bg-zinc-900">
                  {photo.url ? <Image src={photo.url} alt="" fill className="object-cover" unoptimized /> : null}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <input value={photo.url} onChange={(event) => updatePhoto(index, { url: event.target.value })} placeholder="Image URL" className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm md:col-span-2" />
                  <input value={photo.title || ""} onChange={(event) => updatePhoto(index, { title: event.target.value })} placeholder="Title" className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" />
                  <select value={photo.chapter || chapters[0]} onChange={(event) => updatePhoto(index, { chapter: event.target.value })} className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm">
                    {chapters.map((chapter) => <option key={chapter}>{chapter}</option>)}
                  </select>
                  <textarea value={photo.caption || ""} onChange={(event) => updatePhoto(index, { caption: event.target.value })} placeholder="Caption" className="min-h-20 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm md:col-span-2" />
                  <input value={photo.hidden_note || ""} onChange={(event) => updatePhoto(index, { hidden_note: event.target.value })} placeholder="Hidden note" className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm md:col-span-2" />
                  <label className="flex items-center gap-2 text-sm text-zinc-400">
                    <input type="checkbox" checked={!!photo.highlight} onChange={(event) => updatePhoto(index, { highlight: event.target.checked })} />
                    Highlight
                  </label>
                </div>
                <div className="flex gap-2 lg:flex-col">
                  <button type="button" onClick={() => movePhoto(index, -1)} className="rounded-lg border border-zinc-700 px-3 py-2 text-sm">Up</button>
                  <button type="button" onClick={() => movePhoto(index, 1)} className="rounded-lg border border-zinc-700 px-3 py-2 text-sm">Down</button>
                  <button type="button" onClick={() => removePhoto(index)} className="rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-300">Remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {message ? (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${message.type === "ok" ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-200" : "border-red-500/40 bg-red-950/30 text-red-200"}`}>
          {message.text}
        </div>
      ) : null}

      <button type="button" onClick={save} disabled={!canSave || saving} className="w-full rounded-full bg-white px-6 py-4 text-sm font-bold uppercase tracking-widest text-black disabled:opacity-40">
        {saving ? "Saving..." : "Save album safely"}
      </button>
    </div>
  );
}
