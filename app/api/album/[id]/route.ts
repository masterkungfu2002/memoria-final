import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { validateAlbumRow } from "@/lib/validate-album";

/**
 * Album công khai qua link /album/[id]: chỉ đọc 1 row, không lộ service role ra client.
 * Service role chạy trên server → không phụ thuộc JWT custom / SUPABASE_JWT_SECRET.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Thiếu id album." }, { status: 400 });
  }

  let supabase;
  try {
    supabase = createSupabaseServiceClient();
  } catch {
    return NextResponse.json(
      { error: "Thiếu SUPABASE_SERVICE_ROLE_KEY trong .env.local (server only)." },
      { status: 500 },
    );
  }

  const { data, error } = await supabase.from("albums").select("*").eq("id", id).maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Album không tồn tại." }, { status: 404 });
  }

  const parsed = validateAlbumRow(data as unknown as Record<string, unknown>);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 500 });
  }

  return NextResponse.json(parsed.album);
}
