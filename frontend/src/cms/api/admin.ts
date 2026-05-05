import { deleteJson, getJson, patchJson, postJson } from "./http.js";

export type AdminUserRow = {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  createdAt: string;
  updatedAt?: string;
};

export type ListUsersResponse = {
  ok: boolean;
  data?: {
    items: AdminUserRow[];
    total: number;
    page: number;
    limit: number;
  };
  error?: { code: string; message: string };
};

export type CreateUserResponse = {
  ok: boolean;
  data?: AdminUserRow & { createdAt: string };
  error?: { code: string; message: string };
};

export async function listUsers(page = 1, limit = 20): Promise<ListUsersResponse> {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  return getJson<ListUsersResponse>(`/admin/users?${q}`);
}

export type GetUserResponse = {
  ok: boolean;
  data?: AdminUserRow;
  error?: { code: string; message: string };
};

export async function getAdminUser(id: string): Promise<GetUserResponse> {
  return getJson<GetUserResponse>(`/admin/users/${encodeURIComponent(id)}`);
}

export async function createAdminUser(body: {
  email: string;
  password: string;
  fullName?: string;
  role: "user" | "admin";
}): Promise<CreateUserResponse> {
  return postJson<CreateUserResponse>("/admin/users", body);
}

export type PatchUserResponse = {
  ok: boolean;
  data?: AdminUserRow;
  error?: { code: string; message: string };
};

export async function patchAdminUser(
  id: string,
  body: { fullName?: string | null; role?: "user" | "admin"; password?: string }
): Promise<PatchUserResponse> {
  return patchJson<PatchUserResponse>(`/admin/users/${encodeURIComponent(id)}`, body);
}

export type DeleteUserResponse = {
  ok: boolean;
  error?: { code: string; message: string };
};

export async function deleteAdminUser(id: string): Promise<DeleteUserResponse> {
  return deleteJson<DeleteUserResponse>(`/admin/users/${encodeURIComponent(id)}`);
}
