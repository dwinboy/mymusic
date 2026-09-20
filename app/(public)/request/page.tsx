import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { getTerms } from "@/lib/taxonomy";
import { Button } from "@/components/ui/button";
import { RequestForm } from "@/components/requests/request-form";

export const metadata: Metadata = {
  title: "Request a song",
  description:
    "Have a song written for someone — a birthday, a wedding, a goodbye, or no reason at all. Tell us the story and we'll make it.",
};

/**
 * The commission landing page and brief.
 *
 * Signed out it sells the idea and asks for an account; signed in it is the
 * form. Kept as one route rather than two so every link, share and search
 * result lands somewhere that explains itself.
 */
export default async function RequestPage() {
  const session = await auth();

  const [occasions, moods, genres] = await Promise.all([
    getTerms("OCCASION"),
    getTerms("MOOD"),
    getTerms("GENRE"),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-8 sm:py-14">
      <header className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">Commissions</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
          Have a song made for someone
        </h1>
        <p className="mt-4 text-base text-foreground-muted">
          A birthday, a wedding, an anniversary, a goodbye — or no occasion at all. Tell us who it&apos;s for and what
          you&apos;d say to them, and we&apos;ll write and produce an original song from it.
        </p>
      </header>

      <ol className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
        {[
          { step: "1", title: "Tell us the story", body: "Who it's for and what you want them to hear. No musical knowledge needed." },
          { step: "2", title: "We quote you", body: "A price and a date, before anything is made. Nothing starts until you agree." },
          { step: "3", title: "You get the song", body: "Yours to play, download and keep. Private unless you say otherwise." },
        ].map((item) => (
          <li key={item.step} className="bg-canvas p-5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
              {item.step}
            </span>
            <p className="mt-3 font-medium text-foreground">{item.title}</p>
            <p className="mt-1 text-sm text-foreground-muted">{item.body}</p>
          </li>
        ))}
      </ol>

      <div className="mt-12">
        {session?.user ? (
          <RequestForm occasions={occasions} moods={moods} genres={genres} />
        ) : (
          <div className="rounded-2xl border border-border bg-surface/40 p-6 sm:p-8">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">First, an account</h2>
            <p className="mt-2 max-w-lg text-sm text-foreground-muted">
              It&apos;s free and takes an email and a password. We need somewhere to send your quote, and somewhere
              for your finished song to live that only you can reach.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/register?callbackUrl=/request">Create a free account</Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="/login?callbackUrl=/request">Log in</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
