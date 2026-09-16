import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { getStorageDriver } from "@/lib/storage";
import { extractAudioMetadata, isSupportedAudioType } from "@/lib/audio/metadata";
import { isAudioR2Enabled, deleteTrackAudio, buildStreamingKey, buildDownloadKey } from "@/lib/media/audio-service";
import { originalAudioKey } from "@/lib/media/audio-keys";
import { putObject, deleteObjects } from "@/lib/media/r2-client";
import { getAudioProcessingService } from "@/lib/media/processing-service";
import { deleteCloudinaryImage, uploadImageLocally } from "@/lib/media/image-service";
import { productionLocalStorageWarning } from "@/lib/media/production-guard";
import { uniqueSlug } from "@/lib/slug";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const track = await db.track.findUnique({
    where: { id },
    include: { artist: true, album: true, genres: { include: { genre: true } } },
  });
  if (!track) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ track });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const existing = await db.track.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const formData = await request.formData();
  const data: Record<string, unknown> = {};

  const strField = (key: string, allowEmpty = false) => {
    const v = formData.get(key);
    if (typeof v !== "string") return;
    data[key] = v.trim().length > 0 ? v.trim() : allowEmpty ? null : undefined;
  };

  if (formData.has("title")) {
    strField("title");
    const newTitle = data.title as string | undefined;
    if (newTitle && newTitle !== existing.title) {
      data.slug = await uniqueSlug(newTitle, async (s) => {
        if (s === existing.slug) return false;
        return !!(await db.track.findUnique({ where: { slug: s } }));
      });
    }
  }
  if (formData.has("artistId")) data.artistId = String(formData.get("artistId"));
  if (formData.has("albumId")) data.albumId = (formData.get("albumId") as string) || null;
  if (formData.has("description")) strField("description", true);
  if (formData.has("lyrics")) strField("lyrics", true);
  if (formData.has("credits")) strField("credits", true);
  if (formData.has("composer")) strField("composer", true);
  if (formData.has("producer")) strField("producer", true);
  if (formData.has("releaseDate")) {
    const rd = formData.get("releaseDate") as string;
    if (rd) data.releaseDate = new Date(rd);
  }

  for (const bool of ["isAiGenerated", "isExplicit", "isPublished", "isFeatured", "downloadEnabled"]) {
    if (formData.has(bool)) data[bool] = formData.get(bool) === "true";
  }

  // Never let a track go live without playable audio — even if this same
  // request is also replacing the audio (that branch below re-derives
  // processingStatus itself once the new file finishes processing).
  const replacingAudioNow = (() => {
    const f = formData.get("audio");
    return f instanceof File && f.size > 0;
  })();
  if (data.isPublished === true && existing.processingStatus !== "READY" && !replacingAudioNow) {
    return NextResponse.json({ error: "This track's audio isn't ready yet — it can't be published." }, { status: 400 });
  }

  if (formData.has("genreIds")) {
    const genreIds = formData.getAll("genreIds").map(String).filter(Boolean);
    await db.trackGenre.deleteMany({ where: { trackId: id } });
    if (genreIds.length > 0) {
      await db.trackGenre.createMany({ data: genreIds.map((genreId) => ({ trackId: id, genreId })) });
    }
  }

  // --- Audio replacement -----------------------------------------------
  // A rarer, admin-only operation, so (unlike new-track upload) this still
  // passes through the server rather than needing its own direct-upload
  // flow. The *live* streaming/download keys aren't touched until the new
  // audio finishes processing, so a failed replace never breaks playback
  // of the currently-published file.
  const audioFile = formData.get("audio") as File | null;
  if (audioFile && audioFile.size > 0) {
    if (!isSupportedAudioType(audioFile.type)) {
      return NextResponse.json({ error: "Unsupported audio format." }, { status: 400 });
    }
    const buffer = Buffer.from(await audioFile.arrayBuffer());
    let metadata;
    try {
      metadata = await extractAudioMetadata(buffer, audioFile.type);
    } catch {
      return NextResponse.json({ error: "Could not read audio metadata from this file." }, { status: 422 });
    }

    const ext = extFromMime(audioFile.type);

    if (isAudioR2Enabled()) {
      const version = String(Date.now());
      const oldKeys = [existing.originalStorageKey, existing.streamingStorageKey, existing.downloadStorageKey].filter(
        (k): k is string => !!k
      );

      try {
        const originalKey = originalAudioKey(id, ext, version);
        await putObject(originalKey, buffer, audioFile.type);

        const processed = await getAudioProcessingService().process({
          originalBuffer: buffer,
          sourceExtension: ext,
          createDownloadVersion: (data.downloadEnabled as boolean | undefined) ?? existing.downloadEnabled,
        });

        const streamingKey = buildStreamingKey(id, processed.streamingFormat, version);
        await putObject(streamingKey, processed.streamingBuffer, "audio/mpeg");

        let downloadKey: string | null = null;
        if (processed.downloadBuffer && processed.downloadFormat) {
          downloadKey = buildDownloadKey(id, processed.downloadFormat, version);
          await putObject(downloadKey, processed.downloadBuffer, "audio/mpeg");
        }

        data.duration = metadata.durationSeconds;
        data.originalStorageKey = originalKey;
        data.originalFormat = ext;
        data.originalSize = buffer.byteLength;
        data.streamingStorageKey = streamingKey;
        data.streamingFormat = processed.streamingFormat;
        data.streamingSize = processed.streamingBuffer.byteLength;
        data.downloadStorageKey = downloadKey;
        data.downloadFormat = processed.downloadFormat ?? null;
        data.downloadSize = processed.downloadBuffer?.byteLength ?? null;
        data.processingStatus = "READY";
        data.processingError = null;

        // Old audio is now fully superseded — safe to reclaim.
        if (oldKeys.length > 0) await deleteObjects(oldKeys).catch(() => {});
      } catch (err) {
        return NextResponse.json(
          { error: "Couldn't process the replacement audio. The previous version is still live.", detail: String(err) },
          { status: 422 }
        );
      }
    } else {
      const prodWarning = productionLocalStorageWarning("audio");
      if (prodWarning) return NextResponse.json({ error: prodWarning }, { status: 500 });

      const storage = getStorageDriver();
      const stored = await storage.put({
        folder: "audio-original",
        filename: `${existing.slug}-${Date.now()}.${ext}`,
        contentType: audioFile.type,
        data: buffer,
      });
      data.audioUrl = stored.url;
      data.originalAudioUrl = stored.url;
      data.duration = metadata.durationSeconds;
      data.fileSize = metadata.fileSize;
      data.mimeType = metadata.mimeType;
    }
  }

  // --- Cover artwork -----------------------------------------------------
  // Cloudinary mode: the browser already uploaded directly to Cloudinary;
  // we just receive and store the reference. Local mode: raw file, same as
  // before.
  if (formData.has("coverImagePublicId")) {
    const publicId = String(formData.get("coverImagePublicId") ?? "");
    const secureUrl = String(formData.get("coverImageUrl") ?? "");
    const width = Number(formData.get("coverImageWidth")) || null;
    const height = Number(formData.get("coverImageHeight")) || null;

    if (existing.coverImagePublicId && existing.coverImagePublicId !== publicId) {
      await deleteCloudinaryImage(existing.coverImagePublicId);
    }

    data.coverImagePublicId = publicId;
    data.coverImageUrl = secureUrl;
    data.coverImageWidth = width;
    data.coverImageHeight = height;
    data.coverUrl = secureUrl;
  } else {
    const coverFile = formData.get("cover") as File | null;
    if (coverFile && coverFile.size > 0) {
      const prodWarning = productionLocalStorageWarning("image");
      if (prodWarning) return NextResponse.json({ error: prodWarning }, { status: 500 });

      const buffer = Buffer.from(await coverFile.arrayBuffer());
      const { url } = await uploadImageLocally({
        folder: "covers",
        filename: `${existing.slug}-${Date.now()}.jpg`,
        contentType: coverFile.type || "image/jpeg",
        data: buffer,
      });
      data.coverUrl = url;
    }
  }

  const track = await db.track.update({
    where: { id },
    data,
    include: { artist: true, album: true, genres: { include: { genre: true } } },
  });

  return NextResponse.json({ track });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const track = await db.track.findUnique({ where: { id } });
  if (!track) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await deleteTrackAudio(track);

  if (track.coverImagePublicId) {
    // Skip if another track shares this exact cover (e.g. same-album tracks
    // that were never given their own artwork) — avoid deleting a still-used asset.
    const sharedCount = await db.track.count({
      where: { coverImagePublicId: track.coverImagePublicId, id: { not: id } },
    });
    if (sharedCount === 0) await deleteCloudinaryImage(track.coverImagePublicId);
  }

  await db.track.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}

function extFromMime(mime: string): string {
  if (mime.includes("wav")) return "wav";
  if (mime.includes("flac")) return "flac";
  if (mime.includes("mp4") || mime.includes("m4a") || mime.includes("aac")) return "m4a";
  return "mp3";
}
