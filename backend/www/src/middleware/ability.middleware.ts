import type { Response, NextFunction, RequestHandler } from "express";
import type { AuthedRequest } from "./auth.middleware.js";
import { requireAuth } from "./auth.middleware.js";
import { defineAbilityFromPermissionNames } from "../acl/abilities.js";
import { getPermissionNamesForRoleName } from "../services/rbac.service.js";

/** Pasang setelah `requireAuth`. Mengisi `req.ability` dari permission DB (Spatie-style) + fallback switch role. */
export function attachAbility(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(500).json({
      ok: false,
      error: {
        code: "ABILITY_ORDER",
        message: "attachAbility harus dipanggil setelah requireAuth",
      },
    });
    return;
  }
  getPermissionNamesForRoleName(req.user.role)
    .then((names) => {
      req.ability = defineAbilityFromPermissionNames(names);
      next();
    })
    .catch(next);
}

/** Shortcut: JWT valid + CASL ability siap untuk `authorize(...)`. */
export const requireAuthWithAbility: RequestHandler[] = [requireAuth, attachAbility];
