import { TermDetailPage, generateTermMetadata } from "@/components/discovery/term-detail-page";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return generateTermMetadata("ACTIVITY", slug);
}

export default async function Page({ params, searchParams }: Props) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  return <TermDetailPage kind="ACTIVITY" slug={slug} searchParams={query} />;
}
