import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getSiteSettings, updateSiteSettings } from "@/lib/settings";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const settings = await getSiteSettings();
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const patch: { siteName?: string; accentColor?: string } = {};

  if (typeof body.siteName === "string" && body.siteName.trim().length > 0) {
    patch.siteName = body.siteName.trim();
  }
  if (typeof body.accentColor === "string" && /^#[0-9a-fA-F]{6}$/.test(body.accentColor)) {
    patch.accentColor = body.accentColor;
  }

  const settings = await updateSiteSettings(patch);
  return NextResponse.json({ settings });
}
