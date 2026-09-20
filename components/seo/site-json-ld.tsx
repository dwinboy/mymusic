import { JsonLd } from "@/components/seo/json-ld";
import { LEGAL } from "@/lib/legal";

/**
 * What the site itself is, for search engines.
 *
 * Song, artist and album pages each describe their own subject, but nothing
 * described the thing publishing them. This is what lets a search engine
 * treat "Vibe Banger" as a name rather than two ordinary words, show a search
 * box against the site in results, and connect the pages to one publisher.
 *
 * Rendered once, on the homepage. Repeating it on every page adds nothing and
 * makes the markup harder to trust.
 */
export function SiteJsonLd() {
  const organisation = {
    "@type": "Organization",
    "@id": `${LEGAL.siteUrl}/#organization`,
    name: LEGAL.siteName,
    url: LEGAL.siteUrl,
    logo: `${LEGAL.siteUrl}/icons/icon-512.png`,
    email: LEGAL.contactEmail,
    description:
      "Original songs written from real experience, and songs commissioned for a particular person.",
  };

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@graph": [
          organisation,
          {
            "@type": "WebSite",
            "@id": `${LEGAL.siteUrl}/#website`,
            url: LEGAL.siteUrl,
            name: LEGAL.siteName,
            publisher: { "@id": `${LEGAL.siteUrl}/#organization` },
            potentialAction: {
              "@type": "SearchAction",
              target: {
                "@type": "EntryPoint",
                urlTemplate: `${LEGAL.siteUrl}/search?q={search_term_string}`,
              },
              "query-input": "required name=search_term_string",
            },
          },
          {
            // The commissions offering, which is the one thing here somebody
            // would search for by intent rather than by name.
            "@type": "Service",
            "@id": `${LEGAL.siteUrl}/#commissions`,
            name: "Custom song commissions",
            serviceType: "Custom songwriting",
            provider: { "@id": `${LEGAL.siteUrl}/#organization` },
            url: `${LEGAL.siteUrl}/request`,
            description:
              "An original song written and produced from your story — for a birthday, a wedding, an anniversary, or no occasion at all.",
          },
        ],
      }}
    />
  );
}
