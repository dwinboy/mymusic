import { PlaylistsManager } from "@/components/admin/playlists-manager";

export const metadata = { title: "Playlists" };

export default function AdminPlaylistsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
      <h1 className="text-2xl font-semibold text-foreground">Playlists</h1>
      <p className="mt-1 text-sm text-foreground-muted">Every playlist created across Vibe Banger.</p>

      <div className="mt-6">
        <PlaylistsManager />
      </div>
    </div>
  );
}
