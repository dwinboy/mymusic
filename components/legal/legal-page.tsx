import { LEGAL } from "@/lib/legal";

/**
 * The shell every policy page uses.
 *
 * These are written to be read: short sentences, plain words, and a heading
 * you can scan to find the one paragraph you came for. A policy nobody
 * finishes protects nobody — least of all the person it is supposedly for.
 */
export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <article className="mx-auto max-w-2xl px-4 py-10 sm:px-8 sm:py-14">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h1>
        <p className="mt-4 text-base text-foreground-muted">{intro}</p>
        <p className="mt-4 text-xs text-foreground-subtle">Last updated {LEGAL.lastUpdated}</p>
      </header>
      <div className="mt-10 flex flex-col gap-8">{children}</div>
    </article>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      <div className="mt-3 flex flex-col gap-3 text-sm leading-relaxed text-foreground-muted">{children}</div>
    </section>
  );
}

export function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="flex list-disc flex-col gap-2 pl-5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
