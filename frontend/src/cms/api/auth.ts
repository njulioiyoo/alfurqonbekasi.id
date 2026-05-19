import { postJson } from "./http.js";

export type LoginResponse = {
  ok: boolean;
  data?: {
    user: { id: string; email: string; fullName: string | null; role: string };
  };
  error?: { code: string; message: string };
};

export async function loginRequest(email: string, password: string): Promise<LoginResponse> {
  return postJson<LoginResponse>("/auth/login", { email, password });
}

export async function logoutRequest(): Promise<{ ok: boolean }> {
  return postJson<{ ok: boolean }>("/auth/logout", {});
}
