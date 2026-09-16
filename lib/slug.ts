import slugify from "slugify";

export function toSlug(value: string): string {
  return slugify(value, { lower: true, strict: true, trim: true });
}

/**
 * Generates a unique slug by appending -2, -3, ... when the base slug
 * collides with an existing record.
 */
export async function uniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>
): Promise<string> {
  const baseSlug = toSlug(base) || "untitled";
  let slug = baseSlug;
  let attempt = 1;

  while (await exists(slug)) {
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
  }

  return slug;
}
