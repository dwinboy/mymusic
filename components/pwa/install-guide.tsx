"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Copy, Share, SquarePlus, WifiOff, Maximize2, Zap, Music4, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInstallAvailability } from "@/hooks/use-install-availability";

const BENEFITS = [
  { icon: WifiOff, title: "Plays without a connection", body: "Downloads keep working on a plane or underground." },
  { icon: Maximize2, title: "Full screen, no browser bars", body: "And lock-screen controls while the phone is in your pocket." },
  { icon: Zap, title: "Opens straight from your home screen", body: "One tap, its own icon, and no browser tab to lose it in." },
  { icon: Music4, title: "Stays where you left it", body: "Reopening the icon returns to what was playing, not a new copy." },
];

/**
 * How to install, answered for the device actually in the person's hand.
 *
 * Every platform gets a real answer, including the two that can't install:
 * a webview inside Instagram or WhatsApp, where the only useful thing to say
 * is how to get out, and a desktop browser with no install button.
 */
export function InstallGuide() {
  const { method, promptInstall, context } = useInstallAvailability();
  const [installed, setInstalled] = useState(false);

  return (
    <div className="flex flex-col gap-10">
      <section>{renderAction()}</section>

      <section>
        <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-foreground-subtle">What changes</h2>
        <ul className="mt-4 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2">
          {BENEFITS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-3 bg-canvas p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-accent">
                <Icon className="h-[17px] w-[17px]" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-foreground-muted">{body}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-foreground-subtle">
          It installs from the web — there is no App Store or Play Store download, and it takes a few hundred kilobytes
          rather than a hundred megabytes.
        </p>
      </section>
    </div>
  );

  function renderAction() {
    // Before the platform check resolves, show nothing rather than the wrong
    // instructions for a second.
    if (!context) return <div className="h-32 animate-pulse rounded-2xl bg-surface" />;

    if (context.standalone) {
      return (
        <Panel title="You're already in the app" tone="done">
          <p>
            This is the installed app — no browser bars, downloads available offline, and controls on your lock screen.
          </p>
        </Panel>
      );
    }

    if (context.inApp) {
      return (
        <Panel title="Open this page in your browser first">
          <p>
            You&apos;re viewing Vibe Banger inside another app, which can&apos;t add anything to a home screen. Open
            this page in {context.ios ? "Safari" : "Chrome"} and the option appears.
          </p>
          <ol className="mt-4 flex flex-col gap-2 text-sm">
            <Step n={1}>
              Tap{" "}
              {context.ios ? (
                <>
                  <Share className="mx-0.5 inline h-4 w-4 -translate-y-px text-accent" aria-label="Share" /> or{" "}
                  <MoreVertical className="mx-0.5 inline h-4 w-4 -translate-y-px text-accent" aria-hidden />
                </>
              ) : (
                <MoreVertical className="mx-0.5 inline h-4 w-4 -translate-y-px text-accent" aria-label="Menu" />
              )}{" "}
              at the edge of this screen.
            </Step>
            <Step n={2}>
              Choose <span className="text-foreground">Open in {context.ios ? "Safari" : "Chrome"}</span>, then come
              back to this page.
            </Step>
          </ol>
          <CopyLink />
        </Panel>
      );
    }

    if (method === "prompt") {
      return (
        <Panel title="Install Vibe Banger" tone="accent">
          <p>Your browser can do this in one tap.</p>
          <Button
            size="lg"
            className="mt-5 w-full sm:w-auto"
            onClick={async () => {
              await promptInstall();
              setInstalled(true);
            }}
          >
            {installed ? <Check className="mr-2 h-4 w-4" /> : null}
            {installed ? "Check your home screen" : "Install the app"}
          </Button>
        </Panel>
      );
    }

    if (context.ios) {
      return (
        <Panel title="Add Vibe Banger to your home screen" tone="accent">
          <p>
            iPhone has no install button for websites to press, so it takes two taps of your own. It lands on your home
            screen with its own icon, exactly like an App Store app.
          </p>
          <ol className="mt-5 flex flex-col gap-3 text-sm">
            <Step n={1}>
              Tap <Share className="mx-0.5 inline h-4 w-4 -translate-y-px text-accent" aria-label="Share" />{" "}
              <span className="text-foreground">Share</span> at the bottom of Safari
              <span className="text-foreground-subtle"> (or under ••• in the address bar)</span>.
            </Step>
            <Step n={2}>
              Scroll down and choose{" "}
              <SquarePlus className="mx-0.5 inline h-4 w-4 -translate-y-px text-accent" aria-hidden />{" "}
              <span className="text-foreground">Add to Home Screen</span>, then <span className="text-foreground">Add</span>.
            </Step>
          </ol>
        </Panel>
      );
    }

    // Android without a prompt yet, or a desktop browser that installs from
    // the address bar rather than through an API.
    return (
      <Panel title="Install from your browser's menu">
        <p>
          This browser installs web apps from its own menu rather than offering a button to the page. Look for{" "}
          <span className="text-foreground">Install</span> or{" "}
          <span className="text-foreground">Add to Home screen</span> in the{" "}
          <MoreVertical className="mx-0.5 inline h-4 w-4 -translate-y-px text-accent" aria-hidden /> menu, or in the
          address bar on a computer.
        </p>
        <p className="mt-3 text-foreground-subtle">
          If it isn&apos;t there, nothing is lost — everything works in the browser too, downloads included.
        </p>
        <CopyLink />
      </Panel>
    );
  }
}

function Panel({ title, children, tone }: { title: string; children: React.ReactNode; tone?: "accent" | "done" }) {
  return (
    <div
      className={
        tone === "accent"
          ? "rounded-2xl border border-accent/25 bg-[linear-gradient(160deg,color-mix(in_srgb,var(--color-accent)_9%,transparent),transparent_60%)] p-5 sm:p-6"
          : "rounded-2xl border border-border bg-surface p-5 sm:p-6"
      }
    >
      <div className="flex items-center gap-3">
        <Image src="/icons/icon-192.png" alt="" width={40} height={40} className="shrink-0 rounded-xl" />
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      </div>
      <div className="mt-3 text-sm leading-relaxed text-foreground-muted">{children}</div>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 text-foreground-muted">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-active text-xs font-semibold text-foreground">
        {n}
      </span>
      <span className="pt-0.5">{children}</span>
    </li>
  );
}

/** A webview can't be escaped from script, so hand them the address instead. */
function CopyLink() {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="secondary"
      size="sm"
      className="mt-5"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(`${window.location.origin}/install`);
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        } catch {
          // Clipboard blocked — the address bar still has it.
        }
      }}
    >
      {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
      {copied ? "Link copied" : "Copy the link"}
    </Button>
  );
}
