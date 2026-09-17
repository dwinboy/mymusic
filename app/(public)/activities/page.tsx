import { TermIndexPage, termIndexMetadata } from "@/components/discovery/term-index-page";

export const metadata = termIndexMetadata("ACTIVITY");
export const dynamic = "force-dynamic";

export default function Page() {
  return <TermIndexPage kind="ACTIVITY" />;
}
