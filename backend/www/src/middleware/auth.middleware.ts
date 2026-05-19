import type { Response, NextFunction } from "express";
import { verifyAccessToken, type JwtPayload } from "../utils/jwt.js";
import { readAccessToken } from "../utils/auth-cookie.js";
import type { AppAbility } from "../acl/abilities.js";
import type { Request } from "express";

export type AuthedRequest = Request & { user?: JwtPayload; ability?: AppAbility };

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const token = readAccessToken(req);
  if (!token) {
    res.status(401).json({
      ok: false,
      error: { code: "UNAUTHORIZED", message: "Sesi tidak ditemukan. Silakan masuk kembali." },
    });
    return;
  }
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({
      ok: false,
      error: { code: "INVALID_TOKEN", message: "Sesi tidak valid atau sudah kedaluwarsa." },
    });
  }
}
