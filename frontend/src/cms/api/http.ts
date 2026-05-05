import { useAuthStore } from "../stores/auth.js";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

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
  const data = (await res.json()) as T;
  return data;
}

export async function postJson<T>(path: string, json: unknown): Promise<T> {
  const headers = authHeaders();
  headers.set("Content-Type", "application/json");
  const res = await fetch(apiUrl(path), {
    method: "POST",
    headers,
    body: JSON.stringify(json),
  });
  const data = (await res.json()) as T;
  return data;
}

export async function patchJson<T>(path: string, json: unknown): Promise<T> {
  const headers = authHeaders();
  headers.set("Content-Type", "application/json");
  const res = await fetch(apiUrl(path), {
    method: "PATCH",
    headers,
    body: JSON.stringify(json),
  });
  const data = (await res.json()) as T;
  return data;
}

export async function deleteJson<T>(path: string): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method: "DELETE",
    headers: authHeaders(),
  });
  const data = (await res.json()) as T;
  return data;
}
