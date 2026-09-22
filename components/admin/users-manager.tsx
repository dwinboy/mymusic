"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Users, ShieldCheck, ShieldOff, Trash2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/states/empty-state";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  role: "USER" | "ADMIN";
  createdAt: string;
  image: string | null;
  _count: { playlists: number; favorites: number; creatorProfiles: number; songRequests: number };
}

/** Everyone with an account, searchable, with the two things an admin can
 * actually do to one: change what they can do here (role), or remove them. */
export function UsersManager({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [adminCount, setAdminCount] = useState(0);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const { toast } = useToast();
  const debouncedQuery = useDebounce(query, 250);

  function load() {
    const q = debouncedQuery.trim();
    fetch(`/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`)
      .then((r) => r.json())
      .then((d) => {
        setUsers(d.users ?? []);
        setAdminCount(d.adminCount ?? 0);
      });
  }

  useEffect(load, [debouncedQuery]);

  async function setRole(user: AdminUser, role: "ADMIN" | "USER") {
    setBusy(user.id);
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      toast({ title: data.error ?? "That didn't work.", variant: "danger" });
      return;
    }
    setUsers((prev) => prev?.map((u) => (u.id === user.id ? { ...u, role } : u)) ?? null);
    setAdminCount((n) => n + (role === "ADMIN" ? 1 : -1));
    toast({ title: role === "ADMIN" ? `${user.name ?? user.email} is now an admin` : `${user.name ?? user.email} is no longer an admin` });
  }

  async function remove(user: AdminUser) {
    if (!confirm(`Delete ${user.name ?? user.email}? Their playlists, likes, history and requests go with them; any music they published comes off the site. This can't be undone.`)) return;
    setBusy(user.id);
    const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      toast({ title: data.error ?? "That didn't work.", variant: "danger" });
      return;
    }
    setUsers((prev) => prev?.filter((u) => u.id !== user.id) ?? null);
    if (user.role === "ADMIN") setAdminCount((n) => n - 1);
    toast({ title: "Account deleted" });
  }

  return (
    <div>
      <div className="relative mb-5 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email"
          className="pl-9"
        />
      </div>

      {users === null && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      )}

      {users?.length === 0 && (
        <EmptyState icon={Users} title={query ? "No one matches that search" : "No accounts yet"} />
      )}

      {users && users.length > 0 && (
        <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
          {users.map((user) => {
            const isSelf = user.id === currentUserId;
            const isLastAdmin = user.role === "ADMIN" && adminCount <= 1;
            return (
              <div key={user.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-surface-active">
                  {user.image && <Image src={user.image} alt="" fill sizes="36px" className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{user.name ?? "Unnamed"}</p>
                    {isSelf && <span className="text-xs text-foreground-subtle">(you)</span>}
                    <Badge variant={user.role === "ADMIN" ? "accent" : "outline"}>{user.role}</Badge>
                  </div>
                  <p className="truncate text-xs text-foreground-muted">{user.email}</p>
                  <p className="mt-0.5 text-xs text-foreground-subtle">
                    {user._count.playlists} playlists · {user._count.favorites} likes
                    {user._count.creatorProfiles > 0 && ` · ${user._count.creatorProfiles} artist profile${user._count.creatorProfiles === 1 ? "" : "s"}`}
                    {user._count.songRequests > 0 && ` · ${user._count.songRequests} request${user._count.songRequests === 1 ? "" : "s"}`}
                    {" · joined "}
                    {new Date(user.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {user.role === "ADMIN" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy === user.id || isLastAdmin}
                      title={isLastAdmin ? "The only admin can't demote themselves" : undefined}
                      onClick={() => setRole(user, "USER")}
                    >
                      <ShieldOff className="h-4 w-4" /> Remove admin
                    </Button>
                  ) : (
                    <Button size="sm" variant="secondary" disabled={busy === user.id} onClick={() => setRole(user, "ADMIN")}>
                      <ShieldCheck className="h-4 w-4" /> Make admin
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-danger hover:text-danger"
                    disabled={busy === user.id || isSelf}
                    title={isSelf ? "Delete your own account from your account page" : undefined}
                    onClick={() => remove(user)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
