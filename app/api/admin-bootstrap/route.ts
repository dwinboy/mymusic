import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

/**
 * One-time admin bootstrap: promotes an existing account to ADMIN when the
 * deployment has none yet. Self-disarming — the very first successful call
 * creates an admin, and every call after that refuses, so this can't be used
 * as a standing privilege-escalation path. Requires ADMIN_BOOTSTRAP_SECRET
 * to even respond; unset (the default), it doesn't exist as far as a caller
 * can tell.
 */
export async function POST(request: Request) {
  const secret = process.env.ADMIN_BOOTSTRAP_SECRET;
  if (!secret) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  if (!body || body.secret !== secret) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const existingAdmins = await db.user.count({ where: { role: "ADMIN" } });
  if (existingAdmins > 0) {
    return NextResponse.json({ error: "An admin already exists." }, { status: 403 });
  }

  const email = String(body.email ?? "").toLowerCase().trim();
  const password = String(body.password ?? "");
  if (!email || password.length < 8) {
    return NextResponse.json({ error: "email and a password of 8+ characters are required." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await db.user.upsert({
    where: { email },
    create: { email, name: "Admin", role: "ADMIN", passwordHash },
    update: { role: "ADMIN", passwordHash },
  });

  return NextResponse.json({ ok: true, email: user.email, role: user.role });
}
