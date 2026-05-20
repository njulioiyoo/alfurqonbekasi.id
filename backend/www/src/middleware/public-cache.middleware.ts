import type { NextFunction, Request, Response } from "express";
import { getRuntimeConfig } from "../services/runtime-config.service.js";

function isPublicCacheableGet(path: string, method: string): boolean {
  if (method !== "GET") return false;
  if (path === "/public/config" || path === "/api/public/config") return true;
  if (path === "/public/islamic-days" || path === "/api/public/islamic-days") return true;
  return (
    /^\/public\/content\/[a-z_]+$/.test(path) ||
    /^\/api\/public\/content\/[a-z_]+$/.test(path)
  );
}

/** Set header `Cache-Control` untuk respons publik sesuai `cacheTtlSeconds` di CMS. */
export async function publicCacheMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!isPublicCacheableGet(req.path, req.method)) {
    next();
    return;
  }

  try {
    const cfg = await getRuntimeConfig();
    const ttl = cfg.cacheTtlSeconds;
    if (ttl <= 0) {
      res.setHeader("Cache-Control", "no-store");
    } else {
      res.setHeader("Cache-Control", `public, max-age=${ttl}`);
    }
  } catch (e) {
    console.error(e);
  }
  next();
}
