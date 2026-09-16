import { AlbumsManager } from "@/components/admin/albums-manager";
import { isImageCloudinaryEnabled } from "@/lib/media/image-service";

export const metadata = { title: "Albums" };

export default function AdminAlbumsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
      <h1 className="text-2xl font-semibold text-foreground">Albums</h1>
      <p className="mt-1 text-sm text-foreground-muted">Manage albums and their publish status.</p>

      <div className="mt-6">
        <AlbumsManager imageCloudinaryEnabled={isImageCloudinaryEnabled()} />
      </div>
    </div>
  );
}
