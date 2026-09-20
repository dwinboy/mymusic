"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useHydrated } from "@/hooks/use-hydrated";
import { cn } from "@/lib/utils";

interface AdminMessage {
  id: string;
  body: string;
  isInternal: boolean;
  createdAt: string | Date;
  author: { id: string; name: string | null; role: string } | null;
}

/**
 * The admin's view of a commission thread — the requester's messages, your
 * replies, and your own notes.
 *
 * An internal note is visibly different from a reply, and the switch resets
 * after each send: leaving it on is how a private note ends up emailed to a
 * customer.
 */
export function AdminRequestThread({ requestId, messages }: { requestId: string; messages: AdminMessage[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const hydrated = useHydrated();
  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    try {
      const response = await fetch(`/api/admin/requests/${requestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim(), isInternal }),
      });
      if (!response.ok) {
        toast({ title: "That didn't send.", variant: "danger" });
        return;
      }
      setBody("");
      // Deliberately not sticky: the next message is far more likely to be a
      // reply, and a note sent as a reply can't be taken back.
      setIsInternal(false);
      router.refresh();
    } catch {
      toast({ title: "That didn't send.", variant: "danger" });
    } finally {
      setSending(false);
    }
  }

  const when = (value: string | Date) => {
    const date = new Date(value);
    return hydrated ? date.toLocaleDateString(undefined, { day: "numeric", month: "short" }) : date.toISOString().slice(0, 10);
  };

  return (
    <div>
      {messages.length > 0 && (
        <ul className="flex flex-col gap-3">
          {messages.map((message) => (
            <li
              key={message.id}
              className={cn(
                "rounded-xl border p-3.5",
                message.isInternal
                  ? "border-dashed border-border-strong bg-surface/60"
                  : message.author?.role === "ADMIN"
                    ? "border-accent/25 bg-accent/5"
                    : "border-border bg-surface/40"
              )}
            >
              <p className="flex items-center gap-1.5 text-xs text-foreground-subtle">
                {message.isInternal && <Lock className="h-3 w-3" />}
                {message.isInternal ? "Internal note" : (message.author?.name ?? "Requester")} · {when(message.createdAt)}
              </p>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground">{message.body}</p>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={send} className={cn(messages.length > 0 && "mt-4")}>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={4000}
          placeholder={isInternal ? "A note for yourself. They never see this." : "Reply to them — this is emailed."}
          aria-label="Write a message"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Switch id="isInternal" checked={isInternal} onCheckedChange={setIsInternal} />
            <Label htmlFor="isInternal" className="text-xs text-foreground-muted">
              Internal note
            </Label>
          </div>
          <Button type="submit" size="sm" disabled={sending || !body.trim()}>
            {sending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-2 h-3.5 w-3.5" />}
            {isInternal ? "Save note" : "Send reply"}
          </Button>
        </div>
      </form>
    </div>
  );
}
