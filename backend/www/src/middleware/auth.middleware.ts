import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken, type JwtPayload } from "../utils/jwt.js";
import type { AppAbility } from "../acl/abilities.js";

export type AuthedRequest = Request & { user?: JwtPayload; ability?: AppAbility };

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({
      ok: false,
      error: { code: "UNAUTHORIZED", message: "Token tidak ada atau format salah" },
    });
    return;
  }
  const token = header.slice("Bearer ".length).trim();
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({
      ok: false,
      error: { code: "INVALID_TOKEN", message: "Token tidak valid atau kadaluarsa" },
    });
  }
}
