import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Contact",
  description: "How to reach Vibe Banger — about a song, a commission, a copyright report, or your data.",
};

/**
 * One address, with the subject lines that route a message to the right place.
 *
 * Deliberately not a list of departments that don't exist: a takedown notice
 * that bounces off an unmonitored address is worse than no contact page at
 * all, so everything goes to the one inbox a person actually reads.
 */
const REASONS = [
  {
    subject: "Copyright",
    title: "Music here is yours",
    body: "We take it down. Read what to include first so we can act on it straight away.",
    href: "/copyright",
    linkLabel: "How to report it",
  },
  {
    subject: "Commission",
    title: "About a song you asked for",
    body: "Quote your reference — it looks like VB-7K2Q. You can also reply on the request itself, which is faster.",
    href: "/requests",
    linkLabel: "Your requests",
  },
  {
    subject: "Privacy",
    title: "Your data",
    body: "A copy of what we hold, a correction, or deletion of your account and everything attached to it.",
    href: "/privacy",
    linkLabel: "What we hold",
  },
  {
    subject: "Hello",
    title: "Anything else",
    body: "A problem with the site, a song that won't play, or something you think we should be doing differently.",
    href: null,
    linkLabel: null,
  },
];

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-8 sm:py-14">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">Contact</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Talk to us</h1>
      <p className="mt-4 text-base text-foreground-muted">
        One address, read by a person. Put the word in the subject line so it gets to the right place quickly.
      </p>

      <a
        href={`mailto:${LEGAL.contactEmail}`}
        className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-border-strong px-5 py-3 text-sm font-medium text-foreground transition-colors hover:border-accent hover:bg-accent/5"
      >
        <Mail className="h-4 w-4 text-accent" />
        {LEGAL.contactEmail}
      </a>

      <div className="mt-10 flex flex-col divide-y divide-border border-y border-border">
        {REASONS.map((reason) => (
          <div key={reason.subject} className="py-5">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-foreground-subtle">
              Subject: {reason.subject}
            </p>
            <p className="mt-1.5 font-medium text-foreground">{reason.title}</p>
            <p className="mt-1 text-sm text-foreground-muted">{reason.body}</p>
            {reason.href && reason.linkLabel && (
              <Link
                href={reason.href}
                className="mt-2 inline-block text-sm font-medium text-foreground underline underline-offset-4"
              >
                {reason.linkLabel}
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
