"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { safeCallbackUrl } from "@/lib/safe-callback";

/**
 * The "already have an account?" / "sign up" link between the two auth pages.
 *
 * It carries the callbackUrl across. Someone who pressed download, chose
 * "create an account", then realised they already had one used to lose their
 * place at that last step and land on the homepage instead of back at the
 * song they were saving.
 */
export function AuthSwitchLink({ href, children }: { href: "/login" | "/register"; children: React.ReactNode }) {
  return (
    // Reading the query string opts the page out of static prerendering
    // unless it happens inside a boundary. The fallback is the same link
    // without the parameter, so there is nothing to see while it resolves.
    <Suspense fallback={<SwitchLink href={href}>{children}</SwitchLink>}>
      <SwitchLinkWithCallback href={href}>{children}</SwitchLinkWithCallback>
    </Suspense>
  );
}

function SwitchLinkWithCallback({ href, children }: { href: string; children: React.ReactNode }) {
  const callbackUrl = safeCallbackUrl(useSearchParams().get("callbackUrl"), "");
  return (
    <SwitchLink href={callbackUrl ? `${href}?callbackUrl=${encodeURIComponent(callbackUrl)}` : href}>
      {children}
    </SwitchLink>
  );
}

function SwitchLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-medium text-foreground hover:underline">
      {children}
    </Link>
  );
}
