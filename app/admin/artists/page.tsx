import { ArtistsManager } from "@/components/admin/artists-manager";
import { isImageCloudinaryEnabled } from "@/lib/media/image-service";

export const metadata = { title: "Artists" };

export default function AdminArtistsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
      <h1 className="text-2xl font-semibold text-foreground">Artists</h1>
      <p className="mt-1 text-sm text-foreground-muted">Manage the artists publishing on Vibe Banger.</p>

      <div className="mt-6">
        <ArtistsManager imageCloudinaryEnabled={isImageCloudinaryEnabled()} />
      </div>
    </div>
  );
}
