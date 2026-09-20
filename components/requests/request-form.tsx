"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export interface TermOption {
  id: string;
  name: string;
}

/**
 * The brief.
 *
 * Grouped into three questions a person can actually answer — what's the
 * occasion, who is it for, what should it sound like — rather than one long
 * column of inputs. Only the story is required: every other field either has
 * a sensible absence or is usually carried by the story anyway, and a form
 * that demands everything is a form people abandon.
 */
export function RequestForm({
  occasions,
  moods,
  genres,
}: {
  occasions: TermOption[];
  moods: TermOption[];
  genres: TermOption[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [problems, setProblems] = useState<Record<string, string>>({});

  const [occasionTermId, setOccasionTermId] = useState<string | null>(null);
  const [occasionNote, setOccasionNote] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [story, setStory] = useState("");
  const [mustInclude, setMustInclude] = useState("");
  const [termIds, setTermIds] = useState<string[]>([]);
  const [language, setLanguage] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [neededBy, setNeededBy] = useState("");
  const [publishConsent, setPublishConsent] = useState(false);

  const toggleTerm = (id: string) =>
    setTermIds((current) => (current.includes(id) ? current.filter((t) => t !== id) : [...current, id]));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setProblems({});

    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occasionTermId,
          occasionNote: occasionNote || null,
          recipientName: recipientName || null,
          relationship: relationship || null,
          pronouns: pronouns || null,
          story,
          mustInclude: mustInclude || null,
          termIds,
          language: language || null,
          referenceUrl: referenceUrl || null,
          neededBy: neededBy || null,
          publishConsent,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (Array.isArray(data.problems)) {
          setProblems(Object.fromEntries(data.problems.map((p: { field: string; message: string }) => [p.field, p.message])));
        }
        toast({ title: data.error ?? "That didn't send.", variant: "danger" });
        return;
      }

      router.push(`/requests/${data.request.id}?new=1`);
    } catch {
      toast({ title: "That didn't send. Check your connection and try again.", variant: "danger" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-10">
      <Section title="What's the occasion?" hint="So we start from the right feeling.">
        <div className="flex flex-wrap gap-2">
          {occasions.map((term) => (
            <Chip
              key={term.id}
              selected={occasionTermId === term.id}
              onClick={() => setOccasionTermId(occasionTermId === term.id ? null : term.id)}
            >
              {term.name}
            </Chip>
          ))}
        </div>
        <Field label="Or describe it yourself" error={problems.occasion} optional>
          <Input
            id="occasionNote"
            value={occasionNote}
            onChange={(e) => setOccasionNote(e.target.value)}
            placeholder="A farewell for a colleague who's moving away"
            maxLength={120}
          />
        </Field>
      </Section>

      <Section title="Who is it for?" hint="Leave blank if it isn't for anyone in particular.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Their name" optional>
            <Input id="recipientName" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Amara" maxLength={120} />
          </Field>
          <Field label="Who they are to you" optional>
            <Input id="relationship" value={relationship} onChange={(e) => setRelationship(e.target.value)} placeholder="My mother" maxLength={120} />
          </Field>
        </div>
        {/* Asked outright rather than guessed from a name: a song that
            misgenders the person it celebrates is the one mistake that can't
            be smoothed over afterwards. */}
        <Field label="How to refer to them" hint="she / her, he / him, they / them — so the lyrics get it right." optional>
          <Input id="pronouns" value={pronouns} onChange={(e) => setPronouns(e.target.value)} placeholder="she / her" maxLength={40} />
        </Field>
      </Section>

      <Section title="What should it say?" hint="This is the part we write from — the more you give us, the more it sounds like you.">
        <Field label="The story" error={problems.story}>
          <Textarea
            id="story"
            value={story}
            onChange={(e) => setStory(e.target.value)}
            rows={7}
            maxLength={4000}
            placeholder="We met at university in Douala. She's the one who tells the truth when nobody else will. She's turning 60 and I want her to hear how much that has meant."
            required
          />
          <p className="mt-1.5 text-xs text-foreground-subtle">{story.trim().length} characters — aim for a few sentences at least.</p>
        </Field>
        <Field label="Anything that must be in it" hint="Names, dates, a phrase they always say." optional>
          <Textarea
            id="mustInclude"
            value={mustInclude}
            onChange={(e) => setMustInclude(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder={`"Na so life be" — she says it every time something goes wrong`}
          />
        </Field>
      </Section>

      <Section title="What should it sound like?" hint="Optional, but it helps us get closer first time.">
        {genres.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Style</p>
            <div className="flex flex-wrap gap-2">
              {genres.map((term) => (
                <Chip key={term.id} selected={termIds.includes(term.id)} onClick={() => toggleTerm(term.id)}>
                  {term.name}
                </Chip>
              ))}
            </div>
          </div>
        )}
        {moods.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Mood</p>
            <div className="flex flex-wrap gap-2">
              {moods.map((term) => (
                <Chip key={term.id} selected={termIds.includes(term.id)} onClick={() => toggleTerm(term.id)}>
                  {term.name}
                </Chip>
              ))}
            </div>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Language" optional>
            <Input id="language" value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="English, Pidgin, French" maxLength={60} />
          </Field>
          <Field label="A song it should feel like" error={problems.referenceUrl} optional>
            <Input
              id="referenceUrl"
              type="url"
              value={referenceUrl}
              onChange={(e) => setReferenceUrl(e.target.value)}
              placeholder="https://..."
            />
          </Field>
        </div>
      </Section>

      <Section title="When do you need it?" hint="We'll tell you honestly whether we can make that date.">
        <Field label="Needed by" error={problems.neededBy} optional>
          <Input
            id="neededBy"
            type="date"
            value={neededBy}
            onChange={(e) => setNeededBy(e.target.value)}
            min={new Date().toISOString().slice(0, 10)}
            className="w-auto"
          />
        </Field>

        <div className="flex items-start gap-3 rounded-xl border border-border bg-surface/40 p-4">
          <Switch id="publishConsent" checked={publishConsent} onCheckedChange={setPublishConsent} />
          <div className="min-w-0">
            <Label htmlFor="publishConsent" className="text-sm font-medium text-foreground">
              You may add it to the public catalogue
            </Label>
            <p className="mt-1 text-xs text-foreground-muted">
              Off by default. Your song is private to your account unless you turn this on — a song written for one
              person stays that way unless you say otherwise.
            </p>
          </div>
        </div>
      </Section>

      <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-foreground-muted">
          Sending this costs nothing. We&apos;ll read it and come back with a price before anything is made.
        </p>
        <Button type="submit" size="lg" disabled={submitting} className="shrink-0">
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitting ? "Sending" : "Send the brief"}
        </Button>
      </div>
    </form>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
        {hint && <p className="mt-1 text-sm text-foreground-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  hint,
  error,
  optional,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline gap-2">
        <Label className="text-sm text-foreground">{label}</Label>
        {optional && <span className="text-xs text-foreground-subtle">optional</span>}
      </div>
      {hint && <p className="mb-1.5 text-xs text-foreground-muted">{hint}</p>}
      {children}
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  );
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
        selected
          ? "border-accent bg-accent/15 text-foreground"
          : "border-border-strong text-foreground-muted hover:border-foreground-subtle hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
