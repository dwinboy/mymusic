import { HardDrive, Cloud, Image as ImageIcon, AlertTriangle } from "lucide-react";
import { db } from "@/lib/db";
import { formatFileSize, formatCompactNumber } from "@/lib/utils";
import { audioStorageMode } from "@/lib/media/audio-service";
import { imageProvider } from "@/lib/media/image-service";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export const metadata = { title: "Storage" };

export default async function AdminStoragePage() {
  const [sizeAgg, statusCounts, coverStats, artistCount, albumCount] = await Promise.all([
    db.track.aggregate({
      _sum: { originalSize: true, streamingSize: true, downloadSize: true },
      _count: true,
    }),
    db.track.groupBy({ by: ["processingStatus"], _count: true }),
    db.track.groupBy({ by: ["coverImagePublicId"], _count: true, where: { coverImagePublicId: { not: null } } }),
    db.artist.count(),
    db.album.count(),
  ]);

  const statusMap = Object.fromEntries(statusCounts.map((s) => [s.processingStatus, s._count]));
  const totalTracks = sizeAgg._count;
  const originalBytes = sizeAgg._sum.originalSize ?? 0;
  const streamingBytes = sizeAgg._sum.streamingSize ?? 0;
  const downloadBytes = sizeAgg._sum.downloadSize ?? 0;

  const failedTracks = await db.track.findMany({
    where: { processingStatus: "FAILED" },
    select: { id: true, title: true, processingError: true },
    take: 20,
  });

  const isProduction = process.env.NODE_ENV === "production";
  const audioIsLocal = audioStorageMode() !== "r2";
  const imagesAreLocal = imageProvider() !== "cloudinary";

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
      <h1 className="text-2xl font-semibold text-foreground">Storage</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        Aggregated from track records — not a live scan of R2/Cloudinary, so this stays fast no matter how large the
        catalogue gets.
      </p>

      {isProduction && (audioIsLocal || imagesAreLocal) && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <div>
            <p className="font-medium text-foreground">
              {audioIsLocal && imagesAreLocal
                ? "Audio and image storage are both set to local disk in production."
                : audioIsLocal
                  ? "Audio storage is set to local disk in production."
                  : "Image storage is set to local disk in production."}
            </p>
            <p className="mt-1 text-foreground-muted">
              Next.js&apos;s production server only serves <code>/public</code> files that existed at build time —
              new admin uploads write to disk successfully but 404 for visitors until the next deploy. New uploads
              using local storage are blocked here to prevent that. Set{" "}
              {audioIsLocal && <code>AUDIO_STORAGE_DRIVER=r2</code>}
              {audioIsLocal && imagesAreLocal && " and "}
              {imagesAreLocal && <code>IMAGE_PROVIDER=cloudinary</code>} — see MEDIA_SETUP.md.
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={HardDrive} label="Original audio" value={formatFileSize(originalBytes)} />
        <StatCard icon={Cloud} label="Streaming audio" value={formatFileSize(streamingBytes)} />
        <StatCard icon={Cloud} label="Download audio" value={formatFileSize(downloadBytes)} />
        <StatCard icon={ImageIcon} label="Tracks with artwork" value={formatCompactNumber(coverStats.length)} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-subtle">Configuration</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Audio storage driver">
              <Badge variant={audioStorageMode() === "r2" ? "success" : "default"}>
                {audioStorageMode() === "r2" ? "Cloudflare R2" : "Local disk (dev)"}
              </Badge>
            </Row>
            <Row label="Image provider">
              <Badge variant={imageProvider() === "cloudinary" ? "success" : "default"}>
                {imageProvider() === "cloudinary" ? "Cloudinary" : "Local disk (dev)"}
              </Badge>
            </Row>
            <Row label="Total tracks">{formatCompactNumber(totalTracks)}</Row>
            <Row label="Artists / Albums">
              {formatCompactNumber(artistCount)} / {formatCompactNumber(albumCount)}
            </Row>
          </dl>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-subtle">Processing status</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Ready">{formatCompactNumber(statusMap.READY ?? 0)}</Row>
            <Row label="Uploading">{formatCompactNumber(statusMap.UPLOADING ?? 0)}</Row>
            <Row label="Processing">{formatCompactNumber(statusMap.PROCESSING ?? 0)}</Row>
            <Row label="Failed">
              <span className={statusMap.FAILED ? "text-danger" : undefined}>{formatCompactNumber(statusMap.FAILED ?? 0)}</span>
            </Row>
          </dl>
        </div>
      </div>

      {failedTracks.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-danger">
            <AlertTriangle className="h-4 w-4" /> Failed processing
          </h2>
          <div className="flex flex-col divide-y divide-border rounded-xl border border-danger/30 bg-danger/5">
            {failedTracks.map((t) => (
              <Link key={t.id} href={`/admin/tracks/${t.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-hover">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{t.title}</p>
                  {t.processingError && <p className="truncate text-xs text-foreground-muted">{t.processingError}</p>}
                </div>
                <span className="shrink-0 text-xs text-accent">Fix →</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <Link href="/admin/storage/health" className="text-sm font-medium text-accent hover:underline">
          Run a media health check →
        </Link>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <Icon className="h-4 w-4 text-foreground-subtle" />
      <p className="mt-3 text-xl font-semibold text-foreground">{value}</p>
      <p className="text-xs text-foreground-muted">{label}</p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-foreground-muted">{label}</dt>
      <dd className="text-foreground">{children}</dd>
    </div>
  );
}
