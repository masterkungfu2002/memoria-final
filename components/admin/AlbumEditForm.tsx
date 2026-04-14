"use client";
 
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Album, AlbumPhoto } from "@/lib/types";
 
const fileInputClass =
  "block w-full max-w-full text-sm text-zinc-200 file:mr-3 file:inline-flex file:max-w-[min(100%,18rem)] file:shrink-0 file:cursor-pointer file:rounded-md file:border file:border-zinc-600 file:bg-zinc-800 file:px-3 file:py-2 file:text-zinc-100";
 
function storageObjectName(original: string, index: number) {
  const ext = original.includes(".") ? original.slice(original.lastIndexOf(".")).toLowerCase() : "";
  return `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}${ext}`;
}
 
type PhotoRow = {
  url: string;         // current URL in DB
  caption: string;     // current or edited caption
  newFile: File | null; // if set, replace this photo on save
};
 
export function AlbumEditForm({ album }: { album: Album }) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
 
  const [recipientName, setRecipientName] = useState(album.recipient_name || "");
  const [photos, setPhotos] = useState<PhotoRow[]>(
    (album.photos || []).map((p) => ({
      url: p.url,
      caption: p.caption || "",
      newFile: null,
    })),
  );
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
 
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
 
  function updatePhoto(index: number, patch: Partial<PhotoRow>) {
    setPhotos((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }
 
  async function uploadToBucket(bucket: string, path: string, file: File): Promise<string> {
    const { error: upErr } = await supabase.storage.from(bucket).upload(path, file);
    if (upErr) throw new Error(`Upload failed (${bucket}): ${upErr.message}`);
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }
 
  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!recipientName.trim()) {
      setError("Recipient name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    setSavedMsg(null);
 
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expired. Please sign in again.");
 
      const uploadBase = `${user.id}/${album.id}`;
 
      // 1) Build updated photos array — replace URLs for photos that have newFile
      const updatedPhotos: AlbumPhoto[] = [];
      for (let i = 0; i < photos.length; i++) {
        const p = photos[i];
        if (p.newFile) {
          const path = `${uploadBase}/photos/${storageObjectName(p.newFile.name, i)}`;
          const newUrl = await uploadToBucket("albums-images", path, p.newFile);
          updatedPhotos.push({ url: newUrl, caption: p.caption });
        } else {
          updatedPhotos.push({ url: p.url, caption: p.caption });
        }
      }
 
      // 2) Prepare update payload
      const payload: Partial<Album> = {
        recipient_name: recipientName.trim(),
        photos: updatedPhotos,
      };
 
      // 3) Replace cover if selected
      if (coverFile) {
        const path = `${uploadBase}/cover/${storageObjectName(coverFile.name, 0)}`;
        payload.cover_image = await uploadToBucket("albums-images", path, coverFile);
      }
 
      // 4) Replace video if selected
      if (videoFile) {
        const path = `${uploadBase}/video/${storageObjectName(videoFile.name, 0)}`;
        payload.video_url = await uploadToBucket("albums-videos", path, videoFile);
      }
 
      // 5) Replace audio if selected
      if (audioFile) {
        const path = `${uploadBase}/audio/${storageObjectName(audioFile.name, 0)}`;
        payload.background_music_url = await uploadToBucket("albums-audio", path, audioFile);
      }
 
      // 6) Update DB
      const { error: updateErr } = await supabase
        .from("albums")
        .update(payload)
        .eq("id", album.id);
 
      if (updateErr) throw new Error(`Save failed: ${updateErr.message}`);
 
      setSavedMsg("Saved successfully. Changes are live.");
      // Clear file inputs so user knows upload was applied
      setCoverFile(null);
      setVideoFile(null);
      setAudioFile(null);
      setPhotos((prev) => prev.map((p) => ({ ...p, newFile: null, url: updatedPhotos[prev.indexOf(p)]?.url ?? p.url })));
      router.refresh();
    } catch (e: any) {
      setError(e.message || "Unknown error");
    } finally {
      setSaving(false);
    }
  }
 
  async function onDelete() {
    if (!confirm(`Delete album "${album.recipient_name}"? This cannot be undone.`)) return;
    setDeleting(true);
    setError(null);
    try {
      const { error: delErr } = await supabase.from("albums").delete().eq("id", album.id);
      if (delErr) throw new Error(`Delete failed: ${delErr.message}`);
      router.push("/admin");
      router.refresh();
    } catch (e: any) {
      setError(e.message || "Unknown error");
      setDeleting(false);
    }
  }
 
  return (
    <form className="relative z-0 space-y-6 rounded-xl border border-zinc-800 p-4" onSubmit={onSave}>
      {/* Recipient */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">Recipient Name</label>
        <input
          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2"
          placeholder="Recipient name"
          value={recipientName}
          onChange={(e) => setRecipientName(e.target.value)}
          required
        />
      </div>
 
      {/* Photos */}
      <div className="space-y-3">
        <p className="font-medium text-zinc-300">Photos &amp; Captions</p>
        <p className="text-xs text-zinc-500">Leave the file input empty to keep the existing photo. Change the caption text any time.</p>
        {photos.map((photo, index) => (
          <div key={index} className="grid grid-cols-1 gap-3 rounded-lg border border-zinc-800 bg-zinc-900/30 p-3 md:grid-cols-[120px_1fr]">
            <div className="flex items-center justify-center">
              {photo.newFile ? (
                <div className="w-28 h-28 rounded-md bg-zinc-800 flex items-center justify-center text-xs text-amber-300 text-center p-2">
                  New file selected<br />
                  <span className="text-zinc-400 truncate block max-w-full">{photo.newFile.name}</span>
                </div>
              ) : photo.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photo.url}
                  alt={`Photo ${index + 1}`}
                  className="w-28 h-28 object-cover rounded-md bg-zinc-800"
                />
              ) : (
                <div className="w-28 h-28 rounded-md bg-zinc-800" />
              )}
            </div>
            <div className="space-y-2">
              <input
                type="file"
                accept="image/*"
                className={fileInputClass}
                onChange={(e) => updatePhoto(index, { newFile: e.target.files?.[0] ?? null })}
              />
              <input
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                placeholder={`Caption ${index + 1}`}
                value={photo.caption}
                onChange={(e) => updatePhoto(index, { caption: e.target.value })}
              />
            </div>
          </div>
        ))}
      </div>
 
      {/* Media replace */}
      <div className="space-y-3">
        <p className="font-medium text-zinc-300">Replace Media (optional)</p>
        <p className="text-xs text-zinc-500">Leave empty to keep existing files.</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="flex min-h-[5.5rem] flex-col gap-2 rounded-lg border border-zinc-700 bg-zinc-900/40 p-3">
            <span className="text-sm font-medium text-zinc-300">Cover</span>
            <input
              type="file"
              accept="image/*"
              className={fileInputClass}
              onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
            />
            {coverFile ? (
              <span className="text-xs text-amber-300 truncate">{coverFile.name}</span>
            ) : (
              <span className="text-xs text-zinc-500">Keep current</span>
            )}
          </label>
          <label className="flex min-h-[5.5rem] flex-col gap-2 rounded-lg border border-zinc-700 bg-zinc-900/40 p-3">
            <span className="text-sm font-medium text-zinc-300">Video</span>
            <input
              type="file"
              accept="video/*"
              className={fileInputClass}
              onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
            />
            {videoFile ? (
              <span className="text-xs text-amber-300 truncate">{videoFile.name}</span>
            ) : (
              <span className="text-xs text-zinc-500">Keep current</span>
            )}
          </label>
          <label className="flex min-h-[5.5rem] flex-col gap-2 rounded-lg border border-zinc-700 bg-zinc-900/40 p-3">
            <span className="text-sm font-medium text-zinc-300">Background Music</span>
            <input
              type="file"
              accept="audio/*"
              className={fileInputClass}
              onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
            />
            {audioFile ? (
              <span className="text-xs text-amber-300 truncate">{audioFile.name}</span>
            ) : (
              <span className="text-xs text-zinc-500">Keep current</span>
            )}
          </label>
        </div>
      </div>
 
      {savedMsg ? (
        <p className="rounded-md border border-emerald-500/40 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          {savedMsg}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}
 
      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting || saving}
          className="rounded-md border border-red-500/40 px-4 py-2 text-sm text-red-300 hover:bg-red-950/40 disabled:opacity-45"
        >
          {deleting ? "Deleting..." : "Delete Album"}
        </button>
        <button
          type="submit"
          disabled={saving || deleting}
          className="rounded-md bg-white px-5 py-2 font-semibold text-black disabled:opacity-45"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
 
