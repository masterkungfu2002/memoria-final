import { AlbumForm } from "@/components/admin/AlbumForm";

export default function NewAlbumPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <h1 className="text-3xl font-semibold">Create New Album</h1>
        <AlbumForm />
      </div>
    </main>
  );
}
