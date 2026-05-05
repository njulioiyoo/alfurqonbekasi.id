import type { Response, NextFunction } from "express";
import type { AuthedRequest } from "./auth.middleware.js";
import type { AppActions, AppSubject } from "../acl/subjects.js";

/** Pasang setelah `requireAuth` + `attachAbility`. */
export function authorize(action: AppActions, subject: AppSubject) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (!req.ability) {
      res.status(500).json({
        ok: false,
        error: {
          code: "ABILITY_MISSING",
          message: "Gunakan attachAbility sebelum authorize",
        },
      });
      return;
    }
    if (!req.ability.can(action, subject)) {
      res.status(403).json({
        ok: false,
        error: {
          code: "FORBIDDEN",
          message: "Anda tidak punya akses untuk aksi ini",
          meta: { action, subject },
        },
      });
      return;
    }
    next();
  };
}
