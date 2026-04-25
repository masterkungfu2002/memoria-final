/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useState } from "react";

type Profile = "genz" | "classic";
type Status = { type: "idle" } | { type: "submitting" } | { type: "success"; message: string } | { type: "error"; message: string };

const profileThemes = {
  genz: [
    ["genz-midnight", "Midnight"],
    ["genz-dreamy-lilac", "Dreamy lilac"],
    ["genz-warm-blush", "Warm blush"],
    ["genz-sunset-rose", "Sunset rose"],
  ],
  classic: [
    ["classic-walnut", "Walnut"],
    ["classic-ivory", "Ivory"],
    ["classic-sepia", "Sepia"],
    ["classic-espresso", "Espresso"],
  ],
} as const;

const textInput = "w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#f4d6a2]/60";
const labelClass = "space-y-2";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f4d6a2]/78">{children}</span>;
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-[32px] border border-white/10 bg-white/[0.055] p-5 shadow-2xl backdrop-blur-xl sm:p-6">{children}</div>;
}

export function CustomerSetupForm({ token }: { token: string }) {
  const [profile, setProfile] = useState<Profile>("classic");
  const [themePreset, setThemePreset] = useState("classic-walnut");
  const [recipientName, setRecipientName] = useState("");
  const [senderName, setSenderName] = useState("");
  const [occasion, setOccasion] = useState("");
  const [importantDate, setImportantDate] = useState("");
  const [openingMessage, setOpeningMessage] = useState("");
  const [letterSignoff, setLetterSignoff] = useState("");
  const [finalMessage, setFinalMessage] = useState("");
  const [enableCapsule, setEnableCapsule] = useState(false);
  const [unlockDate, setUnlockDate] = useState("");
  const [capsuleMessage, setCapsuleMessage] = useState("");
  const [musicNote, setMusicNote] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [voice, setVoice] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>({ type: "idle" });

  function chooseProfile(next: Profile) {
    setProfile(next);
    setThemePreset(next === "genz" ? "genz-midnight" : "classic-walnut");
  }

  const readiness = useMemo(() => {
    const checks = [profile, themePreset, recipientName, senderName, openingMessage, photos.length >= 6, video || voice];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [profile, themePreset, recipientName, senderName, openingMessage, photos.length, video, voice]);

  function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setPhotos((prev) => [...prev, ...Array.from(files)].slice(0, 30));
  }

  async function submit() {
    if (!recipientName.trim() || !senderName.trim() || photos.length < 6) {
      setStatus({ type: "error", message: "Add recipient, sender, and at least 6 photos before submitting." });
      return;
    }
    const form = new FormData();
    form.set("profile", profile);
    form.set("profileMode", profile);
    form.set("themePreset", themePreset);
    form.set("recipientName", recipientName.trim());
    form.set("senderName", senderName.trim());
    form.set("occasion", occasion.trim());
    form.set("importantDate", importantDate.trim());
    form.set("openingMessage", openingMessage.trim());
    form.set("openingLetter", openingMessage.trim());
    form.set("letterSignoff", letterSignoff.trim());
    form.set("finalMessage", finalMessage.trim());
    form.set("enableCapsule", String(enableCapsule));
    form.set("unlockDate", unlockDate.trim());
    form.set("timeCapsuleMessage", capsuleMessage.trim());
    form.set("musicNote", musicNote.trim());
    photos.forEach((photo) => form.append("photos", photo));
    if (video) form.set("video", video);
    if (voice) form.set("voice", voice);

    setStatus({ type: "submitting" });
    try {
      const res = await fetch(`/api/setup/${encodeURIComponent(token)}`, { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || "Submission failed.");
      setStatus({ type: "success", message: data.message || "Submitted for Memora Studio polish." });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Submission failed." });
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#090806] px-4 py-6 text-white sm:px-6">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(244,214,162,0.14),transparent_28%),radial-gradient(circle_at_85%_75%,rgba(118,90,255,0.10),transparent_32%),linear-gradient(180deg,#090806,#111014)]" />
      <div className="relative z-10 mx-auto w-full max-w-6xl space-y-5">
        <header className="rounded-[32px] border border-white/10 bg-white/[0.055] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="grid gap-5 lg:grid-cols-[1fr_280px] lg:items-center">
            <div>
              <p className="text-[11px] uppercase tracking-[0.34em] text-[#f4d6a2]">Private setup link</p>
              <h1 className="mt-3 font-[var(--font-memora-serif)] text-4xl leading-tight sm:text-6xl">Build your Love Archive</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/64">Choose the experience once here. The recipient will not see profile controls.</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-white/50"><span>Setup ID</span><span className="text-[#f4d6a2]">{token}</span></div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#f4d6a2] transition-all" style={{ width: `${readiness}%` }} /></div>
              <p className="mt-3 text-sm text-white/60">{readiness}% ready</p>
            </div>
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[0.88fr_1.12fr]">
          <div className="space-y-5">
            <Card>
              <FieldLabel>Style</FieldLabel>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => chooseProfile("genz")} className={`rounded-2xl border p-4 text-left transition ${profile === "genz" ? "border-[#f4d6a2] bg-[#f4d6a2]/12" : "border-white/10 bg-black/16"}`}><p className="font-semibold">Genz 22-30</p><p className="mt-2 text-sm leading-6 text-white/55">Hanging photos, lights, phone-first video.</p></button>
                <button type="button" onClick={() => chooseProfile("classic")} className={`rounded-2xl border p-4 text-left transition ${profile === "classic" ? "border-[#f4d6a2] bg-[#f4d6a2]/12" : "border-white/10 bg-black/16"}`}><p className="font-semibold">Classic 30-55+</p><p className="mt-2 text-sm leading-6 text-white/55">3D album, cassette, wooden TV.</p></button>
              </div>
              <FieldLabel>Color preset</FieldLabel>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {profileThemes[profile].map(([value, label]) => <button key={value} type="button" onClick={() => setThemePreset(value)} className={`rounded-2xl border px-4 py-3 text-left text-sm ${themePreset === value ? "border-[#f4d6a2] bg-[#f4d6a2]/12 text-[#f4d6a2]" : "border-white/10 bg-black/16 text-white/65"}`}>{label}</button>)}
              </div>
            </Card>

            <Card>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}><FieldLabel>Recipient</FieldLabel><input className={textInput} value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Emma" /></label>
                <label className={labelClass}><FieldLabel>Sender</FieldLabel><input className={textInput} value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="Noah" /></label>
                <label className={labelClass}><FieldLabel>Occasion</FieldLabel><input className={textInput} value={occasion} onChange={(e) => setOccasion(e.target.value)} placeholder="Anniversary" /></label>
                <label className={labelClass}><FieldLabel>Date</FieldLabel><input className={textInput} value={importantDate} onChange={(e) => setImportantDate(e.target.value)} placeholder="02.14.2026" /></label>
              </div>
              <label className={`${labelClass} mt-4 block`}><FieldLabel>Opening message</FieldLabel><textarea className={`${textInput} min-h-28 resize-y`} value={openingMessage} onChange={(e) => setOpeningMessage(e.target.value)} placeholder="Write the letter they will open..." /></label>
              <label className={`${labelClass} mt-4 block`}><FieldLabel>Signoff</FieldLabel><input className={textInput} value={letterSignoff} onChange={(e) => setLetterSignoff(e.target.value)} placeholder="From Noah" /></label>
              <label className={`${labelClass} mt-4 block`}><FieldLabel>Final message</FieldLabel><textarea className={`${textInput} min-h-24 resize-y`} value={finalMessage} onChange={(e) => setFinalMessage(e.target.value)} placeholder="Write the ending line..." /></label>
            </Card>
          </div>

          <div className="space-y-5">
            <Card>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><FieldLabel>Photos</FieldLabel><p className="mt-2 text-sm text-white/58">Upload 6-30 photos. Best range: 12-24.</p></div><label className="cursor-pointer rounded-full bg-[#f4d6a2] px-5 py-3 text-sm font-semibold text-[#24140d]">Choose photos<input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addPhotos(e.target.files)} /></label></div>
              <div className="mt-5 grid max-h-[360px] grid-cols-3 gap-3 overflow-y-auto pr-1 sm:grid-cols-4">
                {photos.map((photo, index) => <div key={`${photo.name}-${index}`} className="rounded-2xl border border-white/10 bg-black/18 p-2"><div className="aspect-[3/4] overflow-hidden rounded-xl bg-white/8"><img src={URL.createObjectURL(photo)} alt="upload preview" className="h-full w-full object-cover" /></div><button type="button" onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== index))} className="mt-2 w-full rounded-full border border-white/10 py-1 text-[11px] text-white/55">Remove</button></div>)}
                {photos.length === 0 ? <p className="col-span-full py-12 text-center text-sm text-white/45">No photos selected yet.</p> : null}
              </div>
            </Card>

            <Card>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}><FieldLabel>Final video</FieldLabel><input type="file" accept="video/*" className={textInput} onChange={(e) => setVideo(e.target.files?.[0] ?? null)} /><p className="text-xs text-white/45">{video?.name || "No video yet"}</p></label>
                <label className={labelClass}><FieldLabel>Voice note</FieldLabel><input type="file" accept="audio/*" className={textInput} onChange={(e) => setVoice(e.target.files?.[0] ?? null)} /><p className="text-xs text-white/45">{voice?.name || "Optional but powerful"}</p></label>
              </div>
              <label className={`${labelClass} mt-4 block`}><FieldLabel>Music note</FieldLabel><input className={textInput} value={musicNote} onChange={(e) => setMusicNote(e.target.value)} placeholder="Soft piano / no music / uploaded by customer" /></label>
            </Card>

            <Card>
              <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/16 p-4"><span><FieldLabel>Time capsule</FieldLabel><p className="mt-1 text-sm text-white/55">Optional future message.</p></span><input type="checkbox" checked={enableCapsule} onChange={(e) => setEnableCapsule(e.target.checked)} /></label>
              {enableCapsule ? <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className={labelClass}><FieldLabel>Unlock date</FieldLabel><input type="date" className={textInput} value={unlockDate} onChange={(e) => setUnlockDate(e.target.value)} /></label><label className={labelClass}><FieldLabel>Capsule message</FieldLabel><input className={textInput} value={capsuleMessage} onChange={(e) => setCapsuleMessage(e.target.value)} placeholder="Open this later..." /></label></div> : null}
            </Card>

            {status.type !== "idle" ? <div className={`rounded-2xl border p-4 text-sm leading-7 ${status.type === "success" ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100" : status.type === "error" ? "border-red-300/25 bg-red-400/10 text-red-100" : "border-white/10 bg-white/8 text-white/70"}`}>{status.type === "submitting" ? "Submitting your archive..." : status.message}</div> : null}
            <button type="button" onClick={submit} disabled={status.type === "submitting"} className="w-full rounded-full bg-[#f4d6a2] px-6 py-4 text-sm font-bold uppercase tracking-[0.18em] text-[#24140d] disabled:opacity-50">Submit for Memora polish</button>
          </div>
        </section>
      </div>
    </main>
  );
}
