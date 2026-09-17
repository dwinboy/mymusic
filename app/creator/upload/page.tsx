import { redirect } from "next/navigation";
import { PublishFlow } from "@/components/creator/publish-flow";
import { getCreatorContext } from "@/lib/creator-session";
import { isImageCloudinaryEnabled } from "@/lib/media/image-service";
import { isAudioR2Enabled } from "@/lib/media/audio-service";

export const dynamic = "force-dynamic";
export const metadata = { title: "Upload" };

export default async function CreatorUploadPage() {
  const { profiles } = await getCreatorContext("/creator/upload");
  if (profiles.length === 0) redirect("/creator");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8 md:py-10">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">Upload music</h1>
      <p className="mt-1 text-foreground-muted">Your progress is saved as you go — you can finish a draft later.</p>
      <div className="mt-8">
        <PublishFlow
          profiles={profiles.map((p) => ({ id: p.id, name: p.name }))}
          imageUploadsEnabled={isImageCloudinaryEnabled()}
          audioR2Enabled={isAudioR2Enabled()}
        />
      </div>
    </div>
  );
}
