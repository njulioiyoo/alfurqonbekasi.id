import type { IncomingMessage } from "node:http";
import type { Plugin } from "vite";

/**
 * Dev & preview: GET /admin, /admin/, /admin/dashboard, … harus mengembalikan `admin/index.html`
 * (bukan `index.html` situs utama). Tanpa ini, refresh di area CMS memuat app situs.
 */
function rewriteAdminSpaUrl(req: IncomingMessage): void {
  if (req.method && req.method !== "GET" && req.method !== "HEAD") {
    return;
  }
  const raw = req.url ?? "";
  const pathname = raw.split("?")[0] || "";
  if (!pathname.startsWith("/admin")) {
    return;
  }
  if (pathname === "/admin/index.html") {
    return;
  }
  const last = pathname.split("/").filter(Boolean).pop() ?? "";
  if (last.includes(".") && last !== "index.html") {
    return;
  }
  const q = raw.includes("?") ? "?" + raw.split("?").slice(1).join("?") : "";
  req.url = "/admin/index.html" + q;
}

export function adminSpaFallback(): Plugin {
  return {
    name: "admin-spa-fallback",
    enforce: "pre",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        rewriteAdminSpaUrl(req);
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        rewriteAdminSpaUrl(req);
        next();
      });
    },
  };
}
