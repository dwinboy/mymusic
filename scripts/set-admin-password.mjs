/**
 * Lists the admin accounts on whichever database DATABASE_URL points at, and
 * sets an admin's password.
 *
 *   node scripts/set-admin-password.mjs                  # who are the admins?
 *   node scripts/set-admin-password.mjs <email>          # change that one
 *
 * Railway's Postgres has no public endpoint, so from a laptop this only
 * reaches the local database. To change the live password, run it inside the
 * deployment, where DATABASE_URL resolves on Railway's private network:
 *
 *   railway ssh --service web
 *   node scripts/set-admin-password.mjs
 *
 * Plain JavaScript and only production dependencies, so it runs on the
 * deployed image as-is — no tsx, no devDependencies.
 *
 * The password is typed at a hidden prompt, so it stays out of your shell
 * history and out of the process list. It can also be piped in:
 *
 *   printf '%s' "$NEW_PASSWORD" | node scripts/set-admin-password.mjs <email>
 *
 * Sessions are JWTs, so anyone already signed in stays signed in until their
 * token expires. Rotate AUTH_SECRET as well to end every existing session.
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "../lib/generated/prisma/client.js";

const MIN_LENGTH = 12;

async function readSecret(question) {
  // Piped in: take stdin as the password verbatim.
  if (!process.stdin.isTTY) {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    return Buffer.concat(chunks).toString("utf8").trim();
  }

  process.stdout.write(question);
  process.stdin.setRawMode(true);
  process.stdin.resume();

  let value = "";
  return new Promise((resolve, reject) => {
    const done = (finish) => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.off("data", onData);
      process.stdout.write("\n");
      finish();
    };
    const onData = (buffer) => {
      const input = buffer.toString("utf8");
      if (input === "\r" || input === "\n" || input === "") return done(() => resolve(value));
      if (input === "") return done(() => reject(new Error("Cancelled.")));
      if (input === "" || input === "\b") {
        value = value.slice(0, -1);
        return;
      }
      // Ignore control characters; anything else is part of the password.
      if (input >= " ") value += input;
    };
    process.stdin.on("data", onData);
  });
}

/** Who the admins are on this database — for when you've forgotten which
 *  account it is, and to check an address before trying to change it. */
async function listAdmins(db) {
  const admins = await db.user.findMany({
    where: { role: "ADMIN" },
    select: { email: true, name: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  if (admins.length === 0) {
    console.log("No admin accounts on this database.");
    console.log("Create one with the /api/admin-bootstrap endpoint (needs ADMIN_BOOTSTRAP_SECRET set).");
    return;
  }
  console.log(`${admins.length} admin ${admins.length === 1 ? "account" : "accounts"}:`);
  for (const admin of admins) {
    console.log(`  ${admin.email}${admin.name ? `  (${admin.name})` : ""}  created ${admin.createdAt.toISOString().slice(0, 10)}`);
  }
  console.log("\nChange one: node scripts/set-admin-password.mjs <email>");
}

async function main() {
  const email = process.argv[2]?.toLowerCase().trim();
  const db = new PrismaClient();
  try {
    if (!email) {
      await listAdmins(db);
      return;
    }

    const user = await db.user.findUnique({ where: { email }, select: { id: true, email: true, role: true } });
    if (!user) {
      console.error(`No account with the email ${email} on this database.\n`);
      await listAdmins(db);
      process.exitCode = 1;
      return;
    }
    if (user.role !== "ADMIN") {
      console.error(`${email} is not an admin. This script only changes an existing admin's password.\n`);
      await listAdmins(db);
      process.exitCode = 1;
      return;
    }

    const password = await readSecret(`New password for ${email}: `);
    if (password.length < MIN_LENGTH) {
      console.error(`Too short — use at least ${MIN_LENGTH} characters.`);
      process.exitCode = 1;
      return;
    }
    if (process.stdin.isTTY) {
      const again = await readSecret("Again: ");
      if (again !== password) {
        console.error("They didn't match.");
        process.exitCode = 1;
        return;
      }
    }

    await db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(password, 12) } });
    console.log(`Password updated for ${email}.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
