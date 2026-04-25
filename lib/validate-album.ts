import type { Album, AlbumPhoto } from "@/lib/types";

export type AlbumValidationError = { ok: false; error: string };
export type AlbumValidationOk = { ok: true; album: Album };

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function optionalString(v: unknown): string | undefined {
  if (typeof v === "string" && v.trim().length > 0) return v.trim();
  return undefined;
}

function toStringValue(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function normalizeRawPhotos(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) return raw;

  // Some older/admin paths may accidentally store JSON as a string.
  // Accept it instead of breaking existing QR links.
  if (typeof raw === "string" && raw.trim().length > 0) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  return null;
}

function parsePhotos(raw: unknown): AlbumPhoto[] | null {
  const list = normalizeRawPhotos(raw);
  if (!list) return null;

  // Viewer supports 1-30. Admin/setup may later enforce a business minimum,
  // but the public QR should never break just because an album has fewer than 6.
  if (list.length < 1 || list.length > 30) return null;

  const out: AlbumPhoto[] = [];

  for (const item of list) {
    // Legacy support: photos: ["https://..."]
    if (typeof item === "string") {
      const url = item.trim();
      if (!url) continue;
      out.push({ url, caption: "" });
      continue;
    }

    if (item === null || typeof item !== "object") continue;

    const record = item as Record<string, unknown>;
    const url =
      toStringValue(record.url) ||
      toStringValue(record.src) ||
      toStringValue(record.publicUrl) ||
      toStringValue(record.public_url) ||
      toStringValue(record.path);

    if (!url) continue;

    out.push({
      url,
      caption: toStringValue(record.caption),
      ...(optionalString(record.title) ? { title: optionalString(record.title) } : {}),
      ...(optionalString(record.chapter) ? { chapter: optionalString(record.chapter) } : {}),
      ...(optionalString(record.hidden_note) ? { hidden_note: optionalString(record.hidden_note) } : {}),
      ...(typeof record.highlight === "boolean" ? { highlight: record.highlight } : {}),
    });
  }

  return out.length >= 1 && out.length <= 30 ? out : null;
}

export function validateAlbumRow(row: Record<string, unknown>): AlbumValidationOk | AlbumValidationError {
  const id = row.id;
  const adminId = row.admin_id;

  if (typeof id !== "string") {
    return { ok: false, error: "Album row is missing a valid id." };
  }

  const photos = parsePhotos(row.photos);
  if (!photos) {
    return {
      ok: false,
      error:
        "The photos column is invalid. It must be an array of 1-30 photos. Each photo can be { url, caption } or a direct image URL string.",
    };
  }

  const coverImage = isNonEmptyString(row.cover_image) ? row.cover_image.trim() : photos[0]?.url;
  if (!coverImage) {
    return { ok: false, error: "Album has no valid cover image." };
  }

  const createdAt = typeof row.created_at === "string" ? row.created_at : new Date().toISOString();

  return {
    ok: true,
    album: {
      id,
      admin_id: typeof adminId === "string" ? adminId : "",
      recipient_name: isNonEmptyString(row.recipient_name) ? row.recipient_name.trim() : "you",
      sender_name: optionalString(row.sender_name),
      occasion: optionalString(row.occasion),
      opening_letter: optionalString(row.opening_letter),
      opening_message: optionalString(row.opening_message),
      letter_signoff: optionalString(row.letter_signoff),
      final_message: optionalString(row.final_message),
      relationship_mode:
        row.relationship_mode === "genz" || row.relationship_mode === "classic" || row.relationship_mode === "auto"
          ? row.relationship_mode
          : undefined,
      profile_mode:
        row.profile_mode === "genz" || row.profile_mode === "classic" || row.profile_mode === "auto"
          ? row.profile_mode
          : undefined,
      theme_preset: optionalString(row.theme_preset),
      important_date: optionalString(row.important_date),
      location_label: optionalString(row.location_label),
      voice_url: optionalString(row.voice_url),
      unlock_date: optionalString(row.unlock_date),
      time_capsule_message: optionalString(row.time_capsule_message),
      setup_token: optionalString(row.setup_token),
      cover_image: coverImage,
      photos,
      video_url: typeof row.video_url === "string" ? row.video_url.trim() : "",
      background_music_url:
        typeof row.background_music_url === "string" ? row.background_music_url.trim() : "",
      created_at: createdAt,
    },
  };
}
