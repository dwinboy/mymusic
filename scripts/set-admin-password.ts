/**
 * Sets an admin's password on whichever database DATABASE_URL points at.
 *
 * Against production, run it through Railway so the connection string comes
 * from the deployment's own environment and never lands in a local file:
 *
 *   railway run --service web -- npx tsx scripts/set-admin-password.ts admin@vibebanger.app
 *
 * The password is typed at a hidden prompt, so it stays out of your shell
 * history and out of the process list. It can also be piped in for automation:
 *
 *   printf '%s' "$NEW_PASSWORD" | npx tsx scripts/set-admin-password.ts admin@…
 *
 * Sessions are JWTs, so anyone already signed in stays signed in until their
 * token expires. Rotate AUTH_SECRET as well to end every existing session.
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "../lib/generated/prisma/client";

const MIN_LENGTH = 12;

async function readSecret(question: string): Promise<string> {
  // Piped in: take stdin as the password verbatim.
  if (!process.stdin.isTTY) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
    return Buffer.concat(chunks).toString("utf8").trim();
  }

  process.stdout.write(question);
  process.stdin.setRawMode(true);
  process.stdin.resume();

  let value = "";
  return new Promise((resolve, reject) => {
    const done = (finish: () => void) => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.off("data", onData);
      process.stdout.write("\n");
      finish();
    };
    const onData = (buffer: Buffer) => {
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

async function main() {
  const email = process.argv[2]?.toLowerCase().trim();
  if (!email) {
    console.error("Usage: npx tsx scripts/set-admin-password.ts <email>");
    process.exit(1);
  }

  const db = new PrismaClient();
  try {
    const user = await db.user.findUnique({ where: { email }, select: { id: true, email: true, role: true } });
    if (!user) {
      console.error(`No account with the email ${email} on this database.`);
      process.exit(1);
    }
    if (user.role !== "ADMIN") {
      console.error(`${email} is not an admin. This script only changes an existing admin's password.`);
      process.exit(1);
    }

    const password = await readSecret(`New password for ${email}: `);
    if (password.length < MIN_LENGTH) {
      console.error(`Too short — use at least ${MIN_LENGTH} characters.`);
      process.exit(1);
    }
    if (process.stdin.isTTY) {
      const again = await readSecret("Again: ");
      if (again !== password) {
        console.error("They didn't match.");
        process.exit(1);
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
