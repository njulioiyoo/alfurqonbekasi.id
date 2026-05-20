import type { Request, Response } from "express";
import {
  FALLBACK_ISLAMIC_DAYS,
  getLatestIslamicDays,
  pickLatestIslamicDays,
} from "../services/islamic-days.service.js";

export async function getPublicIslamicDays(req: Request, res: Response): Promise<void> {
  const raw = req.query.limit;
  const limit = typeof raw === "string" ? Math.min(12, Math.max(1, parseInt(raw, 10) || 4)) : 4;
  try {
    const data = await getLatestIslamicDays(limit);
    if (data.items.length > 0) {
      res.json({ ok: true, data });
      return;
    }
  } catch (e) {
    console.error("[public/islamic-days]", e);
  }
  res.json({
    ok: true,
    data: {
      year: 2026,
      items: pickLatestIslamicDays(FALLBACK_ISLAMIC_DAYS, limit),
      sourceUrl: "https://www.islamicfinder.org/specialislamicdays/",
    },
  });
}
