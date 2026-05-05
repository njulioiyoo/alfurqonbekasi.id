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
  const apiProxyTarget = env.VITE_PROXY_TARGET || "http://alfurqonbekasi.web.local";

  return {
    plugins: [adminSpaFallback(), vue()],
    base: "/",
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
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
