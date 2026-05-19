import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { attachAbility } from "../middleware/ability.middleware.js";

export const authRouter = Router();

authRouter.post("/login", (req, res, next) => {
  void authController.login(req, res).catch(next);
});
authRouter.post("/logout", (req, res, next) => {
  void authController.logout(req, res).catch(next);
});
authRouter.get("/me", requireAuth, (req, res, next) => {
  void authController.me(req, res).catch(next);
});
authRouter.get("/access-context", requireAuth, attachAbility, (req, res, next) => {
  void authController.accessContext(req, res).catch(next);
});
