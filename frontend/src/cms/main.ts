import "./styles/cms-shell.css";
import "./styles/login-route.css";
import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import { router } from "./router/index.js";
import { useAuthStore } from "./stores/auth.js";

async function bootstrap(): Promise<void> {
  const pinia = createPinia();
  const app = createApp(App);
  app.use(pinia);
  app.use(router);

  await useAuthStore().hydrate();
  /** Tunggu guard + rute awal (hard refresh /admin/...) selesai sebelum mount — hindari RouterView kosong. */
  await router.isReady();

  app.mount("#app");
}

void bootstrap().catch((err: unknown) => {
  console.error("[cms] bootstrap gagal:", err);
  const root = document.getElementById("app");
  if (root) {
    root.innerHTML =
      '<p style="margin:2rem;font-family:system-ui,sans-serif">Gagal memuat CMS. Periksa konsol browser, pastikan backend API jalan, lalu muat ulang.</p>';
  }
});
