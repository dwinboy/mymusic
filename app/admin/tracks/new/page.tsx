import { NewTrackFlow } from "@/components/admin/new-track-flow";
import { isImageCloudinaryEnabled } from "@/lib/media/image-service";
import { isAudioR2Enabled } from "@/lib/media/audio-service";

export const metadata = { title: "Upload Track" };

export default function NewTrackPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
      <h1 className="text-2xl font-semibold text-foreground">Upload track</h1>
      <p className="mt-1 text-sm text-foreground-muted">Add a new track to the catalogue.</p>

      <div className="mt-8">
        <NewTrackFlow imageCloudinaryEnabled={isImageCloudinaryEnabled()} audioR2Enabled={isAudioR2Enabled()} />
      </div>
    </div>
  );
}
