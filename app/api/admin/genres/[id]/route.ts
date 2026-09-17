import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  // Scoped to GENRE so this legacy route can't delete a mood or activity by id.
  await db.taxonomyTerm.deleteMany({ where: { id, kind: "GENRE" } });
  return NextResponse.json({ deleted: true });
}
