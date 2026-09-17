import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";

/**
 * Server-side context for Creator Studio pages: the signed-in user and every
 * creator profile they own. Pages aggregate across all of a user's profiles,
 * so someone running two project names sees all their music in one place.
 */
export async function getCreatorContext(returnTo = "/creator") {
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent(returnTo)}`);

  const profiles = await db.artist.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: "asc" },
  });

  return { userId: session.user.id, user: session.user, profiles, profileIds: profiles.map((p) => p.id) };
}
