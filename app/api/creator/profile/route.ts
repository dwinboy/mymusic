import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { uniqueSlug } from "@/lib/slug";
import { requireUser, getOwnedArtists } from "@/lib/creator-guard";

/** Enough for a few project names; bounds how many profiles one account can spin up. */
const MAX_PROFILES_PER_ACCOUNT = 5;

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  return NextResponse.json({ profiles: await getOwnedArtists(user.userId) });
}

/** Becoming a creator is creating a profile — there's no separate role to request. */
export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (name.length < 2 || name.length > 60) {
    return NextResponse.json({ error: "Choose a creator name between 2 and 60 characters." }, { status: 400 });
  }

  const owned = await db.artist.count({ where: { ownerId: user.userId } });
  if (owned >= MAX_PROFILES_PER_ACCOUNT) {
    return NextResponse.json({ error: `An account can run up to ${MAX_PROFILES_PER_ACCOUNT} creator profiles.` }, { status: 400 });
  }

  const slug = await uniqueSlug(name, async (s) => !!(await db.artist.findUnique({ where: { slug: s } })));
  const profile = await db.artist.create({
    data: {
      name,
      slug,
      ownerId: user.userId,
      bio: typeof body?.bio === "string" && body.bio.trim() ? body.bio.trim().slice(0, 2000) : null,
      location: typeof body?.location === "string" && body.location.trim() ? body.location.trim().slice(0, 80) : null,
    },
  });

  return NextResponse.json({ profile }, { status: 201 });
}
