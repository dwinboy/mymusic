import { NextResponse } from "next/server";
import { albumListPage, creatorListPage, playlistListPage } from "@/lib/catalog-lists";

/**
 * Further pages of the catalogue grids.
 *
 *   GET /api/catalog/albums?genre=&year=&creator=&cursor=
 *   GET /api/catalog/creators?cursor=
 *   GET /api/catalog/playlists?cursor=
 */
export async function GET(request: Request, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const searchParams = new URL(request.url).searchParams;
  const cursor = searchParams.get("cursor");
  try {
    const page =
      type === "albums"
        ? await albumListPage(searchParams, cursor)
        : type === "creators"
          ? await creatorListPage(cursor)
          : type === "playlists"
            ? await playlistListPage(cursor)
            : null;
    if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ items: page.items, nextCursor: page.nextCursor });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
