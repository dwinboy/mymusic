"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useHydrated } from "@/hooks/use-hydrated";
import { cn } from "@/lib/utils";

export interface ConversationMessage {
  id: string;
  body: string;
  createdAt: string | Date;
  author: { id: string; name: string | null; role: string } | null;
}

/**
 * The thread on a commission.
 *
 * Dates render as a plain ISO day until hydration, then as a local date — the
 * same guard the moderation queue uses, because a locale-formatted date
 * computed during hydration is a server/client mismatch.
 */
export function RequestConversation({
  requestId,
  messages,
  endpoint,
  canPost = true,
}: {
  requestId: string;
  messages: ConversationMessage[];
  /** "/api/requests" for the requester, "/api/admin/requests" for admins. */
  endpoint: string;
  canPost?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const hydrated = useHydrated();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    try {
      const response = await fetch(`${endpoint}/${requestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      if (!response.ok) {
        toast({ title: "That didn't send.", variant: "danger" });
        return;
      }
      setBody("");
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
          {messages.map((message) => {
            const fromUs = message.author?.role === "ADMIN";
            return (
              <li
                key={message.id}
                className={cn(
                  "rounded-xl border p-3.5",
                  fromUs ? "border-accent/25 bg-accent/5" : "border-border bg-surface/40"
                )}
              >
                <p className="text-xs text-foreground-subtle">
                  {fromUs ? "Vibe Banger" : (message.author?.name ?? "You")} · {when(message.createdAt)}
                </p>
                <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground">{message.body}</p>
              </li>
            );
          })}
        </ul>
      )}

      {canPost && (
        <form onSubmit={send} className={cn(messages.length > 0 && "mt-4")}>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={4000}
            placeholder="Add anything you forgot, or ask us a question."
            aria-label="Write a message"
          />
          <div className="mt-2 flex justify-end">
            <Button type="submit" size="sm" disabled={sending || !body.trim()}>
              {sending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-2 h-3.5 w-3.5" />}
              Send
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
