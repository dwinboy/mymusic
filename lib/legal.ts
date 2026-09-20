/**
 * The details every policy page repeats.
 *
 * Kept in one place because they appear across six pages, and an address that
 * is right on five of them is still a takedown notice that never arrives.
 * Change them here.
 */
export const LEGAL = {
  siteName: "Vibe Banger",
  siteUrl: "https://vibebanger.com",
  /** Where anything legal, privacy-related or urgent should reach a person. */
  contactEmail: "dwin@vibebanger.com",
  /** Where the operator is based, which is the law these pages are written under. */
  jurisdiction: "Cameroon",
  /** Shown on each policy so a reader knows how current it is. */
  lastUpdated: "21 September 2026",
} as const;

export const LEGAL_PAGES = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/copyright", label: "Copyright" },
  { href: "/commission-terms", label: "Commissions" },
] as const;
