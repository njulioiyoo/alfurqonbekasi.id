import { CMS_ACCESS_DENIED_MESSAGE } from "../constants/access-messages.js";
import { useAuthStore } from "../stores/auth.js";
import { isApiForbidden } from "../utils/api-error.js";
import { toastError } from "../utils/toast.js";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

async function readJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T;
  if (res.status === 403 || isApiForbidden(data)) {
    toastError(CMS_ACCESS_DENIED_MESSAGE);
  }
  return data;
}

export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE.replace(/\/$/, "")}${p}`;
}

function authHeaders(): Headers {
  const headers = new Headers();
  const auth = useAuthStore();
  if (auth.token) {
    headers.set("Authorization", `Bearer ${auth.token}`);
  }
  return headers;
}

export async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(apiUrl(path), {
    headers: authHeaders(),
  });
  return readJson<T>(res);
}

export async function postJson<T>(path: string, json: unknown): Promise<T> {
  const headers = authHeaders();
  headers.set("Content-Type", "application/json");
  const res = await fetch(apiUrl(path), {
    method: "POST",
    headers,
    body: JSON.stringify(json),
  });
  return readJson<T>(res);
}

export async function patchJson<T>(path: string, json: unknown): Promise<T> {
  const headers = authHeaders();
  headers.set("Content-Type", "application/json");
  const res = await fetch(apiUrl(path), {
    method: "PATCH",
    headers,
    body: JSON.stringify(json),
  });
  return readJson<T>(res);
}

export async function putJson<T>(path: string, json: unknown): Promise<T> {
  const headers = authHeaders();
  headers.set("Content-Type", "application/json");
  const res = await fetch(apiUrl(path), {
    method: "PUT",
    headers,
    body: JSON.stringify(json),
  });
  return readJson<T>(res);
}

export async function deleteJson<T>(path: string): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method: "DELETE",
    headers: authHeaders(),
  });
  return readJson<T>(res);
}

export async function postFormData<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
  return readJson<T>(res);
}
