import Link from "next/link";
import { Heart, ListMusic, History, Disc3, Users, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InstallPrompt } from "@/components/pwa/install-prompt";

/**
 * What a visitor sees at /library before they have an account.
 *
 * It used to redirect straight to the login form, which asks someone to sign
 * in before saying what they would be signing in for — and throws them out of
 * the app to do it. This says what the library holds, and lets them decide.
 */
const HOLDS = [
  { icon: Heart, title: "Liked songs", body: "Everything you've hearted, in one place." },
  { icon: ListMusic, title: "Your playlists", body: "Build them from any song's menu, keep them private or share them." },
  { icon: History, title: "Listening history", body: "Find that track you played last week and can't name." },
  { icon: Disc3, title: "Saved albums", body: "Keep a release to hand without hunting for it again." },
  { icon: Users, title: "Creators you follow", body: "Their new music, gathered as it lands." },
  { icon: Download, title: "Offline downloads", body: "Save music to this device and play it with no connection." },
];

export function SignedOutLibrary() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-8 sm:py-16">
      <header className="max-w-xl">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">Your library</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Keep what you like
        </h1>
        <p className="mt-3 text-base text-foreground-muted">
          An account is free, takes an email and a password, and nothing else. Your music stays yours.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Button asChild size="lg">
            <Link href="/register">Create a free account</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="/login?callbackUrl=/library">Log in</Link>
          </Button>
        </div>
      </header>

      {/* Installing needs no account, and this page is where someone looks
          for the app side of things. Without it a signed-out visitor had
          nowhere at all to install from until they'd listened for half a
          minute. */}
      <div className="mt-8">
        <InstallPrompt />
      </div>

      <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2">
        {HOLDS.map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex gap-4 bg-canvas p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-accent">
              <Icon className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0">
              <p className="font-medium text-foreground">{title}</p>
              <p className="mt-1 text-sm text-foreground-muted">{body}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-8 text-sm text-foreground-muted">
        Not ready?{" "}
        <Link href="/discover" className="font-medium text-foreground underline">
          Keep listening
        </Link>{" "}
        — nothing here is required to play music.
      </p>
    </div>
  );
}
