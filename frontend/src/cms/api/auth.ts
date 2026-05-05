import { postJson } from "./http.js";

export type LoginResponse = {
  ok: boolean;
  data?: {
    user: { id: string; email: string; fullName: string | null; role: string };
    accessToken: string;
  };
  error?: { code: string; message: string };
};

export async function loginRequest(email: string, password: string): Promise<LoginResponse> {
  return postJson<LoginResponse>("/auth/login", { email, password });
}
