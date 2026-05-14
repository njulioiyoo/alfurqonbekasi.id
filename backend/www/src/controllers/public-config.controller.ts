import type { Request, Response } from "express";
import { listConfigEntries } from "../services/config.service.js";

const PUBLIC_KEYS = new Set([
  "websiteName",
  "websiteTagline",
  "websiteUrl",
  "adminEmail",
  "adminPhone",
  "address",
  "city",
  "province",
  "postalCode",
  "siteTitle",
  "logoUrl",
  "logoLightUrl",
  "faviconUrl",
  "footerText",
  "igUrl",
  "ytUrl",
  "fbUrl",
  "xUrl",
  "tiktokUrl",
  "waChannelUrl",
  "mapsEmbedUrl",
  "islamicDaysUrl",
  "visi",
  "misi",
]);

export async function getPublicConfig(_req: Request, res: Response): Promise<void> {
  const rows = await listConfigEntries();
  const values: Record<string, string> = {};
  for (const r of rows) {
    if (PUBLIC_KEYS.has(r.key)) values[r.key] = r.value;
  }
  res.json({ ok: true, data: { values } });
}
