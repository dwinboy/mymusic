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
    // Warmed deliberately. As a plain surface panel it read as a notice at
    // the end of the page; gold makes it an offer, which is what it is. The
    // gradient runs off to the right so the text sits on the strongest part
    // and the card doesn't become a solid block of colour.
    <section
      className="overflow-hidden rounded-2xl border border-accent/25 p-6 sm:p-8"
      style={{
        backgroundImage:
          "linear-gradient(115deg, color-mix(in srgb, var(--color-accent) 16%, transparent) 0%, color-mix(in srgb, var(--color-accent) 5%, transparent) 42%, transparent 78%)",
      }}
    >
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
