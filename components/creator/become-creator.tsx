"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Sparkles, Upload, ShieldCheck, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * Becoming a creator is naming your creator profile: there's no application
 * to wait on. What waits for approval is each track, not the person.
 */
export function BecomeCreator() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/creator/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, bio }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't create your profile.");
        return;
      }
      router.push("/creator/upload");
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-10 sm:px-8 md:grid-cols-[1.1fr_1fr] md:py-16">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">Creator Studio</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Share your music on Vibe Banger</h1>
        <p className="mt-4 max-w-md text-foreground-muted">
          Upload AI-generated or AI-assisted tracks, classify them so the right listeners find them, and see how they&apos;re
          doing.
        </p>
        <ul className="mt-8 flex flex-col gap-5">
          {[
            { icon: Upload, title: "Upload in minutes", body: "Audio, artwork, and a few details. Streaming versions are made for you." },
            { icon: ShieldCheck, title: "Reviewed before it goes live", body: "Every track is checked by our team first, usually quickly." },
            { icon: BarChart3, title: "Know your listeners", body: "Plays, listeners, likes and downloads for each track." },
          ].map((item) => (
            <li key={item.title} className="flex gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-accent">
                <item.icon className="h-[18px] w-[18px]" />
              </span>
              <span>
                <span className="block font-medium text-foreground">{item.title}</span>
                <span className="block text-sm text-foreground-muted">{item.body}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <form onSubmit={create} className="flex h-fit flex-col gap-5 rounded-3xl border border-border bg-surface/40 p-6 sm:p-8">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/15 text-accent">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Create your creator profile</h2>
          <p className="mt-1 text-sm text-foreground-muted">This is the name listeners see. You can change it later.</p>
        </div>
        <div>
          <Label htmlFor="creator-name">Creator name</Label>
          <Input
            id="creator-name"
            className="mt-1.5"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="Midnight Circuit"
            autoFocus
            required
          />
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <Label htmlFor="creator-bio">About</Label>
            <span className="text-xs text-foreground-subtle">Optional</span>
          </div>
          <Textarea
            id="creator-bio"
            className="mt-1.5"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={2000}
            placeholder="The sound you make, in a sentence or two."
          />
        </div>
        {error && (
          <p className="flex items-center gap-2 text-sm text-danger" role="alert">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
          </p>
        )}
        <Button type="submit" size="lg" disabled={busy || name.trim().length < 2}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Create profile
        </Button>
      </form>
    </div>
  );
}
