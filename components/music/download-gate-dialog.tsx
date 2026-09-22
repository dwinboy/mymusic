"use client";

import Link from "next/link";
import { Download, Heart, Sparkles, Music4 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useDownloadGate, closeDownloadGate } from "@/hooks/use-download-gate";

/**
 * Why an account is worth having, answered at the moment someone asks for
 * something that needs one.
 *
 * Each line is something the app actually does today — a list of promises
 * would be a worse reason to sign up than the four real ones.
 */
const REASONS = [
  {
    icon: Download,
    title: "Listen with no connection",
    body: "Songs kept on your device, signal or not.",
  },
  {
    icon: Heart,
    title: "Liked songs and playlists",
    body: "Everything you love, in one place.",
  },
  {
    icon: Sparkles,
    title: "A homepage that learns",
    body: "Continue Listening, and more of your sound.",
  },
  {
    icon: Music4,
    title: "A song written for someone",
    body: "A track for a birthday, a wedding, a goodbye.",
  },
];

export function DownloadGateDialog() {
  const { open, trackTitle, returnTo } = useDownloadGate();

  const next = encodeURIComponent(returnTo ?? "/");

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && closeDownloadGate()}>
      <DialogContent className="max-w-md p-0">
        <div className="max-h-[85svh] overflow-y-auto p-5 sm:p-6">
          <DialogTitle className="pr-8 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            Downloads need a free account
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-sm text-foreground-muted">
            {trackTitle ? (
              <>
                To keep <span className="font-medium text-foreground">{trackTitle}</span> on this device you&apos;ll
                need an account. An email and a password, nothing else.
              </>
            ) : (
              <>
                To keep music on this device you&apos;ll need an account. An email and a password, nothing else.
              </>
            )}
          </DialogDescription>

          <ul className="mt-4 flex flex-col gap-3">
            {REASONS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-2.5">
                <span className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface text-accent">
                  <Icon className="h-[13px] w-[13px]" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-foreground-muted">{body}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex flex-col gap-2">
            <Button asChild onClick={closeDownloadGate}>
              <Link href={`/register?callbackUrl=${next}`}>Create a free account</Link>
            </Button>
            <Button asChild variant="secondary" onClick={closeDownloadGate}>
              <Link href={`/login?callbackUrl=${next}`}>I already have one</Link>
            </Button>
          </div>

          {/* Playing is not gated, and saying so is the honest thing to do
              rather than leaving someone thinking the music stopped here. */}
          <button
            onClick={closeDownloadGate}
            className="mx-auto mt-3 block text-xs text-foreground-subtle underline underline-offset-2 hover:text-foreground-muted"
          >
            Not now — keep listening
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
