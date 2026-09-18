import path from "node:path";
import { mkdirSync, rmSync } from "node:fs";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { LocalStorageDriver } from "@/lib/storage/local";
import { toSlug } from "@/lib/slug";
import type { EnergyLevel, TaxonomyKind } from "@/lib/generated/prisma/client";
import {
  generateToneWav,
  transcodeToMp3,
  probeDurationSeconds,
  generateCoverArt,
  generateAvatarArt,
} from "./demo-assets";
import { seedTaxonomy } from "./taxonomy-seed";

const storage = new LocalStorageDriver();
const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");

// A few simple chord roots (Hz) so demo tracks aren't all identical tones.
const CHORDS: Record<string, number[]> = {
  cMajor: [261.63, 329.63, 392.0],
  aMinor: [220.0, 261.63, 329.63],
  dMinor: [293.66, 349.23, 440.0],
  eMinor: [164.81, 196.0, 246.94],
  fMajor: [174.61, 220.0, 261.63],
  gMajor: [196.0, 246.94, 293.66],
};

/**
 * Discovery classification implied by each demo genre, so the seeded catalogue
 * exercises mood, activity and occasion pages rather than leaving them empty.
 * Values are taxonomy slugs. Every demo track is a generated tone with no
 * voice, hence "instrumental" throughout.
 */
const GENRE_DISCOVERY: Record<
  string,
  { moods: string[]; activities: string[]; occasions: string[]; energy: EnergyLevel }
> = {
  Electronic: { moods: ["energetic", "dreamy"], activities: ["focus", "coding", "workout"], occasions: ["party"], energy: "HIGH" },
  Cinematic: { moods: ["epic", "dreamy"], activities: ["focus", "reading"], occasions: [], energy: "MEDIUM" },
  Ambient: { moods: ["calm", "peaceful", "dreamy"], activities: ["sleep", "deep-sleep", "meditation", "relaxation", "study"], occasions: [], energy: "VERY_LOW" },
  "Hip-Hop": { moods: ["chill"], activities: ["work", "workout"], occasions: [], energy: "MEDIUM" },
  "R&B": { moods: ["romantic", "chill"], activities: ["relaxation"], occasions: ["romantic-evening", "dinner", "first-dance"], energy: "LOW" },
  Afrobeat: { moods: ["happy", "energetic"], activities: ["workout"], occasions: ["party", "celebration", "afrobeat-wedding"], energy: "HIGH" },
  Pop: { moods: ["happy", "uplifting"], activities: ["running"], occasions: ["party", "birthday"], energy: "HIGH" },
  "Lo-Fi": { moods: ["chill", "calm", "nostalgic"], activities: ["study", "lo-fi-study", "reading", "coding"], occasions: [], energy: "LOW" },
};

interface ArtistSeed {
  name: string;
  bio: string;
  isFeatured: boolean;
}

const ARTISTS: ArtistSeed[] = [
  {
    name: "Nova Halcyon",
    bio: "An AI composer specializing in widescreen electronic soundscapes, built from layered synthesis and granular textures.",
    isFeatured: true,
  },
  {
    name: "Echo Field",
    bio: "Generative ambient and cinematic works, trained on decades of film scoring and modern minimalism.",
    isFeatured: true,
  },
  {
    name: "Sable Motion",
    bio: "Low-end forward hip-hop and R&B instrumentals, engineered for late-night listening.",
    isFeatured: false,
  },
  {
    name: "Amara Tide",
    bio: "Afrobeat-influenced rhythms and pop hooks, composed entirely by a rhythm-focused generative model.",
    isFeatured: true,
  },
  {
    name: "Glass Horizon",
    bio: "Lo-fi textures and warm, dust-laden loops designed for focus and unwinding alike.",
    isFeatured: false,
  },
  {
    name: "Kilo North",
    bio: "Pop songwriting structures reimagined through machine listening — bright, hooky, and immediate.",
    isFeatured: false,
  },
];

interface TrackSeed {
  title: string;
  chord: keyof typeof CHORDS;
  durationSec: number;
  tremoloHz?: number;
  noiseMix?: number;
  lowpassHz?: number;
  isExplicit?: boolean;
}

interface AlbumSeed {
  title: string;
  artist: string;
  genres: string[];
  description: string;
  releaseDate: string;
  isFeatured: boolean;
  tracks: TrackSeed[];
}

const ALBUMS: AlbumSeed[] = [
  {
    title: "Halcyon Drift",
    artist: "Nova Halcyon",
    genres: ["Electronic", "Cinematic"],
    description: "A widescreen electronic record about distance and memory, built from evolving synthesis.",
    releaseDate: "2026-06-12",
    isFeatured: true,
    tracks: [
      { title: "Midnight Drive", chord: "aMinor", durationSec: 34, tremoloHz: 4 },
      { title: "Afterglow", chord: "cMajor", durationSec: 30, lowpassHz: 4000 },
      { title: "Static Bloom", chord: "dMinor", durationSec: 28, tremoloHz: 6 },
      { title: "Distant Signal", chord: "eMinor", durationSec: 32 },
    ],
  },
  {
    title: "Interior Light",
    artist: "Echo Field",
    genres: ["Ambient", "Cinematic"],
    description: "Slow-moving pads and field-recorded texture, composed for quiet spaces.",
    releaseDate: "2026-03-02",
    isFeatured: true,
    tracks: [
      { title: "Room Tone", chord: "fMajor", durationSec: 36, lowpassHz: 3000, noiseMix: 0.02 },
      { title: "Pale Hour", chord: "gMajor", durationSec: 33, lowpassHz: 3500 },
      { title: "Interior Light", chord: "eMinor", durationSec: 40, noiseMix: 0.015 },
    ],
  },
  {
    title: "Low End Theory Notes",
    artist: "Sable Motion",
    genres: ["Hip-Hop", "R&B"],
    description: "Dusty drums and warm low end — instrumental sketches for late-night sessions.",
    releaseDate: "2026-01-20",
    isFeatured: false,
    tracks: [
      { title: "Velvet Rope", chord: "dMinor", durationSec: 29, tremoloHz: 2.5 },
      { title: "After Hours", chord: "aMinor", durationSec: 31, lowpassHz: 5000 },
      { title: "Low Beam", chord: "eMinor", durationSec: 27, tremoloHz: 3 },
    ],
  },
  {
    title: "Tidewater",
    artist: "Amara Tide",
    genres: ["Afrobeat", "Pop"],
    description: "Rhythm-forward, sun-bright compositions built around polyrhythmic percussion.",
    releaseDate: "2026-05-18",
    isFeatured: true,
    tracks: [
      { title: "Golden Hour", chord: "cMajor", durationSec: 30, tremoloHz: 5 },
      { title: "Tidewater", chord: "gMajor", durationSec: 33, tremoloHz: 4.5 },
      { title: "Coastline", chord: "fMajor", durationSec: 28, tremoloHz: 5.5 },
      { title: "Open Water", chord: "dMinor", durationSec: 31 },
      { title: "Harmattan", chord: "aMinor", durationSec: 29, tremoloHz: 4 },
    ],
  },
  {
    title: "Dust & Vinyl",
    artist: "Glass Horizon",
    genres: ["Lo-Fi", "Ambient"],
    description: "Warm, imperfect loops with tape hiss and soft filtering — built for focus.",
    releaseDate: "2025-11-08",
    isFeatured: false,
    tracks: [
      { title: "Study Hall", chord: "fMajor", durationSec: 32, lowpassHz: 2800, noiseMix: 0.03 },
      { title: "Rain Window", chord: "eMinor", durationSec: 35, lowpassHz: 2600, noiseMix: 0.035 },
      { title: "Dust & Vinyl", chord: "cMajor", durationSec: 30, lowpassHz: 3000, noiseMix: 0.025 },
    ],
  },
];

interface SingleSeed extends TrackSeed {
  artist: string;
  genres: string[];
  description: string;
  releaseDate: string;
  isFeatured: boolean;
}

const SINGLES: SingleSeed[] = [
  {
    title: "Bright Line",
    artist: "Kilo North",
    genres: ["Pop"],
    description: "A bright, hook-forward single built around a simple four-chord progression.",
    releaseDate: "2026-07-01",
    isFeatured: true,
    chord: "cMajor",
    durationSec: 26,
    tremoloHz: 3.5,
  },
  {
    title: "Paper Planes (Interlude)",
    artist: "Sable Motion",
    genres: ["Hip-Hop"],
    description: "A short instrumental interlude between sessions.",
    releaseDate: "2026-04-14",
    isFeatured: false,
    chord: "dMinor",
    durationSec: 22,
  },
  {
    title: "Halogen",
    artist: "Nova Halcyon",
    genres: ["Electronic"],
    description: "A standalone single exploring brighter, more percussive textures than Halcyon Drift.",
    releaseDate: "2026-08-05",
    isFeatured: true,
    chord: "gMajor",
    durationSec: 30,
    tremoloHz: 6,
  },
  {
    title: "Wide Open",
    artist: "Amara Tide",
    genres: ["Afrobeat", "Pop"],
    description: "A summery, percussion-led single released ahead of the next record.",
    releaseDate: "2026-08-22",
    isFeatured: false,
    chord: "fMajor",
    durationSec: 27,
    tremoloHz: 5,
  },
];

const PLAYLISTS: Array<{ title: string; description: string; trackTitles: string[] }> = [
  {
    title: "Night Drive",
    description: "Cinematic electronic tracks for late-night driving.",
    trackTitles: ["Midnight Drive", "Afterglow", "Halogen", "Static Bloom", "Distant Signal"],
  },
  {
    title: "Deep Focus",
    description: "Ambient and lo-fi textures for concentration.",
    trackTitles: ["Room Tone", "Study Hall", "Pale Hour", "Rain Window", "Interior Light"],
  },
];

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

async function main() {
  console.log("Resetting demo uploads directory...");
  rmSync(UPLOADS_ROOT, { recursive: true, force: true });
  mkdirSync(UPLOADS_ROOT, { recursive: true });

  console.log("Clearing existing catalogue data...");
  await db.$transaction([
    db.playlistTrack.deleteMany(),
    db.playlist.deleteMany(),
    db.favorite.deleteMany(),
    db.listeningHistory.deleteMany(),
    db.download.deleteMany(),
    db.play.deleteMany(),
    db.trackTerm.deleteMany(),
    db.track.deleteMany(),
    db.album.deleteMany(),
    db.artist.deleteMany(),
    // The taxonomy is deliberately not cleared: it's admin-owned platform
    // structure, not disposable demo catalogue.
  ]);

  console.log("Seeding users...");
  // Never a default: an admin password baked into a public repo is a published
  // credential, and the upsert below used to reset the live one back to it on
  // every run. Set SEED_ADMIN_PASSWORD when creating an admin from scratch;
  // once one exists, its password is left alone — change it with
  // scripts/set-admin-password.ts.
  const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD;
  const demoPasswordHash = await bcrypt.hash("vibebanger-demo-2026", 12);

  const existingAdmin = await db.user.findUnique({ where: { email: "admin@vibebanger.app" }, select: { id: true } });
  if (!existingAdmin && !seedAdminPassword) {
    throw new Error(
      "No admin account exists and SEED_ADMIN_PASSWORD is not set. Re-run with SEED_ADMIN_PASSWORD=<password> to create one."
    );
  }

  const admin = await db.user.upsert({
    where: { email: "admin@vibebanger.app" },
    create: {
      email: "admin@vibebanger.app",
      name: "Vibe Banger Admin",
      role: "ADMIN",
      passwordHash: await bcrypt.hash(seedAdminPassword!, 12),
    },
    update: { role: "ADMIN" },
  });
  await db.user.upsert({
    where: { email: "demo@vibebanger.app" },
    create: { email: "demo@vibebanger.app", name: "Demo Listener", role: "USER", passwordHash: demoPasswordHash },
    update: { passwordHash: demoPasswordHash },
  });

  console.log("Seeding taxonomy...");
  await seedTaxonomy(db);
  const allTerms = await db.taxonomyTerm.findMany({ select: { id: true, kind: true, slug: true } });
  const termId = (kind: TaxonomyKind, slug: string) =>
    allTerms.find((t) => t.kind === kind && t.slug === slug)?.id;

  console.log("Seeding artists...");
  const artistByName = new Map<string, { id: string; slug: string; name: string }>();
  for (const a of ARTISTS) {
    const slug = toSlug(a.name);
    const avatarBuffer = await generateAvatarArt(slug, initials(a.name));
    const avatar = await storage.put({
      folder: "avatars",
      filename: `${slug}.jpg`,
      contentType: "image/jpeg",
      data: avatarBuffer,
    });
    const artist = await db.artist.create({
      data: {
        name: a.name,
        slug,
        bio: a.bio,
        avatarUrl: avatar.url,
        isFeatured: a.isFeatured,
      },
    });
    artistByName.set(a.name, artist);
  }

  let trackCounter = 0;

  async function createTrack(params: {
    title: string;
    artistId: string;
    albumId?: string;
    chord: keyof typeof CHORDS;
    durationSec: number;
    tremoloHz?: number;
    noiseMix?: number;
    lowpassHz?: number;
    genres: string[];
    coverUrl: string;
    description: string;
    releaseDate: string;
    isFeatured: boolean;
    trackNumber?: number;
  }) {
    trackCounter += 1;
    const slug = await (async () => {
      const base = toSlug(params.title);
      let candidate = base;
      let attempt = 1;
      while (await db.track.findUnique({ where: { slug: candidate } })) {
        attempt += 1;
        candidate = `${base}-${attempt}`;
      }
      return candidate;
    })();

    const wavPath = path.join(process.cwd(), ".seed-tmp", `${slug}.wav`);
    generateToneWav(wavPath, {
      frequencies: CHORDS[params.chord],
      durationSec: params.durationSec,
      tremoloHz: params.tremoloHz,
      noiseMix: params.noiseMix,
      lowpassHz: params.lowpassHz,
    });

    const mp3Path = path.join(process.cwd(), ".seed-tmp", `${slug}.mp3`);
    transcodeToMp3(wavPath, mp3Path);
    const duration = probeDurationSeconds(mp3Path);

    const { readFileSync } = await import("node:fs");
    const originalStored = await storage.put({
      folder: "audio-original",
      filename: `${slug}.wav`,
      contentType: "audio/wav",
      data: readFileSync(wavPath),
    });
    const streamStored = await storage.put({
      folder: "audio",
      filename: `${slug}.mp3`,
      contentType: "audio/mpeg",
      data: readFileSync(mp3Path),
    });

    const track = await db.track.create({
      data: {
        title: params.title,
        slug,
        artistId: params.artistId,
        albumId: params.albumId,
        trackNumber: params.trackNumber,
        description: params.description,
        duration,
        audioUrl: streamStored.url,
        originalAudioUrl: originalStored.url,
        fileSize: streamStored.size,
        mimeType: "audio/mpeg",
        streamingSize: streamStored.size,
        streamingFormat: "mp3",
        originalSize: originalStored.size,
        originalFormat: "wav",
        processingStatus: "READY",
        coverUrl: params.coverUrl,
        releaseDate: new Date(params.releaseDate),
        isAiGenerated: true,
        isExplicit: false,
        isPublished: true,
        isFeatured: params.isFeatured,
        downloadEnabled: true,
      },
    });

    // Genre names map to taxonomy slugs the same way they always did
    // ("R&B" -> "randb"); the first listed genre is primary.
    const links = new Map<string, boolean>();
    for (const [i, genreName] of params.genres.entries()) {
      const id = termId("GENRE", toSlug(genreName));
      if (id) links.set(id, i === 0);
    }
    for (const genreName of params.genres) {
      const discovery = GENRE_DISCOVERY[genreName];
      if (!discovery) continue;
      for (const slug of discovery.moods) {
        const id = termId("MOOD", slug);
        if (id && !links.has(id)) links.set(id, false);
      }
      for (const slug of discovery.activities) {
        const id = termId("ACTIVITY", slug);
        if (id && !links.has(id)) links.set(id, false);
      }
      for (const slug of discovery.occasions) {
        const id = termId("OCCASION", slug);
        if (id && !links.has(id)) links.set(id, false);
      }
    }
    const instrumental = termId("VOCAL", "instrumental");
    if (instrumental) links.set(instrumental, false);

    await db.trackTerm.createMany({
      data: [...links].map(([id, isPrimary]) => ({ trackId: track.id, termId: id, isPrimary })),
    });

    const primaryEnergy = GENRE_DISCOVERY[params.genres[0]]?.energy;
    if (primaryEnergy) {
      await db.track.update({ where: { id: track.id }, data: { energy: primaryEnergy } });
    }

    return track;
  }

  console.log("Seeding albums and tracks...");
  const trackByTitle = new Map<string, { id: string }>();

  for (const album of ALBUMS) {
    const artist = artistByName.get(album.artist)!;
    const albumSlug = toSlug(album.title);
    const coverBuffer = await generateCoverArt(albumSlug, album.title);
    const cover = await storage.put({
      folder: "covers",
      filename: `${albumSlug}.jpg`,
      contentType: "image/jpeg",
      data: coverBuffer,
    });

    const albumRecord = await db.album.create({
      data: {
        title: album.title,
        slug: albumSlug,
        artistId: artist.id,
        coverUrl: cover.url,
        description: album.description,
        releaseDate: new Date(album.releaseDate),
        isPublished: true,
        isFeatured: album.isFeatured,
      },
    });

    let trackNumber = 1;
    for (const t of album.tracks) {
      const track = await createTrack({
        title: t.title,
        artistId: artist.id,
        albumId: albumRecord.id,
        chord: t.chord,
        durationSec: t.durationSec,
        tremoloHz: t.tremoloHz,
        noiseMix: t.noiseMix,
        lowpassHz: t.lowpassHz,
        genres: album.genres,
        coverUrl: cover.url,
        description: album.description,
        releaseDate: album.releaseDate,
        isFeatured: album.isFeatured && trackNumber === 1,
        trackNumber: trackNumber++,
      });
      trackByTitle.set(t.title, track);
      console.log(`  + ${album.title} / ${t.title} (${track.duration}s)`);
    }
  }

  console.log("Seeding singles...");
  for (const single of SINGLES) {
    const artist = artistByName.get(single.artist)!;
    const slug = toSlug(single.title);
    const coverBuffer = await generateCoverArt(slug, single.title);
    const cover = await storage.put({
      folder: "covers",
      filename: `${slug}.jpg`,
      contentType: "image/jpeg",
      data: coverBuffer,
    });

    const track = await createTrack({
      title: single.title,
      artistId: artist.id,
      chord: single.chord,
      durationSec: single.durationSec,
      tremoloHz: single.tremoloHz,
      noiseMix: single.noiseMix,
      lowpassHz: single.lowpassHz,
      genres: single.genres,
      coverUrl: cover.url,
      description: single.description,
      releaseDate: single.releaseDate,
      isFeatured: single.isFeatured,
    });
    trackByTitle.set(single.title, track);
    console.log(`  + [single] ${single.title} (${track.duration}s)`);
  }

  console.log("Seeding playlists...");
  for (const playlist of PLAYLISTS) {
    const slug = toSlug(playlist.title);
    const record = await db.playlist.create({
      data: {
        title: playlist.title,
        slug,
        description: playlist.description,
        isPublic: true,
        userId: admin.id,
      },
    });

    let position = 0;
    for (const title of playlist.trackTitles) {
      const track = trackByTitle.get(title);
      if (!track) continue;
      await db.playlistTrack.create({
        data: { playlistId: record.id, trackId: track.id, position: position++ },
      });
    }
    console.log(`  + playlist ${playlist.title} (${position} tracks)`);
  }

  const totalTracks = await db.track.count();
  console.log(`\nDone. Seeded ${totalTracks} tracks across ${ALBUMS.length} albums and ${SINGLES.length} singles.`);
  console.log("Admin login:  admin@vibebanger.app / vibebanger-admin-2026");
  console.log("Demo login:   demo@vibebanger.app / vibebanger-demo-2026");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
