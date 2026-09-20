"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { REQUEST_STATUS_LABELS } from "@/lib/song-requests/status";
import type { SongRequestStatus } from "@/lib/generated/prisma/client";

export interface DeliverableTrack {
  id: string;
  title: string;
  artistName: string;
}

/**
 * Working a commission: quote it, move it on, deliver the song.
 *
 * Only transitions the server would accept are offered, so the panel can't
 * show a button that produces a 409. The server checks them again anyway —
 * this is about not lying to the person using it, not about security.
 */
export function RequestActions({
  requestId,
  status,
  nextStatuses,
  currency,
  tracks,
  deliveredTrackId,
}: {
  requestId: string;
  status: SongRequestStatus;
  nextStatuses: SongRequestStatus[];
  /** Last currency quoted, or a sensible default to start from. */
  currency: string;
  tracks: DeliverableTrack[];
  deliveredTrackId: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const [amount, setAmount] = useState("");
  const [quoteCurrency, setQuoteCurrency] = useState(currency);
  const [quoteNote, setQuoteNote] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [declineReason, setDeclineReason] = useState("");
  const [trackId, setTrackId] = useState(deliveredTrackId ?? "");

  async function post(label: string, body: unknown) {
    setBusy(label);
    try {
      const response = await fetch(`/api/admin/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast({ title: data.error ?? "That didn't work.", variant: "danger" });
        return false;
      }
      router.refresh();
      return true;
    } catch {
      toast({ title: "That didn't work.", variant: "danger" });
      return false;
    } finally {
      setBusy(null);
    }
  }

  const canQuote = nextStatuses.includes("QUOTED") || status === "SUBMITTED";
  const canDeliver = nextStatuses.includes("DELIVERED");
  const canDecline = nextStatuses.includes("DECLINED");
  const movable = nextStatuses.filter((s) => s !== "QUOTED" && s !== "DELIVERED" && s !== "DECLINED");

  return (
    <div className="flex flex-col gap-6">
      {canQuote && (
        <section className="rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground">{status === "QUOTED" ? "Re-quote" : "Send a quote"}</h3>
          <p className="mt-1 text-xs text-foreground-muted">
            Emails them the price. Re-quoting clears any acceptance, because it&apos;s a new offer.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <div className="min-w-0 flex-1">
              <Label htmlFor="quoteAmount" className="text-xs text-foreground-muted">
                Amount
              </Label>
              <Input
                id="quoteAmount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="25000"
              />
            </div>
            <div className="w-24">
              <Label htmlFor="quoteCurrency" className="text-xs text-foreground-muted">
                Currency
              </Label>
              <Input
                id="quoteCurrency"
                value={quoteCurrency}
                onChange={(e) => setQuoteCurrency(e.target.value.toUpperCase())}
                maxLength={3}
              />
            </div>
          </div>
          <Textarea
            value={quoteNote}
            onChange={(e) => setQuoteNote(e.target.value)}
            rows={3}
            className="mt-3"
            placeholder="What's included, how long it'll take, how to pay."
            aria-label="Note to send with the quote"
          />
          <Button
            className="mt-3"
            disabled={busy !== null || !amount.trim()}
            onClick={async () => {
              const value = Number(amount.replace(/[^\d.]/g, ""));
              if (!Number.isFinite(value) || value <= 0) {
                toast({ title: "That price doesn't look right.", variant: "danger" });
                return;
              }
              if (await post("quote", { action: "quote", quote: { amount: value, currency: quoteCurrency, note: quoteNote || null } })) {
                setAmount("");
                setQuoteNote("");
                toast({ title: "Quote sent." });
              }
            }}
          >
            {busy === "quote" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send quote
          </Button>
        </section>
      )}

      {movable.length > 0 && (
        <section className="rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground">Move it on</h3>
          {movable.includes("ACCEPTED") && (
            <>
              <p className="mt-1 text-xs text-foreground-muted">
                Accepting means the money reached you. Record how, so there&apos;s a trail.
              </p>
              <Input
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                className="mt-3"
                placeholder="MTN MoMo, 20 Sep"
                aria-label="How they paid"
              />
            </>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {movable.map((next) => (
              <Button
                key={next}
                variant="secondary"
                disabled={busy !== null}
                onClick={async () => {
                  if (await post(next, { action: "status", status: next, paymentNote })) {
                    toast({ title: `Moved to ${REQUEST_STATUS_LABELS[next].toLowerCase()}.` });
                  }
                }}
              >
                {busy === next && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {REQUEST_STATUS_LABELS[next]}
              </Button>
            ))}
          </div>
        </section>
      )}

      {canDeliver && (
        <section className="rounded-xl border border-accent/30 bg-accent/5 p-4">
          <h3 className="text-sm font-semibold text-foreground">Deliver the song</h3>
          <p className="mt-1 text-xs text-foreground-muted">
            Pick the finished track. They get an email with a link to play and download it.
          </p>
          <select
            value={trackId}
            onChange={(e) => setTrackId(e.target.value)}
            aria-label="Finished track"
            className="mt-3 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-foreground"
          >
            <option value="">Choose a track…</option>
            {tracks.map((track) => (
              <option key={track.id} value={track.id}>
                {track.title} — {track.artistName}
              </option>
            ))}
          </select>
          <Button
            className="mt-3"
            disabled={busy !== null || !trackId}
            onClick={async () => {
              if (await post("deliver", { action: "deliver", trackId })) toast({ title: "Delivered." });
            }}
          >
            {busy === "deliver" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Deliver
          </Button>
        </section>
      )}

      {canDecline && (
        <section className="rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground">Decline</h3>
          <p className="mt-1 text-xs text-foreground-muted">They see this reason, so write it for them.</p>
          <Textarea
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            rows={2}
            className="mt-3"
            placeholder="We can't make this in time for your date."
            aria-label="Why you're declining"
          />
          <Button
            variant="ghost"
            className="mt-3 text-danger"
            disabled={busy !== null}
            onClick={async () => {
              if (!confirm("Decline this request? They'll be emailed.")) return;
              if (await post("DECLINED", { action: "status", status: "DECLINED", declineReason })) {
                toast({ title: "Declined." });
              }
            }}
          >
            {busy === "DECLINED" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Decline request
          </Button>
        </section>
      )}
    </div>
  );
}
