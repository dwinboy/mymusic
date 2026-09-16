import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { uniqueSlug } from "@/lib/slug";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const genres = await db.genre.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { tracks: true } } },
  });

  return NextResponse.json({ genres });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name } = await request.json();
  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const slug = await uniqueSlug(name, async (s) => !!(await db.genre.findUnique({ where: { slug: s } })));
  const genre = await db.genre.create({ data: { name: name.trim(), slug } });

  return NextResponse.json({ genre }, { status: 201 });
}
