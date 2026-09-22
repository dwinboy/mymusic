import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const role = body?.role;
  if (role !== "ADMIN" && role !== "USER") {
    return NextResponse.json({ error: "role must be ADMIN or USER" }, { status: 400 });
  }

  const target = await db.user.findUnique({ where: { id }, select: { role: true } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // The same rule self-service deletion already applies: the platform can't
  // be left with no admin, so the last one can't demote themselves either.
  if (target.role === "ADMIN" && role === "USER") {
    const admins = await db.user.count({ where: { role: "ADMIN" } });
    if (admins <= 1) {
      return NextResponse.json({ error: "This is the only admin — make someone else an admin first." }, { status: 409 });
    }
  }

  const user = await db.user.update({ where: { id }, data: { role }, select: { id: true, role: true } });
  return NextResponse.json({ user });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  // Removing your own account is a decision the account page walks someone
  // through on purpose — confirmed, and typed, not one click in a table row.
  if (id === admin.user.id) {
    return NextResponse.json({ error: "Use your own account page to delete your own account." }, { status: 400 });
  }

  const target = await db.user.findUnique({ where: { id }, select: { role: true } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (target.role === "ADMIN") {
    const admins = await db.user.count({ where: { role: "ADMIN" } });
    if (admins <= 1) {
      return NextResponse.json({ error: "This is the only admin — make someone else an admin first." }, { status: 409 });
    }
  }

  const artists = await db.artist.findMany({ where: { ownerId: id }, select: { id: true } });
  const artistIds = artists.map((a) => a.id);

  await db.$transaction(async (tx) => {
    if (artistIds.length > 0) {
      // Same as self-service deletion: unpublished, not destroyed. The
      // files stay for an admin to remove; deleting the artist outright
      // would pull their tracks out of every listener's playlist and
      // library, which isn't a call this button gets to make either.
      await tx.track.updateMany({ where: { artistId: { in: artistIds } }, data: { isPublished: false } });
      await tx.album.updateMany({ where: { artistId: { in: artistIds } }, data: { isPublished: false } });
    }
    await tx.user.delete({ where: { id } });
  });

  return NextResponse.json({ deleted: true });
}
