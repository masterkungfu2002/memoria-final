import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * Guest feedback from the public album URL. Validates album existence server-side (service role).
 */
export async function POST(request: Request) {
  let body: { album_id?: string; rating?: number; comment?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const albumId = typeof body.album_id === "string" ? body.album_id.trim() : "";
  const rawRating = body.rating;
  const ratingCandidate =
    rawRating === undefined || rawRating === null ? 5 : Number(rawRating);
  const rating = Number.isInteger(ratingCandidate) ? ratingCandidate : NaN;
  const comment = typeof body.comment === "string" ? body.comment.slice(0, 1000) : "";

  if (!albumId) {
    return NextResponse.json({ error: "Missing album_id." }, { status: 400 });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "rating must be an integer from 1 to 5." }, { status: 400 });
  }

  let supabase;
  try {
    supabase = createSupabaseServiceClient();
  } catch {
    return NextResponse.json(
      { error: "Missing SUPABASE_SERVICE_ROLE_KEY in .env.local (server only)." },
      { status: 500 },
    );
  }

  const { data: album, error: albumErr } = await supabase
    .from("albums")
    .select("id")
    .eq("id", albumId)
    .maybeSingle();

  if (albumErr) {
    return NextResponse.json({ error: albumErr.message }, { status: 500 });
  }
  if (!album) {
    return NextResponse.json({ error: "Album not found." }, { status: 404 });
  }

  const { error: insertErr } = await supabase.from("feedbacks").insert({
    album_id: albumId,
    rating,
    comment,
  });

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
