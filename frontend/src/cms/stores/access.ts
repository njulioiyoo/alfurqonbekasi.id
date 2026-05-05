import { ref } from "vue";
import { defineStore } from "pinia";
import { getJson } from "../api/http.js";

export type MenuItem = {
  id: string;
  label: string;
  path: string;
  icon?: string;
  action: string;
  subject: string;
};

export type AccessContextResponse = {
  ok: boolean;
  data?: {
    role: string;
    rules: unknown[];
    menu: MenuItem[];
  };
  error?: { code: string; message: string };
};

export const useAccessStore = defineStore("access", () => {
  const menu = ref<MenuItem[]>([]);
  const rules = ref<unknown[]>([]);
  const loading = ref(false);
  const error = ref("");

  function reset(): void {
    menu.value = [];
    rules.value = [];
    loading.value = false;
    error.value = "";
  }

  async function load(): Promise<void> {
    loading.value = true;
    error.value = "";
    try {
      const json = await getJson<AccessContextResponse>("/auth/access-context");
      if (json.ok && json.data) {
        menu.value = json.data.menu;
        rules.value = json.data.rules ?? [];
      } else {
        error.value = json.error?.message || "Gagal memuat menu";
        menu.value = [];
      }
    } catch {
      error.value = "Gagal memuat menu";
      menu.value = [];
    } finally {
      loading.value = false;
    }
  }

  return { menu, rules, loading, error, reset, load };
});

/** Route frontend untuk item menu dari `/auth/access-context`. */
export function menuRouteTarget(item: MenuItem): { name: string; params?: Record<string, string> } {
  switch (item.id) {
    case "dashboard":
      return { name: "dashboard" };
    case "users":
      return { name: "master-users" };
    case "roles":
      return { name: "master-roles" };
    default:
      return { name: "dashboard" };
  }
}
