import { db } from "@/lib/db";

export interface SiteSettings {
  siteName: string;
  accentColor: string;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  siteName: "Vibe Banger",
  accentColor: "#e3a857",
};

export async function getSiteSettings(): Promise<SiteSettings> {
  const row = await db.setting.findUnique({ where: { key: "site" } });
  if (!row) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...(row.value as Partial<SiteSettings>) };
}

export async function updateSiteSettings(patch: Partial<SiteSettings>): Promise<SiteSettings> {
  const current = await getSiteSettings();
  const next = { ...current, ...patch };
  await db.setting.upsert({
    where: { key: "site" },
    create: { key: "site", value: next },
    update: { value: next },
  });
  return next;
}
