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
  await useAuthStore().hydrate();
  app.use(router);
  app.mount("#app");
}

void bootstrap();
