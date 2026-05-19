import { promises as fs } from "node:fs";
import { join } from "node:path";
import { readImageDimensionsFromBuffer } from "./image-dimensions.js";
import { uploadsRootDir } from "./uploads-path.js";

/** Ukuran tampilan detail di website. */
export const EVENT_COVER_WIDTH = 870;
export const EVENT_COVER_HEIGHT = 400;

/** Ukuran tampilan kartu / thumbnail di website. */
export const EVENT_THUMB_WIDTH = 350;
export const EVENT_THUMB_HEIGHT = 280;

export const EVENT_COVER_SIZE_MESSAGE = `Gambar kegiatan minimal ${EVENT_COVER_WIDTH}×${EVENT_COVER_HEIGHT} piksel (rasio ±15% dari ${EVENT_COVER_WIDTH}:${EVENT_COVER_HEIGHT}). Satu file untuk thumbnail (${EVENT_THUMB_WIDTH}×${EVENT_THUMB_HEIGHT}) dan detail di website.`;

const EVENT_RASTER_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

const TARGET_RATIO = EVENT_COVER_WIDTH / EVENT_COVER_HEIGHT;
const RATIO_TOLERANCE = 0.15;

export function isEventCoverRasterMime(mime: string): boolean {
  return EVENT_RASTER_MIME.has(mime);
}

export function validateEventCoverDimensions(width: number, height: number): string | null {
  if (width < EVENT_COVER_WIDTH || height < EVENT_COVER_HEIGHT) {
    return `${EVENT_COVER_SIZE_MESSAGE} Ukuran terdeteksi: ${width}×${height}.`;
  }
  const ratio = width / height;
  if (Math.abs(ratio - TARGET_RATIO) > RATIO_TOLERANCE) {
    return `${EVENT_COVER_SIZE_MESSAGE} Ukuran terdeteksi: ${width}×${height}.`;
  }
  return null;
}

export function validateEventCoverBuffer(buf: Buffer, mime: string): string | null {
  if (!isEventCoverRasterMime(mime)) {
    return "Gambar kegiatan hanya mendukung format JPEG, PNG, atau WebP.";
  }
  const dims = readImageDimensionsFromBuffer(buf);
  if (!dims) return "Tidak dapat membaca ukuran gambar. Pastikan file gambar valid.";
  return validateEventCoverDimensions(dims.width, dims.height);
}

export async function validateEventCoverUrl(coverUrl: string): Promise<string | null> {
  const trimmed = coverUrl.trim();
  if (!trimmed) return null;

  const m =
    trimmed.match(/\/uploads\/content\/([^/?#]+)$/i) ?? trimmed.match(/\/api\/uploads\/content\/([^/?#]+)$/i);
  if (!m?.[1]) return null;

  try {
    const abs = join(uploadsRootDir(), "content", m[1]);
    const buf = await fs.readFile(abs);
    const ext = m[1].split(".").pop()?.toLowerCase() ?? "";
    const mime =
      ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "";
    if (!mime) return "Gambar kegiatan hanya mendukung format JPEG, PNG, atau WebP.";
    return validateEventCoverBuffer(buf, mime);
  } catch {
    return "File gambar kegiatan tidak ditemukan di server.";
  }
}
