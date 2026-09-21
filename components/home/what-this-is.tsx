import Link from "next/link";
import { PenLine, HeartHandshake, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * What the platform is for, at the foot of the homepage.
 *
 * The site used to introduce itself by its production method — "an original
 * catalogue of AI-composed music" — which told a stranger nothing about why
 * they'd want to hear any of it, and framed every song by a technical fact
 * rather than by what it's about.
 *
 * This says the real thing instead: the songs come out of somebody's life,
 * the words are written by people, and anyone can have one made for someone
 * they care about. How a track is produced is still stated on its own page,
 * where someone reading about that song will find it.
 */
const POINTS = [
  {
    icon: PenLine,
    title: "Written by people",
    body: "The words come from real life — someone's memories, their language, the way they actually talk.",
  },
  {
    icon: HeartHandshake,
    title: "Made for someone",
    body: "A lot of this music was written for a particular person, and it sounds like it.",
  },
  {
    icon: Sparkles,
    title: "Yours to commission",
    body: "Tell us your story and we'll write a song from it — for a birthday, a wedding, or no reason at all.",
  },
];

export function WhatThisIs() {
  return (
    // Sits on the page rather than in a card. Boxed, it read as an
    // advertisement dropped onto the end of the homepage; the rails above it
    // carry no border either, so a panel here broke the rhythm of the page.
    <section className="border-t border-border pt-8">
      <div className="max-w-2xl">
        <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Music that carries somebody&apos;s story
        </h2>
        <p className="mt-3 text-sm text-foreground-muted sm:text-base">
          Vibe Banger exists so people can say something through music — to a mother, a friend, a whole town.
          The songs here started as somebody&apos;s experience, and they were written to be understood.
        </p>
      </div>

      <div className="mt-8 grid gap-x-8 gap-y-7 sm:grid-cols-3">
        {POINTS.map(({ icon: Icon, title, body }) => (
          <div key={title}>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-accent">
              <Icon className="h-[18px] w-[18px]" />
            </span>
            <p className="mt-3 text-sm font-medium text-foreground">{title}</p>
            <p className="mt-1 text-sm text-foreground-muted">{body}</p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <Button asChild size="lg">
          <Link href="/request">Have a song made</Link>
        </Button>
      </div>
    </section>
  );
}
