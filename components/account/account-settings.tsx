"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

/**
 * What someone can do to their own account: change the name people see, and
 * leave.
 *
 * Deletion is typed rather than clicked, and says plainly what goes and what
 * stays beforehand. A confirmation that only asks "are you sure?" tells
 * someone nothing they didn't already know.
 */
export function AccountSettings({ initialName, email }: { initialName: string; email: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast({ title: data.error ?? "That didn't save.", variant: "danger" });
        return;
      }
      toast({ title: "Name updated" });
      router.refresh();
    } catch {
      toast({ title: "That didn't save.", variant: "danger" });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setDeleting(true);
    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast({ title: data.error ?? "That didn't work.", variant: "danger" });
        setDeleting(false);
        return;
      }
      // The account is gone, so the session has to go with it. If signing out
      // can't complete, leave anyway — the deletion already succeeded, and
      // sitting on the settings page for an account that no longer exists is
      // a worse place to be stranded than the homepage with a stale cookie
      // (which the next request invalidates).
      try {
        await signOut({ callbackUrl: "/" });
      } catch {
        // A full reload rather than router.push: the client-side session
        // context is still holding a user who no longer exists, and only a
        // fresh document drops it.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/";
      }
    } catch {
      toast({ title: "That didn't work.", variant: "danger" });
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-12">
      <section>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Your details</h2>
        <form onSubmit={save} className="mt-4 flex flex-col gap-4">
          <div>
            <Label htmlFor="account-name">Name</Label>
            <p className="mb-1.5 mt-0.5 text-xs text-foreground-muted">Shown on your playlists and on messages you send us.</p>
            <Input id="account-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          </div>
          <div>
            <Label htmlFor="account-email">Email</Label>
            <p className="mb-1.5 mt-0.5 text-xs text-foreground-muted">
              How you sign in. Write to us if you need it changed — we verify that by hand.
            </p>
            <Input id="account-email" value={email} readOnly disabled />
          </div>
          <div>
            <Button type="submit" disabled={saving || !name.trim() || name.trim() === initialName}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Leaving</h2>
        <p className="mt-2 text-sm text-foreground-muted">
          You can delete your account here. It happens immediately and cannot be undone.
        </p>

        <div className="mt-5 rounded-2xl border border-danger/30 p-5">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <TriangleAlert className="h-4 w-4 shrink-0 text-danger" />
            What happens
          </p>
          <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-sm text-foreground-muted">
            <li>Your playlists, liked songs, listening history, downloads and follows are deleted.</li>
            <li>Your song requests and the messages on them are deleted.</li>
            <li>
              Any music you published comes off the site. The recordings stay in our storage until an admin removes
              them, so tell us if you want them destroyed too.
            </li>
            <li>
              Play counts stay with the creators whose music you listened to, with nothing identifying you left on
              them.
            </li>
          </ul>
          <p className="mt-3 text-xs text-foreground-subtle">
            The{" "}
            <Link href="/privacy" className="underline">
              privacy page
            </Link>{" "}
            says what we hold and why.
          </p>

          <div className="mt-5 max-w-xs">
            <Label htmlFor="account-confirm" className="text-sm">
              Type <span className="font-semibold text-foreground">DELETE</span> to confirm
            </Label>
            <Input
              id="account-confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="DELETE"
              autoComplete="off"
              className="mt-1.5"
            />
          </div>

          <Button
            variant="danger"
            className="mt-4"
            disabled={confirm !== "DELETE" || deleting}
            onClick={remove}
          >
            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete my account
          </Button>
        </div>
      </section>
    </div>
  );
}
