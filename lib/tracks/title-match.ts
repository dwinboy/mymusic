/**
 * Comparing track titles as a person would.
 *
 * Kept free of any database import so it can be reasoned about — and tested —
 * on its own.
 */

/**
 * Titles are compared on their letters and digits alone, so "MotoNaMarket
 * (1)", "Moto Na Market" and "motonamarket" are all the same song — which is
 * exactly how a duplicate tends to arrive, from a file downloaded twice.
 */
export function normaliseTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    // Copy markers an export or a second download adds.
    .replace(/\((?:\d+|copy|final|master|v\d+)\)/g, " ")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

/** Whether two titles read as the same song. */
export function sameTitle(a: string, b: string): boolean {
  const left = normaliseTitle(a);
  return left.length >= 2 && left === normaliseTitle(b);
}
