import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TracksTable } from "@/components/admin/tracks-table";

export const metadata = { title: "Tracks" };

export default function AdminTracksPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Tracks</h1>
          <p className="mt-1 text-sm text-foreground-muted">Manage every track in the catalogue.</p>
        </div>
        <Button asChild>
          <Link href="/admin/tracks/new">
            <Plus className="h-4 w-4" /> Upload track
          </Link>
        </Button>
      </div>

      <div className="mt-6">
        <TracksTable />
      </div>
    </div>
  );
}
