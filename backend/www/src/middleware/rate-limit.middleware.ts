import type { NextFunction, Request, Response } from "express";
import { getRuntimeConfig } from "../services/runtime-config.service.js";

type Bucket = { count: number; windowStart: number };

const buckets = new Map<string, Bucket>();

function clientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() || req.ip || "unknown";
  }
  return req.ip || req.socket.remoteAddress || "unknown";
}

function isExemptPath(path: string): boolean {
  if (path === "/health" || path === "/api/health") return true;
  if (path.startsWith("/uploads") || path.startsWith("/api/uploads")) return true;
  return false;
}

/** Batasi jumlah request per IP per menit (nilai dari CMS `rateLimitPerMinute`). */
export async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (req.method === "OPTIONS" || isExemptPath(req.path)) {
    next();
    return;
  }

  try {
    const cfg = await getRuntimeConfig();
    const limit = cfg.rateLimitPerMinute;
    const now = Date.now();
    const windowMs = 60_000;
    const key = clientIp(req);
    let bucket = buckets.get(key);
    if (!bucket || now - bucket.windowStart >= windowMs) {
      bucket = { count: 0, windowStart: now };
      buckets.set(key, bucket);
    }
    bucket.count += 1;

    const remaining = Math.max(0, limit - bucket.count);
    const resetSec = Math.ceil((bucket.windowStart + windowMs - now) / 1000);
    res.setHeader("X-RateLimit-Limit", String(limit));
    res.setHeader("X-RateLimit-Remaining", String(remaining));
    res.setHeader("X-RateLimit-Reset", String(Math.max(0, resetSec)));

    if (bucket.count > limit) {
      res.status(429).json({
        ok: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: `Terlalu banyak permintaan. Coba lagi dalam ${resetSec} detik.`,
        },
      });
      return;
    }
    next();
  } catch (e) {
    console.error(e);
    next();
  }
}

/** Bersihkan bucket lama agar memori tidak membengkak (sekali per menit). */
setInterval(() => {
  const now = Date.now();
  for (const [key, b] of buckets) {
    if (now - b.windowStart > 120_000) buckets.delete(key);
  }
}, 60_000).unref();
