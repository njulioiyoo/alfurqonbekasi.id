import { z } from "zod";

const UPLOAD_PATH_PREFIX = /^\/(?:api\/)?uploads\//;

/** Normalisasi URL absolut ke path relatif upload (untuk simpan di DB). */
export function normalizeStoredMediaUrl(val: unknown): unknown {
  if (val === null || val === undefined) return val;
  if (typeof val !== "string") return val;
  const t = val.trim();
  if (!t) return "";
  if (UPLOAD_PATH_PREFIX.test(t)) return t.split(/[?#]/)[0] ?? t;
  try {
    const u = new URL(t);
    if (UPLOAD_PATH_PREFIX.test(u.pathname)) return u.pathname;
  } catch {
    /* bukan URL absolut */
  }
  return t;
}

function isAllowedMediaUrl(s: string): boolean {
  const t = s.trim();
  if (!t) return true;
  if (UPLOAD_PATH_PREFIX.test(t)) return t.length <= 2000;
  try {
    const u = new URL(t);
    return UPLOAD_PATH_PREFIX.test(u.pathname);
  } catch {
    return false;
  }
}

/** Path `/api/uploads/...`, `/uploads/...`, atau URL https ke file upload — tanpa `z.url()` yang menolak path relatif. */
export const optionalStoredMediaUrlSchema = z.preprocess(
  normalizeStoredMediaUrl,
  z
    .union([z.literal(""), z.null(), z.string().trim().max(2000)])
    .optional()
    .refine((v) => v === undefined || v === null || v === "" || (typeof v === "string" && isAllowedMediaUrl(v)), {
      message: "URL gambar tidak valid (gunakan upload atau path /api/uploads/...)",
    })
);
