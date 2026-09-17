import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";

/** Saves a new order for terms within one kind: ids in the order they should appear. */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const ids: string[] = Array.isArray(body?.ids) ? body.ids.filter((id: unknown) => typeof id === "string").slice(0, 300) : [];
  if (ids.length === 0) return NextResponse.json({ error: "Nothing to reorder" }, { status: 400 });

  await db.$transaction(ids.map((id, index) => db.taxonomyTerm.update({ where: { id }, data: { displayOrder: index } })));
  revalidateTag("taxonomy", { expire: 0 });
  return NextResponse.json({ ok: true });
}
