import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

/**
 * The listener's own account.
 *
 *   PATCH  -> change the name shown on playlists and messages
 *   DELETE -> remove the account and everything personal attached to it
 *
 * The privacy policy promises deletion on request; this is that promise
 * answered in the app rather than by email.
 */
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : null;
  if (!name) return NextResponse.json({ error: "Give us a name to show." }, { status: 422 });
  if (name.length > 80) return NextResponse.json({ error: "That name is too long." }, { status: 422 });

  const user = await db.user.update({
    where: { id: session.user.id },
    data: { name },
    select: { name: true },
  });
  return NextResponse.json({ user });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await request.json().catch(() => null);
  // Typed, not clicked. Everything below is irreversible.
  if (body?.confirm !== "DELETE") {
    return NextResponse.json({ error: "Type DELETE to confirm." }, { status: 422 });
  }

  const userId = session.user.id;

  // Locking every admin out of the platform is not something a self-service
  // button should be able to do.
  if (session.user.role === "ADMIN") {
    const admins = await db.user.count({ where: { role: "ADMIN" } });
    if (admins <= 1) {
      return NextResponse.json(
        { error: "You're the only admin. Make someone else an admin first, or the platform would be left with none." },
        { status: 409 }
      );
    }
  }

  const artists = await db.artist.findMany({ where: { ownerId: userId }, select: { id: true } });
  const artistIds = artists.map((a) => a.id);

  await db.$transaction(async (tx) => {
    if (artistIds.length > 0) {
      // Their music comes off the site, which is what the privacy policy
      // says. Unpublished rather than destroyed: deleting an artist would
      // cascade to every track, taking it out of other people's playlists
      // and libraries too, and that is not a decision a delete button should
      // make on their behalf. The files stay for an admin to remove.
      await tx.track.updateMany({ where: { artistId: { in: artistIds } }, data: { isPublished: false } });
      await tx.album.updateMany({ where: { artistId: { in: artistIds } }, data: { isPublished: false } });
    }

    // Everything personal goes with the row: playlists, likes, history,
    // downloads, follows, saved albums, requests and their messages all
    // cascade. Play events are detached rather than deleted, so a creator's
    // counts don't silently drop — what's left carries no identity.
    await tx.user.delete({ where: { id: userId } });
  });

  return NextResponse.json({ deleted: true });
}
