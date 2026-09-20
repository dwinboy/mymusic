import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "About",
  description: "Why Vibe Banger exists: songs written from real experience, and songs made for one particular person.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-8 sm:py-14">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">About</p>
      <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
        Songs with somebody&apos;s life in them
      </h1>

      <div className="mt-8 flex flex-col gap-5 text-base leading-relaxed text-foreground-muted">
        <p>
          {LEGAL.siteName} started with songs about things that actually happened — a market, a mother, a town, a
          friend who tells the truth when nobody else will. The words come out of somebody&apos;s life, written in the
          language they actually speak, and they were written to be understood rather than admired.
        </p>
        <p>
          That is also why anyone can have one made. A birthday, a wedding, a goodbye, an apology — occasions people
          have always marked with music, except that the song was never about them. Tell us the story and we will write
          one that is.
        </p>
        <p>
          The music is produced with AI tools, and every song says so on its own page. We don&apos;t lead with it,
          because how a song was recorded has never been the reason anyone loves it. We don&apos;t hide it either. The
          part that matters — what a song is about, and who it is for — is still done by a person.
        </p>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href="/request">Have a song made</Link>
        </Button>
        <Button asChild variant="secondary" size="lg">
          <Link href="/discover">Listen first</Link>
        </Button>
      </div>

      <p className="mt-10 text-sm text-foreground-muted">
        Anything else —{" "}
        <Link href="/contact" className="font-medium text-foreground underline">
          get in touch
        </Link>
        .
      </p>
    </div>
  );
}
