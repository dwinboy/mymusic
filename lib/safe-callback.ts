/**
 * Where to send someone after they sign in or sign up.
 *
 * `callbackUrl` arrives on the query string, so it is whatever the link said —
 * including a link someone else wrote. `/login?callbackUrl=https://example.invalid`
 * would otherwise walk a listener through typing their password and then hand
 * them straight to another site, which is the shape of a credible phishing
 * page. Only same-site paths are honoured.
 */
export function safeCallbackUrl(value: string | null | undefined, fallback = "/"): string {
  if (!value || !value.startsWith("/")) return fallback;
  // "//example.invalid" is protocol-relative, and "/\example.invalid" is
  // treated the same way by some browsers — both leave the site despite
  // starting with a slash.
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
