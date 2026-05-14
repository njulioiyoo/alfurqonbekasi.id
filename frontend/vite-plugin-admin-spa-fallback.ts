import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin, ViteDevServer } from "vite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Multi-page SPA fallback:
 *  - /admin/* → admin/index.html  (rewrite sebelum Vite — Vite tahu entry ini)
 *  - rute publik (non-file, non-api) → index.html  (post-middleware agar Vite transform HTML dulu)
 *
 * Rute publik ditangani SETELAH semua middleware Vite via return function di configureServer,
 * sehingga tidak bentrok dengan vite:import-analysis.
 */

function rewriteAdminUrl(req: IncomingMessage): void {
  if (req.method && req.method !== "GET" && req.method !== "HEAD") return;
  const raw = req.url ?? "";
  const pathname = raw.split("?")[0] || "";
  if (!pathname.startsWith("/admin")) return;
  if (pathname === "/admin/index.html") return;
  const last = pathname.split("/").filter(Boolean).pop() ?? "";
  if (last.includes(".") && last !== "index.html") return;
  const q = raw.includes("?") ? "?" + raw.split("?").slice(1).join("?") : "";
  req.url = "/admin/index.html" + q;
}

const STATIC_PREFIXES = ["/api", "/bismillah", "/metronic", "/uploads", "/assets", "/src", "/@", "/__"];

function isPublicSpaRoute(req: IncomingMessage): boolean {
  if (req.method && req.method !== "GET" && req.method !== "HEAD") return false;
  const raw = req.url ?? "";
  const pathname = raw.split("?")[0] || "";
  if (pathname === "/" || pathname === "/index.html") return false;
  if (pathname.startsWith("/admin")) return false;
  if (STATIC_PREFIXES.some((p) => pathname.startsWith(p))) return false;
  const last = pathname.split("/").filter(Boolean).pop() ?? "";
  if (last.includes(".")) return false;
  return true;
}

function addPublicFallback(server: { middlewares: { use: (fn: (req: IncomingMessage, res: ServerResponse, next: () => void) => void) => void } }, rootDir: string, devServer?: ViteDevServer): void {
  server.middlewares.use(async (req, res, next) => {
    if (!isPublicSpaRoute(req)) { next(); return; }
    try {
      let html = readFileSync(resolve(rootDir, "index.html"), "utf-8");
      if (devServer) {
        html = await devServer.transformIndexHtml(req.url ?? "/", html);
      }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
    } catch {
      next();
    }
  });
}

export function adminSpaFallback(): Plugin {
  let rootDir = "";
  return {
    name: "admin-spa-fallback",
    enforce: "pre",
    configResolved(config) {
      rootDir = config.root;
    },
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        rewriteAdminUrl(req);
        next();
      });
      return () => addPublicFallback(server, rootDir, server);
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        rewriteAdminUrl(req);
        next();
      });
      return () => addPublicFallback(server, rootDir);
    },
  };
}
