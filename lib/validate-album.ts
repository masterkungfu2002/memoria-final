import type { Album, AlbumPhoto } from "@/lib/types";

export type AlbumValidationError = { ok: false; error: string };
export type AlbumValidationOk = { ok: true; album: Album };

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function parsePhotos(raw: unknown): AlbumPhoto[] | null {
  if (!Array.isArray(raw)) return null;
  if (raw.length < 6 || raw.length > 10) return null;
  const out: AlbumPhoto[] = [];
  for (const item of raw) {
    if (item === null || typeof item !== "object") return null;
    const url = "url" in item ? (item as { url: unknown }).url : undefined;
    const caption = "caption" in item ? (item as { caption: unknown }).caption : undefined;
    if (!isNonEmptyString(url)) return null;
    if (typeof caption !== "string") return null;
    out.push({ url: url.trim(), caption });
  }
  return out;
}

/**
 * Khớp ràng buộc SQL validate_album_photos — tránh crash client khi row trong DB bị sửa tay sai định dạng.
 */
export function validateAlbumRow(row: Record<string, unknown>): AlbumValidationOk | AlbumValidationError {
  const id = row.id;
  const adminId = row.admin_id;
  if (typeof id !== "string" || typeof adminId !== "string") {
    return { ok: false, error: "Album trong DB thiếu id hoặc admin_id hợp lệ." };
  }
  if (!isNonEmptyString(row.recipient_name)) {
    return { ok: false, error: "recipient_name không hợp lệ." };
  }
  if (!isNonEmptyString(row.cover_image)) {
    return { ok: false, error: "cover_image không hợp lệ." };
  }
  if (!isNonEmptyString(row.video_url)) {
    return { ok: false, error: "video_url không hợp lệ." };
  }
  if (!isNonEmptyString(row.background_music_url)) {
    return { ok: false, error: "background_music_url không hợp lệ." };
  }
  const photos = parsePhotos(row.photos);
  if (!photos) {
    return {
      ok: false,
      error:
        "Cột photos không đúng định dạng (cần mảng 6–10 phần tử, mỗi phần tử { url, caption }). Sửa trong Supabase hoặc tạo album mới.",
    };
  }
  const createdAt = row.created_at;
  if (typeof createdAt !== "string") {
    return { ok: false, error: "created_at không hợp lệ." };
  }

  return {
    ok: true,
    album: {
      id,
      admin_id: adminId,
      recipient_name: String(row.recipient_name).trim(),
      cover_image: String(row.cover_image).trim(),
      photos,
      video_url: String(row.video_url).trim(),
      background_music_url: String(row.background_music_url).trim(),
      created_at: createdAt,
    },
  };
}
