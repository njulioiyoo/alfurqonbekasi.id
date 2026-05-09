import express, { type Request, type Response } from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.routes.js";
import { adminRouter } from "./routes/admin.routes.js";
import { uploadsRootDir } from "./utils/uploads-path.js";

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
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use("/uploads", express.static(uploadsRoot, { maxAge: "1d" }));
  app.use("/api/uploads", express.static(uploadsRoot, { maxAge: "1d" }));

  /** Kalau Traefik mem-strip `/api`, permintaan menjadi `GET /health`. */
  app.get("/health", sendHealth);

  const api = express.Router();
  api.get("/health", sendHealth);
  api.use("/auth", authRouter);
  api.use("/admin", adminRouter);

  app.use("/api", api);

  /**
   * Traefik / proxy yang memakai StripPrefix(`/api`) mengarahkan ke origin ini dengan path `/admin/…`,
   * `/auth/…` (tanpa prefiks `/api`). Tanpa mount ini → 404 walau router `/api/admin` ada.
   */
  app.use("/admin", adminRouter);
  app.use("/auth", authRouter);

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
