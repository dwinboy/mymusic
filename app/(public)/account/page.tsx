import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AccountSettings } from "@/components/account/account-settings";

export const metadata: Metadata = { title: "Your account" };

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/account");

  // Read from the database rather than the session: the session token carries
  // whatever the name was when it was issued, which is the stale one right
  // after someone changes it.
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true },
  });
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-8 sm:py-14">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">Account</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Your account</h1>

      <div className="mt-10">
        <AccountSettings initialName={user.name ?? ""} email={user.email} />
      </div>
    </div>
  );
}
