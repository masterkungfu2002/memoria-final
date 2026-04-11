import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Album, Feedback } from "@/lib/types";
import { AlbumList } from "@/components/admin/AlbumList";
import { FeedbackPanel } from "@/components/admin/FeedbackPanel";

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: albums } = await supabase
    .from("albums")
    .select("*")
    .order("created_at", { ascending: false });

  const albumIds = (albums ?? []).map((a) => a.id);
  let feedbacks: Feedback[] = [];

  if (albumIds.length > 0) {
    const { data } = await supabase
      .from("feedbacks")
      .select("*")
      .in("album_id", albumIds)
      .order("created_at", { ascending: false });
    feedbacks = (data ?? []) as Feedback[];
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-12">
      <div className="mx-auto w-full max-w-6xl space-y-10">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight">Admin Dashboard</h1>
            <div className="flex items-center gap-3">
              <p className="text-zinc-400 text-sm">{user?.email}</p>
              <span className="w-1 h-1 rounded-full bg-zinc-700" />
              <button className="text-xs text-sky-400 hover:text-sky-300 font-medium transition-colors">
                Edit Profile
              </button>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/admin/albums/new" className="flex-1 md:flex-none rounded-xl bg-white px-6 py-3 text-sm font-bold text-black hover:bg-zinc-200 transition-all text-center">
              Create New Album
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Total Albums</p>
            <p className="text-4xl font-bold mt-2">{albums?.length ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Total Feedbacks</p>
            <p className="text-4xl font-bold mt-2">{feedbacks.length}</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Plan</p>
            <p className="text-xl font-bold mt-2 text-amber-400">Premium Pro</p>
          </div>
        </div>

        <div className="space-y-12">
          <AlbumList albums={(albums ?? []) as Album[]} />
          <FeedbackPanel feedbacks={feedbacks} />
        </div>
      </div>
    </main>
  );
}
