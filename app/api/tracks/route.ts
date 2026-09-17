import { NextResponse } from "next/server";
import { findTracks } from "@/lib/taxonomy";
import { parseDiscoveryFilters } from "@/lib/discovery-filters";
import { toPlayerTrack } from "@/lib/mappers";

/**
 * Filtered, cursor-paginated published tracks for the client: "load more" on
 * discovery pages, building a Play Mix queue, and the Songs catalogue. Always
 * one page at a time — the catalogue is never shipped to the browser whole.
 *
 * Accepts the same filter params as the pages (see lib/discovery-filters).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const { filter, sort } = await parseDiscoveryFilters(searchParams);

  const limit = Number(searchParams.get("limit")) || 24;
  const cursor = searchParams.get("cursor");

  try {
    const { tracks, nextCursor } = await findTracks(filter, { sort, limit, cursor });
    return NextResponse.json({ tracks: tracks.map((t) => toPlayerTrack(t)), nextCursor });
  } catch {
    // A cursor for a track that has since been deleted, or a malformed one,
    // is a client problem — not a server error.
    return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
  }
}
