import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { UsersManager } from "@/components/admin/users-manager";

export const metadata = { title: "Users" };

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/admin/users");

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
      <h1 className="text-2xl font-semibold text-foreground">Users</h1>
      <p className="mt-1 text-sm text-foreground-muted">Everyone with an account on Vibe Banger.</p>

      <div className="mt-6">
        <UsersManager currentUserId={session.user.id} />
      </div>
    </div>
  );
}
