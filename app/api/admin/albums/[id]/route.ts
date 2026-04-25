import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY on the server.");
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Missing album id." }, { status: 400 });
    }

    const photos = Array.isArray(body.photos)
      ? body.photos
          .filter((photo) => photo && typeof photo.url === "string" && photo.url.trim())
          .slice(0, 30)
          .map((photo) => ({
            url: String(photo.url || "").trim(),
            caption: String(photo.caption || ""),
            title: String(photo.title || ""),
            chapter: String(photo.chapter || ""),
            hidden_note: String(photo.hidden_note || ""),
            highlight: !!photo.highlight,
          }))
      : [];

    if (!String(body.recipient_name || "").trim()) {
      return NextResponse.json({ error: "Recipient name is required." }, { status: 400 });
    }

    if (photos.length < 1 || photos.length > 30) {
      return NextResponse.json({ error: "Album must contain between 1 and 30 photos." }, { status: 400 });
    }

    const supabase = getAdminClient();
    const payload = {
      recipient_name: String(body.recipient_name || "").trim(),
      sender_name: String(body.sender_name || "").trim() || null,
      cover_image: String(body.cover_image || photos[0]?.url || "").trim(),
      photos,
      video_url: String(body.video_url || "").trim(),
      background_music_url: String(body.background_music_url || "").trim(),
    };

    const { error } = await supabase.from("albums").update(payload).eq("id", id);

    if (error) {
      console.error("Admin album update failed:", error);
      return NextResponse.json({ error: error.message || "Supabase update failed." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin album API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Save failed." },
      { status: 500 },
    );
  }
}
