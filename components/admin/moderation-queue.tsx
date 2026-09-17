"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, Loader2, MessageSquareWarning, ShieldCheck, Music2, AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatDuration, cn } from "@/lib/utils";

export interface QueueItem {
  id: string;
  title: string;
  artistName: string;
  ownerEmail: string | null;
  albumTitle: string | null;
  coverUrl: string | null;
  previewUrl: string | null;
  duration: number;
  description: string | null;
  lyrics: string | null;
  isExplicit: boolean;
  aiDisclosure: "AI_GENERATED" | "AI_ASSISTED" | "HUMAN_CREATED";
  aiTool: string | null;
  aiDetails: string | null;
  energy: string | null;
  submittedAt: string | null;
  rightsConfirmedAt: string | null;
  /** Reviewed before: an approved track edited, or a rejected one resubmitted. */
  resubmission: boolean;
  terms: { kind: string; names: string[] }[];
}

const DISCLOSURE_LABEL = { AI_GENERATED: "AI-generated", AI_ASSISTED: "AI-assisted", HUMAN_CREATED: "Human-created" } as const;

// Starting points for the note — reviewers still edit them to be specific.
const QUICK_REASONS = [
  "The artwork doesn't meet our guidelines. Please upload different cover art.",
  "The AI disclosure doesn't appear to match this track. Please review how it was made.",
  "There's an audio quality problem (clipping, silence or a truncated file). Please upload a clean master.",
  "We couldn't confirm you have the rights to this material. Please make sure it's original or licensed.",
  "The title or description needs correcting.",
];

function timeAgo(iso: string | null) {
  if (!iso) return "";
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function QueueCard({ item, onDone }: { item: QueueItem; onDone: (id: string) => void }) {
  const { toast } = useToast();
  const [mode, setMode] = useState<"idle" | "rejecting">("idle");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [showLyrics, setShowLyrics] = useState(false);

  async function decide(action: "approve" | "reject") {
    setBusy(action);
    setProblems([]);
    try {
      const res = await fetch(`/api/admin/moderation/${item.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "approve" ? { action } : { action, note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProblems(data.problems?.map((p: { message: string }) => p.message) ?? [data.error ?? "Something went wrong."]);
        return;
      }
      toast({ title: action === "approve" ? "Approved and live" : "Changes requested", description: item.title });
      onDone(item.id);
    } finally {
      setBusy(null);
    }
  }

  return (
    <article className="overflow-hidden rounded-3xl border border-border bg-surface/40">
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:p-6">
        <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-2xl bg-surface sm:w-44">
          {item.coverUrl ? (
            <Image src={item.coverUrl} alt="" fill sizes="(min-width: 640px) 176px, 100vw" className="object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-foreground-subtle">
              <Music2 className="h-8 w-8" />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="accent">{DISCLOSURE_LABEL[item.aiDisclosure]}</Badge>
            {item.resubmission && (
              <Badge variant="outline">
                <RotateCcw className="h-3 w-3" /> Resubmitted
              </Badge>
            )}
            {item.isExplicit && <Badge variant="danger">Explicit</Badge>}
            <span className="text-xs text-foreground-subtle">Submitted {timeAgo(item.submittedAt)}</span>
          </div>
          <h2 className="mt-2 truncate text-xl font-semibold tracking-tight text-foreground">{item.title}</h2>
          <p className="truncate text-sm text-foreground-muted">
            {item.artistName}
            {item.albumTitle && ` · ${item.albumTitle}`} · {formatDuration(item.duration)}
          </p>
          {item.ownerEmail && <p className="mt-0.5 truncate text-xs text-foreground-subtle">Account: {item.ownerEmail}</p>}

          {item.previewUrl ? (
            // Native controls: reviewers need to scrub quickly, and this keeps
            // the unreleased track out of the listener player and its history.
            <audio controls preload="none" src={item.previewUrl} className="mt-4 w-full" />
          ) : (
            <p className="mt-4 flex items-center gap-2 text-sm text-danger">
              <AlertTriangle className="h-4 w-4" /> No playable audio
            </p>
          )}
        </div>
      </div>

      <dl className="grid gap-x-6 gap-y-4 border-t border-border px-5 py-5 text-sm sm:grid-cols-2 sm:px-6">
        {item.terms.map((group) => (
          <div key={group.kind}>
            <dt className="text-xs uppercase tracking-wide text-foreground-subtle">{group.kind}</dt>
            <dd className="mt-0.5 text-foreground">{group.names.join(", ")}</dd>
          </div>
        ))}
        {item.energy && (
          <div>
            <dt className="text-xs uppercase tracking-wide text-foreground-subtle">Energy</dt>
            <dd className="mt-0.5 text-foreground">{item.energy.replace("_", " ").toLowerCase()}</dd>
          </div>
        )}
        {(item.aiTool || item.aiDetails) && (
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-wide text-foreground-subtle">How it was made</dt>
            <dd className="mt-0.5 text-foreground">{[item.aiTool, item.aiDetails].filter(Boolean).join(" — ")}</dd>
          </div>
        )}
        {item.description && (
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-wide text-foreground-subtle">Description</dt>
            <dd className="mt-0.5 whitespace-pre-line text-foreground">{item.description}</dd>
          </div>
        )}
        {item.lyrics && (
          <div className="sm:col-span-2">
            <button type="button" onClick={() => setShowLyrics((v) => !v)} className="text-xs uppercase tracking-wide text-foreground-subtle hover:text-foreground">
              {showLyrics ? "Hide lyrics" : "Show lyrics"}
            </button>
            {showLyrics && <p className="mt-1 max-h-64 overflow-y-auto whitespace-pre-line text-foreground">{item.lyrics}</p>}
          </div>
        )}
        <div className="sm:col-span-2">
          <dt className="text-xs uppercase tracking-wide text-foreground-subtle">Rights</dt>
          <dd className={cn("mt-0.5", item.rightsConfirmedAt ? "text-foreground" : "text-danger")}>
            {item.rightsConfirmedAt ? `Confirmed by the creator on ${new Date(item.rightsConfirmedAt).toLocaleDateString()}` : "Not confirmed"}
          </dd>
        </div>
      </dl>

      <div className="border-t border-border px-5 py-4 sm:px-6">
        {problems.length > 0 && (
          <ul className="mb-4 flex flex-col gap-1.5">
            {problems.map((p) => (
              <li key={p} className="flex gap-2 text-sm text-danger">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {p}
              </li>
            ))}
          </ul>
        )}

        {mode === "rejecting" ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-foreground">What should the creator change?</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setNote(reason)}
                  className="rounded-full border border-border-strong px-3 py-1.5 text-left text-xs text-foreground-muted transition-colors hover:border-foreground-subtle hover:text-foreground"
                >
                  {reason.split(".")[0]}
                </button>
              ))}
            </div>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={2000} placeholder="The creator sees this note exactly as written." autoFocus />
            <div className="flex flex-wrap gap-2">
              <Button variant="danger" onClick={() => decide("reject")} disabled={busy !== null || note.trim().length < 5}>
                {busy === "reject" && <Loader2 className="h-4 w-4 animate-spin" />}
                Send back to creator
              </Button>
              <Button variant="ghost" onClick={() => setMode("idle")} disabled={busy !== null}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => decide("approve")} disabled={busy !== null}>
              {busy === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Approve & publish
            </Button>
            <Button variant="secondary" onClick={() => setMode("rejecting")} disabled={busy !== null}>
              <MessageSquareWarning className="h-4 w-4" /> Request changes
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}

export function ModerationQueue({ items }: { items: QueueItem[] }) {
  const router = useRouter();
  const [remaining, setRemaining] = useState(items);

  if (remaining.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border py-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface text-success">
          <ShieldCheck className="h-6 w-6" />
        </span>
        <p className="font-medium text-foreground">All caught up</p>
        <p className="text-sm text-foreground-muted">New creator submissions will appear here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {remaining.map((item) => (
        <QueueCard
          key={item.id}
          item={item}
          onDone={(id) => {
            setRemaining((prev) => prev.filter((i) => i.id !== id));
            router.refresh();
          }}
        />
      ))}
    </div>
  );
}
