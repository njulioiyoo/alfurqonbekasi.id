import express, { type NextFunction, type Request, type Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { authRouter } from "./routes/auth.routes.js";
import { adminRouter } from "./routes/admin.routes.js";
import * as publicConfigController from "./controllers/public-config.controller.js";
import * as publicContactController from "./controllers/public-contact.controller.js";
import * as publicHallRentalController from "./controllers/public-hall-rental.controller.js";
import * as publicContentController from "./controllers/public-content.controller.js";
import * as publicIslamicDaysController from "./controllers/public-islamic-days.controller.js";
import { maintenanceMiddleware } from "./middleware/maintenance.middleware.js";
import { publicCacheMiddleware } from "./middleware/public-cache.middleware.js";
import { rateLimitMiddleware } from "./middleware/rate-limit.middleware.js";
import { uploadsRootDir } from "./utils/uploads-path.js";

function wrapAsync(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    void fn(req, res, next).catch(next);
  };
}

function sendHealth(_req: Request, res: Response): void {
  res.json({ ok: true, data: { service: "alfurqon-masjid-api", ts: new Date().toISOString() } });
}

export function createApp(): express.Application {
  const app = express();
  const uploadsRoot = uploadsRootDir();
  app.set("trust proxy", 1);
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(wrapAsync(rateLimitMiddleware));
  app.use(wrapAsync(maintenanceMiddleware));
  app.use(wrapAsync(publicCacheMiddleware));
  app.use("/uploads", express.static(uploadsRoot, { maxAge: "1d" }));
  app.use("/api/uploads", express.static(uploadsRoot, { maxAge: "1d" }));

  /** Kalau Traefik mem-strip `/api`, permintaan menjadi `GET /health`. */
  app.get("/health", sendHealth);

  const api = express.Router();
  api.get("/health", sendHealth);
  api.get("/public/config", (req, res, next) => {
    void publicConfigController.getPublicConfig(req, res).catch(next);
  });
  api.post("/public/contact", (req, res, next) => {
    void publicContactController.postPublicContact(req, res).catch(next);
  });
  api.get("/public/halls", (req, res, next) => {
    void publicHallRentalController.getPublicHalls(req, res).catch(next);
  });
  api.get("/public/hall-bookings/availability", (req, res, next) => {
    void publicHallRentalController.getPublicHallAvailability(req, res).catch(next);
  });
  api.post("/public/hall-bookings", (req, res, next) => {
    void publicHallRentalController.postPublicHallBooking(req, res).catch(next);
  });
  api.get("/public/content/:type", (req, res, next) => {
    void publicContentController.getPublicContentByType(req, res).catch(next);
  });
  api.get("/public/islamic-days", (req, res, next) => {
    void publicIslamicDaysController.getPublicIslamicDays(req, res).catch(next);
  });
  api.use("/auth", authRouter);
  api.use("/admin", adminRouter);

  app.use("/api", api);

  /**
   * Traefik / proxy yang memakai StripPrefix(`/api`) mengarahkan ke origin ini dengan path `/admin/…`,
   * `/auth/…` (tanpa prefiks `/api`). Tanpa mount ini → 404 walau router `/api/admin` ada.
   */
  app.use("/admin", adminRouter);
  app.use("/auth", authRouter);
  app.get("/public/config", (req, res, next) => {
    void publicConfigController.getPublicConfig(req, res).catch(next);
  });
  app.post("/public/contact", (req, res, next) => {
    void publicContactController.postPublicContact(req, res).catch(next);
  });
  app.get("/public/halls", (req, res, next) => {
    void publicHallRentalController.getPublicHalls(req, res).catch(next);
  });
  app.get("/public/hall-bookings/availability", (req, res, next) => {
    void publicHallRentalController.getPublicHallAvailability(req, res).catch(next);
  });
  app.post("/public/hall-bookings", (req, res, next) => {
    void publicHallRentalController.postPublicHallBooking(req, res).catch(next);
  });
  app.get("/public/content/:type", (req, res, next) => {
    void publicContentController.getPublicContentByType(req, res).catch(next);
  });
  app.get("/public/islamic-days", (req, res, next) => {
    void publicIslamicDaysController.getPublicIslamicDays(req, res).catch(next);
  });

  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ): void => {
      console.error(err);
      res.status(500).json({
        ok: false,
        error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" },
      });
    }
  );

  return app;
}
