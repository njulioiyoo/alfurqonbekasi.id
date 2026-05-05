import type { Response, NextFunction, RequestHandler } from "express";
import type { AuthedRequest } from "./auth.middleware.js";
import { requireAuth } from "./auth.middleware.js";
import { defineAbilityFor } from "../acl/abilities.js";

/** Pasang setelah `requireAuth`. Mengisi `req.ability` dari `role` JWT. */
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
  req.ability = defineAbilityFor(req.user.role);
  next();
}

/** Shortcut: JWT valid + CASL ability siap untuk `authorize(...)`. */
export const requireAuthWithAbility: RequestHandler[] = [requireAuth, attachAbility];
