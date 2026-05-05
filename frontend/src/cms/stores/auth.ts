import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { decryptAdminSessionPayload, encryptAdminSessionPayload } from "../utils/session-crypto.js";

/** Blob terenkripsi AES-GCM — tidak menyimpan token/user plaintext di Application. */
const SESSION_BLOB_KEY = "alfurqon_admin_session";

/** Migrasi sekali dari format lama (plaintext). */
const LEGACY_TOKEN_KEY = "alfurqon_admin_token";
const LEGACY_USER_KEY = "alfurqon_admin_user";

export type SessionUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
};

type SessionPayload = {
  token: string;
  user: SessionUser;
};

/** Hindari dekripsi berulang jika blob tidak berubah (navigasi router). */
let cachedBlobFingerprint: string | null = null;

export const useAuthStore = defineStore("auth", () => {
  const token = ref("");
  const user = ref<SessionUser | null>(null);

  const isAuthenticated = computed(() => Boolean(token.value));

  async function persistEncrypted(): Promise<void> {
    if (!token.value || !user.value) {
      return;
    }
    const payload: SessionPayload = { token: token.value, user: user.value };
    const blob = await encryptAdminSessionPayload(JSON.stringify(payload));
    sessionStorage.setItem(SESSION_BLOB_KEY, blob);
    sessionStorage.removeItem(LEGACY_TOKEN_KEY);
    sessionStorage.removeItem(LEGACY_USER_KEY);
    cachedBlobFingerprint = blob;
  }

  async function tryMigrateLegacyPlain(): Promise<void> {
    const t = sessionStorage.getItem(LEGACY_TOKEN_KEY);
    const u = sessionStorage.getItem(LEGACY_USER_KEY);
    if (!t || !u) {
      return;
    }
    try {
      const parsed = JSON.parse(u) as SessionUser;
      token.value = t;
      user.value = parsed;
      await persistEncrypted();
    } catch {
      sessionStorage.removeItem(LEGACY_TOKEN_KEY);
      sessionStorage.removeItem(LEGACY_USER_KEY);
    }
  }

  async function hydrate(): Promise<void> {
    const blob = sessionStorage.getItem(SESSION_BLOB_KEY);

    if (blob && blob === cachedBlobFingerprint && token.value) {
      return;
    }

    if (!blob) {
      token.value = "";
      user.value = null;
      cachedBlobFingerprint = null;
      await tryMigrateLegacyPlain();
      cachedBlobFingerprint = sessionStorage.getItem(SESSION_BLOB_KEY);
      return;
    }

    try {
      const json = await decryptAdminSessionPayload(blob);
      const payload = JSON.parse(json) as SessionPayload;
      if (!payload.token || !payload.user) {
        throw new Error("invalid payload");
      }
      token.value = payload.token;
      user.value = payload.user;
      cachedBlobFingerprint = blob;
      sessionStorage.removeItem(LEGACY_TOKEN_KEY);
      sessionStorage.removeItem(LEGACY_USER_KEY);
    } catch {
      token.value = "";
      user.value = null;
      sessionStorage.removeItem(SESSION_BLOB_KEY);
      cachedBlobFingerprint = null;
      await tryMigrateLegacyPlain();
      cachedBlobFingerprint = sessionStorage.getItem(SESSION_BLOB_KEY);
    }
  }

  async function login(accessToken: string, u: SessionUser): Promise<void> {
    token.value = accessToken;
    user.value = u;
    await persistEncrypted();
  }

  function logout(): void {
    token.value = "";
    user.value = null;
    sessionStorage.removeItem(SESSION_BLOB_KEY);
    sessionStorage.removeItem(LEGACY_TOKEN_KEY);
    sessionStorage.removeItem(LEGACY_USER_KEY);
    cachedBlobFingerprint = null;
  }

  return {
    token,
    user,
    isAuthenticated,
    login,
    logout,
    hydrate,
  };
});
