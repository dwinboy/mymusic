import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOwnedTrack, requireOwnedAlbum } from "@/lib/creator-guard";
import { setTrackTermsForKind, TERM_SELECT } from "@/lib/taxonomy";
import { deleteTrackAudio } from "@/lib/media/audio-service";
import { deleteCloudinaryImage } from "@/lib/media/image-service";
import { uniqueSlug } from "@/lib/slug";
import { changesReviewedContent } from "@/lib/tracks/submission";
import type { AiDisclosure, EnergyLevel, TaxonomyKind } from "@/lib/generated/prisma/client";

const TAXONOMY_KINDS: TaxonomyKind[] = ["GENRE", "MOOD", "ACTIVITY", "OCCASION", "INSTRUMENT", "LANGUAGE", "VOCAL", "TAG"];
const AI_DISCLOSURES: AiDisclosure[] = ["AI_GENERATED", "AI_ASSISTED", "HUMAN_CREATED"];
const ENERGY_LEVELS: EnergyLevel[] = ["VERY_LOW", "LOW", "MEDIUM", "HIGH", "VERY_HIGH"];

const DETAIL_INCLUDE = {
  artist: true,
  album: true,
  terms: { select: { isPrimary: true, term: { select: TERM_SELECT } } },
} as const;

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const owned = await requireOwnedTrack(id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const track = await db.track.findUnique({ where: { id }, include: DETAIL_INCLUDE });
  return NextResponse.json({ track });
}

/**
 * Creators edit their own tracks here. What they can't set is as important as
 * what they can: publication, featuring, moderation state and the owning
 * artist are never read from this request.
 */
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const owned = await requireOwnedTrack(id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const existing = owned.track;

  const form = await request.formData();
  const data: Record<string, unknown> = {};
  const text = (key: string, max: number) => {
    if (!form.has(key)) return;
    const value = String(form.get(key) ?? "").trim();
    data[key] = value ? value.slice(0, max) : null;
  };

  if (form.has("title")) {
    const title = String(form.get("title") ?? "").trim();
    if (!title) return NextResponse.json({ error: "A title is required." }, { status: 400 });
    if (title !== existing.title) {
      data.title = title.slice(0, 120);
      // The slug is the public URL. It follows the title only until the track
      // is first submitted (the upload title is usually just the filename);
      // after that, renaming mustn't break links people have shared.
      if (existing.moderationStatus === "NONE") {
        data.slug = await uniqueSlug(title, async (s) => s !== existing.slug && !!(await db.track.findUnique({ where: { slug: s } })));
      }
    }
  }
  text("description", 2000);
  text("lyrics", 20000);
  text("credits", 4000);
  text("composer", 200);
  text("producer", 200);
  text("aiTool", 200);
  text("aiDetails", 2000);

  if (form.has("releaseDate")) {
    const value = String(form.get("releaseDate") ?? "");
    const date = value ? new Date(value) : null;
    data.releaseDate = date && !Number.isNaN(date.getTime()) ? date : null;
  }
  for (const flag of ["isExplicit", "downloadEnabled"]) {
    if (form.has(flag)) data[flag] = form.get(flag) === "true";
  }

  if (form.has("aiDisclosure")) {
    const disclosure = String(form.get("aiDisclosure")) as AiDisclosure;
    if (!AI_DISCLOSURES.includes(disclosure)) return NextResponse.json({ error: "Invalid AI disclosure." }, { status: 400 });
    data.aiDisclosure = disclosure;
    data.isAiGenerated = disclosure !== "HUMAN_CREATED";
  }
  if (form.has("energy")) {
    const energy = String(form.get("energy"));
    data.energy = ENERGY_LEVELS.includes(energy as EnergyLevel) ? energy : null;
  }
  if (form.has("tempoBpm")) {
    const bpm = Number(form.get("tempoBpm"));
    data.tempoBpm = Number.isFinite(bpm) && bpm >= 20 && bpm <= 300 ? Math.round(bpm) : null;
  }

  if (form.has("albumId")) {
    const albumId = String(form.get("albumId") ?? "");
    if (!albumId) data.albumId = null;
    else {
      const album = await requireOwnedAlbum(albumId);
      if (!album || album.album.artistId !== existing.artistId) {
        return NextResponse.json({ error: "Choose an album from this creator profile." }, { status: 400 });
      }
      data.albumId = albumId;
    }
  }

  if (form.has("coverImagePublicId")) {
    const publicId = String(form.get("coverImagePublicId") ?? "");
    // Only artwork uploaded into this creator's own folder: the folder is part
    // of the signed upload, so this can't be spoofed.
    if (!publicId.startsWith(`vibebanger/creators/${owned.userId}/`)) {
      return NextResponse.json({ error: "Invalid artwork." }, { status: 400 });
    }
    if (publicId !== existing.coverImagePublicId) {
      const url = String(form.get("coverImageUrl") ?? "");
      data.coverImagePublicId = publicId;
      data.coverImageUrl = url;
      data.coverUrl = url;
      data.coverImageWidth = Number(form.get("coverImageWidth")) || null;
      data.coverImageHeight = Number(form.get("coverImageHeight")) || null;
      if (existing.coverImagePublicId) await deleteCloudinaryImage(existing.coverImagePublicId);
    }
  }

  // Rights can be confirmed, never un-confirmed: the record of acceptance is
  // what's worth keeping.
  if (form.get("rightsConfirmed") === "true" && !existing.rightsConfirmedAt) {
    data.rightsConfirmedAt = new Date();
    data.rightsConfirmedBy = owned.userId;
  }

  let returnedToReview = false;
  if (existing.moderationStatus === "APPROVED" && changesReviewedContent(existing, data)) {
    Object.assign(data, { moderationStatus: "PENDING_REVIEW", isPublished: false, submittedAt: new Date(), moderationNote: null });
    returnedToReview = true;
  }

  const termWrites: { kind: TaxonomyKind; ids: string[] }[] = [];
  for (const kind of TAXONOMY_KINDS) {
    const key = `terms:${kind}`;
    if (form.has(key)) termWrites.push({ kind, ids: form.getAll(key).map(String).filter(Boolean) });
  }
  const primaryGenreId = (form.get("primaryGenreId") as string | null) || null;

  const track = await db.$transaction(async (tx) => {
    for (const { kind, ids } of termWrites) {
      await setTrackTermsForKind(tx, id, kind, ids, kind === "GENRE" ? primaryGenreId : null);
    }
    return tx.track.update({ where: { id }, data, include: DETAIL_INCLUDE });
  });

  return NextResponse.json({ track, returnedToReview });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const owned = await requireOwnedTrack(id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await deleteTrackAudio(owned.track);
  if (owned.track.coverImagePublicId) await deleteCloudinaryImage(owned.track.coverImagePublicId);
  await db.track.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
