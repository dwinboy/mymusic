import Link from "next/link";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Not found" };

/**
 * For paths outside the public group — a mistyped /admin or /creator URL.
 * There is no player or navigation to preserve out here, so this only has to
 * be recognisably the same product and point the way back.
 */
export default function RootNotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        This one isn&rsquo;t here
      </h1>
      <p className="mt-3 max-w-md text-base text-foreground-muted">
        The page may have moved, or you may not have access to it.
      </p>
      <Button asChild size="lg" className="mt-8">
        <Link href="/">
          <Home className="h-4 w-4" /> Back to Vibe Banger
        </Link>
      </Button>
    </div>
  );
}
