"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Plus,
  Loader2,
  ChevronUp,
  ChevronDown,
  Star,
  Trash2,
  ImagePlus,
  Eye,
  EyeOff,
  Check,
  X,
  CornerDownRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog, type ConfirmRequest } from "@/components/admin/confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { uploadImageToCloudinary } from "@/lib/admin/cloudinary-upload";
import { cn } from "@/lib/utils";

export interface AdminTerm {
  id: string;
  kind: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  imagePublicId: string | null;
  parentId: string | null;
  displayOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  _count: { tracks: number; children: number };
}

/**
 * The discovery vocabulary, per kind: create, edit, feature, reorder,
 * illustrate and deactivate. Slugs aren't editable — a genre's slug is its
 * public URL, and changing it would break every link to it.
 */
export function TaxonomyManager({ kind, label, terms }: { kind: string; label: string; terms: AdminTerm[] }) {
  const { toast } = useToast();
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [newParent, setNewParent] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [refreshing, startRefresh] = useTransition();

  // The page renders the current terms; changes go through the API and the
  // server re-renders, so there's no second copy of this list to drift.
  const load = () => startRefresh(() => router.refresh());

  const parents = terms.filter((t) => !t.parentId);
  const childrenOf = (id: string) => terms.filter((t) => t.parentId === id);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (newName.trim().length < 2) return;
    setCreating(true);
    const res = await fetch("/api/admin/taxonomy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, name: newName.trim(), parentId: newParent || undefined }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      toast({ title: "Couldn't add it", description: data.error });
      return;
    }
    setNewName("");
    setNewParent("");
    toast({ title: `${data.term.name} added` });
    load();
  }

  async function patch(id: string, body: Record<string, unknown>, successMessage?: string) {
    setBusyId(id);
    const res = await fetch(`/api/admin/taxonomy/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      toast({ title: "Couldn't save", description: data.error });
      return false;
    }
    if (successMessage) toast({ title: successMessage });
    load();
    return true;
  }

  /** Swaps a term with its neighbour among its siblings and saves the new order. */
  async function move(term: AdminTerm, direction: -1 | 1) {
    const siblings = term.parentId ? childrenOf(term.parentId) : parents;
    const index = siblings.findIndex((t) => t.id === term.id);
    const target = index + direction;
    if (target < 0 || target >= siblings.length) return;
    const reordered = [...siblings];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setBusyId(term.id);
    await fetch("/api/admin/taxonomy/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: reordered.map((t) => t.id) }),
    });
    setBusyId(null);
    load();
  }

  return (
    <div className={cn("flex flex-col gap-6", refreshing && "opacity-80")}>
      <form onSubmit={create} className="flex flex-col gap-2 rounded-xl border border-border bg-surface/40 p-3 sm:flex-row sm:items-center">
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={`New ${label.toLowerCase()}`} maxLength={60} className="sm:max-w-xs" />
        {parents.length > 0 && (
          <select
            value={newParent}
            onChange={(e) => setNewParent(e.target.value)}
            className="h-10 rounded-lg border border-border-strong bg-surface px-3 text-sm text-foreground sm:max-w-xs"
            aria-label="Parent term"
          >
            <option value="">Top level</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                Under {p.name}
              </option>
            ))}
          </select>
        )}
        <Button type="submit" disabled={creating || newName.trim().length < 2} className="sm:ml-auto">
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add
        </Button>
      </form>

      {terms.length === 0 ? (
        <p className="py-10 text-center text-sm text-foreground-muted">No {label.toLowerCase()} terms yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {parents.map((term) => (
            <TermGroup
              key={term.id}
              term={term}
              subterms={childrenOf(term.id)}
              editingId={editingId}
              busyId={busyId}
              onEdit={setEditingId}
              onPatch={patch}
              onMove={move}
              onDelete={(t) =>
                setConfirm({
                  title: `Delete “${t.name}”?`,
                  description: "Only unused terms can be deleted. This can't be undone.",
                  confirmLabel: "Delete term",
                  onConfirm: async () => {
                    const res = await fetch(`/api/admin/taxonomy/${t.id}`, { method: "DELETE" });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) toast({ title: "Couldn't delete", description: data.error });
                    else toast({ title: `${t.name} deleted` });
                    load();
                  },
                })
              }
            />
          ))}
        </div>
      )}

      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

function TermGroup({
  term,
  subterms,
  ...handlers
}: {
  term: AdminTerm;
  subterms: AdminTerm[];
  editingId: string | null;
  busyId: string | null;
  onEdit: (id: string | null) => void;
  onPatch: (id: string, body: Record<string, unknown>, message?: string) => Promise<boolean>;
  onMove: (term: AdminTerm, direction: -1 | 1) => void;
  onDelete: (term: AdminTerm) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <TermRow term={term} {...handlers} />
      {subterms.map((child) => (
        <div key={child.id} className="ml-6 flex items-start gap-2 sm:ml-10">
          <CornerDownRight className="mt-5 h-4 w-4 shrink-0 text-foreground-subtle" />
          <div className="min-w-0 flex-1">
            <TermRow term={child} {...handlers} />
          </div>
        </div>
      ))}
    </div>
  );
}

function TermRow({
  term,
  editingId,
  busyId,
  onEdit,
  onPatch,
  onMove,
  onDelete,
}: {
  term: AdminTerm;
  editingId: string | null;
  busyId: string | null;
  onEdit: (id: string | null) => void;
  onPatch: (id: string, body: Record<string, unknown>, message?: string) => Promise<boolean>;
  onMove: (term: AdminTerm, direction: -1 | 1) => void;
  onDelete: (term: AdminTerm) => void;
}) {
  const { toast } = useToast();
  const editing = editingId === term.id;
  const busy = busyId === term.id;
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function uploadArtwork(file: File) {
    setUploading(true);
    try {
      const result = await uploadImageToCloudinary(file, "vibebanger/taxonomy");
      await onPatch(term.id, { imagePublicId: result.publicId, imageUrl: result.secureUrl }, "Artwork updated");
    } catch {
      toast({ title: "Couldn't upload the artwork" });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={cn("rounded-xl border border-border bg-surface/40 p-3", !term.isActive && "opacity-60")}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          aria-label={`Artwork for ${term.name}`}
          className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border-strong bg-surface text-foreground-subtle transition-colors hover:border-accent/60"
        >
          {term.imageUrl ? <Image src={term.imageUrl} alt="" fill sizes="48px" className="object-cover" /> : <ImagePlus className="h-4 w-4" />}
          {uploading && (
            <span className="absolute inset-0 flex items-center justify-center bg-canvas/70">
              <Loader2 className="h-4 w-4 animate-spin text-accent" />
            </span>
          )}
        </button>
        <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadArtwork(e.target.files[0])} />

        <div className="min-w-0 flex-1">
          {
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-medium text-foreground">{term.name}</p>
              {term.isFeatured && (
                <Badge variant="accent">
                  <Star className="h-3 w-3" /> Featured
                </Badge>
              )}
              {!term.isActive && <Badge variant="outline">Hidden</Badge>}
            </div>
          }
          <p className="mt-0.5 truncate text-xs text-foreground-subtle">
            /{term.slug} · {term._count.tracks} {term._count.tracks === 1 ? "track" : "tracks"}
            {term._count.children > 0 && ` · ${term._count.children} sub-terms`}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            onClick={() => onMove(term, -1)}
            disabled={busy}
            aria-label={`Move ${term.name} up`}
            className="flex h-8 w-8 items-center justify-center rounded-md text-foreground-muted hover:bg-surface-hover hover:text-foreground"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            onClick={() => onMove(term, 1)}
            disabled={busy}
            aria-label={`Move ${term.name} down`}
            className="flex h-8 w-8 items-center justify-center rounded-md text-foreground-muted hover:bg-surface-hover hover:text-foreground"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            onClick={() => onPatch(term.id, { isFeatured: !term.isFeatured })}
            disabled={busy}
            aria-label={term.isFeatured ? `Unfeature ${term.name}` : `Feature ${term.name}`}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md hover:bg-surface-hover",
              term.isFeatured ? "text-accent" : "text-foreground-muted hover:text-foreground"
            )}
          >
            <Star className="h-4 w-4" fill={term.isFeatured ? "currentColor" : "none"} />
          </button>
          <button
            onClick={() => onPatch(term.id, { isActive: !term.isActive }, term.isActive ? `${term.name} hidden` : `${term.name} visible`)}
            disabled={busy}
            aria-label={term.isActive ? `Hide ${term.name}` : `Show ${term.name}`}
            className="flex h-8 w-8 items-center justify-center rounded-md text-foreground-muted hover:bg-surface-hover hover:text-foreground"
          >
            {term.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
          <button
            onClick={() => onDelete(term)}
            disabled={busy}
            aria-label={`Delete ${term.name}`}
            className="flex h-8 w-8 items-center justify-center rounded-md text-foreground-muted hover:bg-surface-hover hover:text-danger"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <Button variant="ghost" size="sm" onClick={() => onEdit(editing ? null : term.id)} className="ml-1">
            {editing ? "Cancel" : "Edit"}
          </Button>
        </div>
      </div>

      {editing && (
        <TermEditor
          term={term}
          busy={busy}
          onCancel={() => onEdit(null)}
          onSave={async (values) => {
            if (await onPatch(term.id, values, "Saved")) onEdit(null);
          }}
        />
      )}
    </div>
  );
}

/** Mounted when editing starts, so its fields begin from the current values. */
function TermEditor({
  term,
  busy,
  onSave,
  onCancel,
}: {
  term: AdminTerm;
  busy: boolean;
  onSave: (values: { name: string; description: string }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(term.name);
  const [description, setDescription] = useState(term.description ?? "");

  return (
    <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
      <div>
        <Label htmlFor={`name-${term.id}`}>Name</Label>
        <Input id={`name-${term.id}`} className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
      </div>
      <div>
        <Label htmlFor={`description-${term.id}`}>Description</Label>
        <Textarea
          id={`description-${term.id}`}
          className="mt-1.5"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          placeholder="Shown on the term's page and in search results."
        />
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" disabled={busy || name.trim().length < 2} onClick={() => onSave({ name: name.trim(), description })}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          <X className="h-4 w-4" /> Cancel
        </Button>
      </div>
    </div>
  );
}
