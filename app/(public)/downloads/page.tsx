import type { Metadata } from "next";
import { OfflineDownloadsList } from "@/components/downloads/offline-downloads-list";
import { StorageSummary } from "@/components/downloads/storage-summary";

export const metadata: Metadata = {
  title: "Downloads",
};

export default function DownloadsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">Library</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Downloads</h1>
      <p className="mt-2 text-sm text-foreground-muted">
        Tracks saved for offline listening on this device — they&apos;ll keep playing even without a connection.
      </p>

      <StorageSummary className="mt-6" />

      <div className="mt-8">
        <OfflineDownloadsList />
      </div>
    </div>
  );
}
