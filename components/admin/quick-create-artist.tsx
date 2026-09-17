"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

/**
 * Creates an artist without leaving the page. Exists because the upload flow
 * holds a selected File in memory — navigating off to the artists page to
 * create one loses it, which is a miserable way to meet the app for the first
 * time.
 */
export function QuickCreateArtist({ onCreated }: { onCreated: (artist: { id: string; name: string }) => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);

    const form = new FormData();
    form.set("name", name.trim());
    if (bio.trim()) form.set("bio", bio.trim());

    try {
      const res = await fetch("/api/admin/artists", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't create that artist.");
        setSaving(false);
        return;
      }
      onCreated(data.artist);
      toast({ title: `Added ${data.artist.name}` });
      setName("");
      setBio("");
      setOpen(false);
    } catch {
      setError("Couldn't reach the server. Try again.");
    }
    setSaving(false);
  }

  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> New artist
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New artist</DialogTitle>
          </DialogHeader>

          <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
            <div>
              <Label htmlFor="qc-artist-name">Name</Label>
              <Input
                id="qc-artist-name"
                className="mt-1.5"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Nova Halcyon"
                autoFocus
                required
              />
            </div>
            <div>
              <Label htmlFor="qc-artist-bio">
                Bio <span className="normal-case text-foreground-subtle">(optional)</span>
              </Label>
              <Textarea
                id="qc-artist-bio"
                className="mt-1.5"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <p className="text-xs text-foreground-subtle">
              Artwork and the rest of the profile can be added later under Artists.
            </p>

            <div className="flex items-center gap-2">
              <Button type="submit" disabled={saving || !name.trim()}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Create artist
              </Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
