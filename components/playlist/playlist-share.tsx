"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Share2, Globe, Lock, Loader2, Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ShareMenu } from "@/components/music/share-menu";
import { useToast } from "@/hooks/use-toast";

/**
 * Sharing a playlist, which until now handed out a link that 404'd.
 *
 * Every playlist is created private and there was no way for its owner to
 * change that — but the page still showed a share button, so the link went
 * out and whoever opened it was told the playlist did not exist. Rather than
 * hide the button, it now asks the question it always should have: this is
 * private, do you want a link that works?
 */
export function PlaylistShare({
  playlistId,
  isPublic,
  isOwner,
  url,
  title,
}: {
  playlistId: string;
  isPublic: boolean;
  isOwner: boolean;
  url: string;
  title: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Public, or someone else's — the ordinary share menu is the whole answer.
  if (isPublic || !isOwner) {
    return (
      <ShareMenu
        url={url}
        title={title}
        text={`${title} — a playlist on Vibe Banger`}
        size="lg"
        className="rounded-full border border-border-strong p-2.5"
      />
    );
  }

  async function makePublic() {
    setSaving(true);
    try {
      const response = await fetch(`/api/playlists/${playlistId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: true }),
      });
      if (!response.ok) {
        toast({ title: "That didn't work.", variant: "danger" });
        return;
      }
      toast({ title: "Anyone with the link can now listen" });
      router.refresh();
    } catch {
      toast({ title: "That didn't work.", variant: "danger" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="icon-lg"
        aria-label={`Share ${title}`}
        className="rounded-full"
        onClick={() => setOpen(true)}
      >
        <Share2 className="h-5 w-5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-foreground-muted">
            <Lock className="h-[18px] w-[18px]" />
          </span>
          <DialogTitle className="mt-3.5 pr-8 text-lg font-semibold tracking-tight text-foreground">
            This playlist is private
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-sm leading-relaxed text-foreground-muted">
            Only you can open it. Turn on link sharing and anyone you send the link to can listen — they won&apos;t
            need an account, and they can&apos;t change anything.
          </DialogDescription>

          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-border bg-surface p-3">
            <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-foreground-subtle" />
            <p className="min-w-0 flex-1 break-all text-xs text-foreground-muted">{url}</p>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <Button size="lg" onClick={makePublic} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Globe className="mr-2 h-4 w-4" />}
              Turn on link sharing
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2500);
                } catch {
                  // Clipboard blocked; the address is printed above.
                }
              }}
            >
              {copied ? <Check className="mr-2 h-4 w-4" /> : <Link2 className="mr-2 h-4 w-4" />}
              {copied ? "Link copied" : "Copy the link anyway"}
            </Button>
          </div>
          <p className="mt-2.5 text-center text-xs text-foreground-subtle">
            Copied while private, the link only works for you.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
