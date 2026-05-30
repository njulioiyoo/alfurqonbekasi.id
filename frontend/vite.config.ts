import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { adminSpaFallback } from "./vite-plugin-admin-spa-fallback";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

/** Satu proyek Vite: situs utama (`/`) + CMS (`/admin/`). Aset Metronic di `public/metronic/`. */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, "");
  /**
   * Origin backend untuk proxy `/api` (dev). Isi `VITE_PROXY_TARGET` di `.env`:
   * hostname/virtual host (`http://alfurqonbekasi.web.local`) atau Node langsung (`http://127.0.0.1:3000`).
   */
  /** Tanpa `.env`: proxy ke API Docker lokal (host 3001) — port 3000 sering dipakai layanan lain. */
  const apiProxyTarget = env.VITE_PROXY_TARGET || "http://127.0.0.1:3001";

  return {
    plugins: [adminSpaFallback(), vue()],
    base: "/",
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
          configure(proxy) {
            proxy.on("proxyRes", (proxyRes, req) => {
              if (
                proxyRes.statusCode === 404 &&
                typeof req.url === "string" &&
                req.url.includes("datatable")
              ) {
                console.warn(
                  `[vite] Proxy 404: ${req.method} ${req.url} → ${apiProxyTarget}. Pastikan backend jalan (Docker: port 3001), atau set VITE_PROXY_TARGET di frontend/.env (mis. http://127.0.0.1:3001).`
                );
              }
            });
          },
        },
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: resolve(rootDir, "index.html"),
          admin: resolve(rootDir, "admin/index.html"),
        },
      },
    },
  };
});
