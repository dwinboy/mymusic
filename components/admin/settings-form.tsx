"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import type { SiteSettings } from "@/lib/settings";

export function SettingsForm({ initial }: { initial: SiteSettings }) {
  const { toast } = useToast();
  const [siteName, setSiteName] = useState(initial.siteName);
  const [accentColor, setAccentColor] = useState(initial.accentColor);
  const [autoPublish, setAutoPublish] = useState(initial.autoPublish);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteName, accentColor, autoPublish }),
    });

    setSaving(false);

    if (res.ok) {
      toast({ title: "Settings saved", description: "Refresh the site to see the new accent color everywhere." });
    } else {
      toast({ title: "Couldn't save settings", variant: "danger" });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-5">
      <div className="rounded-xl border border-border p-4">
        <label className="flex cursor-pointer items-start justify-between gap-4">
          <span>
            <span className="block text-sm font-medium text-foreground">Publish automatically</span>
            <span className="mt-1 block text-xs text-foreground-muted">
              A creator&apos;s track goes live as soon as it meets the publishing rules — audio processed, artwork,
              title, a genre and confirmed rights. Turn this off to check each one yourself in the review queue first.
            </span>
          </span>
          <Switch checked={autoPublish} onCheckedChange={setAutoPublish} />
        </label>
      </div>

      <div>
        <Label htmlFor="siteName">Site name</Label>
        <Input id="siteName" className="mt-1.5" value={siteName} onChange={(e) => setSiteName(e.target.value)} />
        <p className="mt-1.5 text-xs text-foreground-subtle">
          Used in the navigation logo area. The full brand identity (wordmark, favicon) still lives in code.
        </p>
      </div>

      <div>
        <Label htmlFor="accentColor">Accent color</Label>
        <div className="mt-1.5 flex items-center gap-3">
          <input
            id="accentColor"
            type="color"
            value={accentColor}
            onChange={(e) => setAccentColor(e.target.value)}
            className="h-11 w-14 cursor-pointer rounded-lg border border-border-strong bg-surface"
          />
          <Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="max-w-32 uppercase" />
        </div>
        <p className="mt-1.5 text-xs text-foreground-subtle">
          The single accent color used across the app — active states, play buttons, badges.
        </p>
      </div>

      <Button type="submit" disabled={saving} className="w-fit">
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        Save settings
      </Button>
    </form>
  );
}
