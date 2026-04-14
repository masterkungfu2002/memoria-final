import { AlbumEditForm } from "@/components/admin/AlbumEditForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Album } from "@/lib/types";
import { notFound } from "next/navigation";
 
export default async function EditAlbumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: album, error } = await supabase
    .from("albums")
    .select("*")
    .eq("id", id)
    .single();
 
  if (error || !album) return notFound();
 
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold">Edit Album</h1>
          <a
            href={`/album/${id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-sky-400 hover:text-sky-300 underline"
          >
            Preview →
          </a>
        </div>
        <AlbumEditForm album={album as Album} />
      </div>
    </main>
  );
}
 
