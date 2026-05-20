import { promises as fs } from "node:fs";
import { join } from "node:path";
import { readImageDimensionsFromBuffer } from "./image-dimensions.js";
import { uploadsRootDir } from "./uploads-path.js";

/** Ukuran tampilan kartu petugas ibadah di website. */
export const PRAYER_STAFF_COVER_WIDTH = 350;
export const PRAYER_STAFF_COVER_HEIGHT = 484;

export const PRAYER_STAFF_COVER_SIZE_MESSAGE = `Gambar cover petugas ibadah wajib berukuran tepat ${PRAYER_STAFF_COVER_WIDTH}×${PRAYER_STAFF_COVER_HEIGHT} piksel.`;

const RASTER_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export function validatePrayerStaffCoverDimensions(width: number, height: number): string | null {
  if (width === PRAYER_STAFF_COVER_WIDTH && height === PRAYER_STAFF_COVER_HEIGHT) return null;
  return `${PRAYER_STAFF_COVER_SIZE_MESSAGE} Ukuran terdeteksi: ${width}×${height}.`;
}

export function validatePrayerStaffCoverBuffer(buf: Buffer, mime: string): string | null {
  if (!RASTER_MIME.has(mime)) {
    return "Gambar cover hanya mendukung format JPEG, PNG, atau WebP.";
  }
  const dims = readImageDimensionsFromBuffer(buf);
  if (!dims) return "Tidak dapat membaca ukuran gambar. Pastikan file gambar valid.";
  return validatePrayerStaffCoverDimensions(dims.width, dims.height);
}

export async function validatePrayerStaffCoverUrl(coverUrl: string): Promise<string | null> {
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
    if (!mime) return "Gambar cover hanya mendukung format JPEG, PNG, atau WebP.";
    return validatePrayerStaffCoverBuffer(buf, mime);
  } catch {
    return "File gambar tidak ditemukan di server.";
  }
}
