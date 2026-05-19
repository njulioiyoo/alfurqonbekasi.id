import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { getJson, postJson } from "../api/http.js";

export type SessionUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
};

type MeResponse = {
  ok: boolean;
  data?: {
    id: string;
    email: string;
    fullName: string | null;
    role: string;
  };
};

function mapMe(data: MeResponse["data"]): SessionUser | null {
  if (!data) return null;
  return {
    id: data.id,
    email: data.email,
    fullName: data.fullName,
    role: data.role,
  };
}

export const useAuthStore = defineStore("auth", () => {
  const user = ref<SessionUser | null>(null);
  const hydrated = ref(false);

  const isAuthenticated = computed(() => Boolean(user.value));

  async function hydrate(): Promise<void> {
    try {
      const json = await getJson<MeResponse>("/auth/me");
      user.value = json.ok && json.data ? mapMe(json.data) : null;
    } catch {
      user.value = null;
    } finally {
      hydrated.value = true;
    }
  }

  function login(u: SessionUser): void {
    user.value = u;
    hydrated.value = true;
  }

  async function logout(): Promise<void> {
    try {
      await postJson("/auth/logout", {});
    } catch {
      /* cookie tetap dibersihkan di client state */
    } finally {
      user.value = null;
      hydrated.value = true;
    }
  }

  return {
    user,
    hydrated,
    isAuthenticated,
    login,
    logout,
    hydrate,
  };
});
