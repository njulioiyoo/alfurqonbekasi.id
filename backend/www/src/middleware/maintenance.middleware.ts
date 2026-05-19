import type { NextFunction, Request, Response } from "express";
import { getRuntimeConfig } from "../services/runtime-config.service.js";

function isPublicContactPost(path: string, method: string): boolean {
  if (method !== "POST") return false;
  return path === "/public/contact" || path === "/api/public/contact";
}

/** Blokir kirim formulir kontak saat `maintenanceMode` aktif. GET config tetap jalan agar frontend bisa membaca flag. */
export async function maintenanceMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!isPublicContactPost(req.path, req.method)) {
    next();
    return;
  }
  try {
    const cfg = await getRuntimeConfig();
    if (!cfg.maintenanceMode) {
      next();
      return;
    }
    res.status(503).json({
      ok: false,
      error: {
        code: "MAINTENANCE",
        message: "Situs sedang dalam pemeliharaan. Silakan coba lagi nanti.",
      },
    });
  } catch (e) {
    console.error(e);
    next();
  }
}
