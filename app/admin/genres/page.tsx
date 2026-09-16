import { GenresManager } from "@/components/admin/genres-manager";

export const metadata = { title: "Genres" };

export default function AdminGenresPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
      <h1 className="text-2xl font-semibold text-foreground">Genres</h1>
      <p className="mt-1 text-sm text-foreground-muted">Manage the genres used to tag and browse tracks.</p>

      <div className="mt-6">
        <GenresManager />
      </div>
    </div>
  );
}
