"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

/**
 * Accepting a quote, and pulling out.
 *
 * Accepting records the commitment and nothing more: payment is arranged off
 * the platform, so the request stays on "Quote sent" until an admin confirms
 * the money arrived. Saying that plainly is better than moving the status and
 * implying we've been paid when we haven't.
 */
export function QuoteActions({
  requestId,
  accepted,
  canCancel,
}: {
  requestId: string;
  accepted: boolean;
  canCancel: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState<"accept" | "cancel" | null>(null);

  async function act(action: "accept" | "cancel") {
    if (action === "cancel" && !confirm("Cancel this request? We'll stop work on it.")) return;
    setBusy(action);
    try {
      const response = await fetch(`/api/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast({ title: data.error ?? "That didn't work.", variant: "danger" });
        return;
      }
      toast({
        title: action === "accept" ? "Thanks — we'll be in touch about payment." : "Request cancelled.",
      });
      router.refresh();
    } catch {
      toast({ title: "That didn't work.", variant: "danger" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {accepted ? (
        <p className="flex items-center gap-2 text-sm text-success">
          <Check className="h-4 w-4" /> You&apos;ve accepted this quote. We&apos;ll confirm once payment reaches us.
        </p>
      ) : (
        <Button onClick={() => act("accept")} disabled={busy !== null}>
          {busy === "accept" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Accept this quote
        </Button>
      )}
      {canCancel && (
        <Button variant="ghost" onClick={() => act("cancel")} disabled={busy !== null} className="text-foreground-muted">
          {busy === "cancel" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Cancel request
        </Button>
      )}
    </div>
  );
}
