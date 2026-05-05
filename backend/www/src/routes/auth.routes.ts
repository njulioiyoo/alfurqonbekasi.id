import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const authRouter = Router();

authRouter.post("/login", (req, res, next) => {
  void authController.login(req, res).catch(next);
});
authRouter.get("/me", requireAuth, (req, res, next) => {
  void authController.me(req, res).catch(next);
});
authRouter.get("/access-context", requireAuth, (req, res, next) => {
  void authController.accessContext(req, res).catch(next);
});
