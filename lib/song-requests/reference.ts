/**
 * The short code someone quotes when they write to you about a commission:
 * VB-7K2Q. A cuid is unreadable over a phone and unrepeatable from memory.
 *
 * Crockford's alphabet minus the vowels, so no generated code can spell a
 * word and I, L, O and U can't be misread as 1, 1, 0 and V.
 */
const ALPHABET = "23456789BCDFGHJKMNPQRSTVWXYZ";
const LENGTH = 4;

export function generateReference(): string {
  const bytes = new Uint8Array(LENGTH);
  crypto.getRandomValues(bytes);
  let code = "";
  for (const byte of bytes) code += ALPHABET[byte % ALPHABET.length];
  return `VB-${code}`;
}

export function isReference(value: string): boolean {
  return new RegExp(`^VB-[${ALPHABET}]{${LENGTH}}$`).test(value);
}
