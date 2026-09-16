import { HealthCheckRunner } from "@/components/admin/health-check-runner";

export const metadata = { title: "Media Health Check" };

export default function StorageHealthPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
      <h1 className="text-2xl font-semibold text-foreground">Media health check</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        Spot-checks the 100 most recently updated tracks for missing audio references, missing R2 objects, and missing
        artwork. Nothing is deleted automatically — review each issue and fix it from the track&apos;s edit page.
      </p>

      <div className="mt-8">
        <HealthCheckRunner />
      </div>
    </div>
  );
}
