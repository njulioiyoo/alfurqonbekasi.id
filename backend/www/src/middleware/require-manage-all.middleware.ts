import type { Response, NextFunction } from "express";
import type { AuthedRequest } from "./auth.middleware.js";

/** Hanya role dengan permission `manage:all` di DB (biasanya superadmin). */
export function requireManageAll(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.ability) {
    res.status(500).json({
      ok: false,
      error: { code: "ABILITY_MISSING", message: "attachAbility wajib dipasang sebelum requireManageAll" },
    });
    return;
  }
  if (!req.ability.can("manage", "all")) {
    res.status(403).json({
      ok: false,
      error: { code: "FORBIDDEN", message: "Hanya super administrator yang boleh mengubah ini" },
    });
    return;
  }
  next();
}
