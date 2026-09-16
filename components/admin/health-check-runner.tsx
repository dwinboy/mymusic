"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2, AlertTriangle, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Issue {
  trackId: string;
  title: string;
  issue: string;
}

export function HealthCheckRunner() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ checked: number; issues: Issue[] } | null>(null);

  async function run() {
    setRunning(true);
    const res = await fetch("/api/admin/storage/health", { method: "POST" });
    const data = await res.json();
    setResult(data);
    setRunning(false);
  }

  return (
    <div>
      <Button onClick={run} disabled={running}>
        {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
        {running ? "Checking..." : "Run health check"}
      </Button>

      {result && (
        <div className="mt-6">
          <p className="mb-3 text-sm text-foreground-muted">Checked {result.checked} tracks.</p>

          {result.issues.length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 p-4 text-sm text-foreground">
              <CheckCircle2 className="h-4 w-4 text-success" /> No issues found.
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
              {result.issues.map((issue, i) => (
                <Link
                  key={`${issue.trackId}-${i}`}
                  href={`/admin/tracks/${issue.trackId}`}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-surface-hover"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{issue.title}</p>
                    <p className="text-xs text-foreground-muted">{issue.issue}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
