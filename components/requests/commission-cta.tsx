import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The invitation to commission a song, shown at the foot of a browse page.
 *
 * Placed here on purpose: someone who has just scrolled an occasion looking
 * for the right song and not found it is the best-qualified person on the
 * site to be asked, and far better qualified than anyone reading a nav link.
 */
export function CommissionCta({ occasion }: { occasion?: string }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface/40 p-6 sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 max-w-xl">
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-accent">
            <Sparkles className="h-3.5 w-3.5" /> Commissions
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {occasion ? `Nothing quite right for your ${occasion.toLowerCase()}?` : "Can't find the right song?"}
          </h2>
          <p className="mt-2 text-sm text-foreground-muted">
            Have one written for the person you have in mind. Tell us the story and we&apos;ll make an original song
            from it — yours to keep, private unless you say otherwise.
          </p>
        </div>
        <Button asChild size="lg" className="shrink-0">
          <Link href="/request">Request a song</Link>
        </Button>
      </div>
    </section>
  );
}
