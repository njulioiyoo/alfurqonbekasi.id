export type ApiErrorPayload = {
  ok?: boolean;
  error?: {
    code?: string;
    message?: string;
  };
};

export function isApiForbidden(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  return (data as ApiErrorPayload).error?.code === "FORBIDDEN";
}

export function apiErrorMessage(data: unknown, fallback = "Permintaan gagal"): string {
  if (!data || typeof data !== "object") return fallback;
  const msg = (data as ApiErrorPayload).error?.message?.trim();
  return msg || fallback;
}
