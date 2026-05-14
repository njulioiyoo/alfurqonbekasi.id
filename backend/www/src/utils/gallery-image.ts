import { promises as fs } from "node:fs";
import { join } from "node:path";
import { readImageDimensionsFromBuffer } from "./image-dimensions.js";
import { uploadsRootDir } from "./uploads-path.js";

export const GALLERY_IMAGE_WIDTH = 390;
export const GALLERY_IMAGE_HEIGHT = 353;

export const GALLERY_IMAGE_SIZE_MESSAGE = `Gambar galeri wajib berukuran tepat ${GALLERY_IMAGE_WIDTH}×${GALLERY_IMAGE_HEIGHT} piksel.`;

const GALLERY_RASTER_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export function isGalleryRasterMime(mime: string): boolean {
  return GALLERY_RASTER_MIME.has(mime);
}

export function validateGalleryImageDimensions(width: number, height: number): string | null {
  if (width === GALLERY_IMAGE_WIDTH && height === GALLERY_IMAGE_HEIGHT) return null;
  return `${GALLERY_IMAGE_SIZE_MESSAGE} Ukuran terdeteksi: ${width}×${height}.`;
}

export function validateGalleryImageBuffer(buf: Buffer, mime: string): string | null {
  if (!isGalleryRasterMime(mime)) {
    return "Gambar galeri hanya mendukung format JPEG, PNG, atau WebP.";
  }
  const dims = readImageDimensionsFromBuffer(buf);
  if (!dims) return "Tidak dapat membaca ukuran gambar. Pastikan file gambar valid.";
  return validateGalleryImageDimensions(dims.width, dims.height);
}

/** Validasi file upload dari URL `/api/uploads/content/...` atau path relatif. */
export async function validateGalleryCoverUrl(coverUrl: string): Promise<string | null> {
  const trimmed = coverUrl.trim();
  if (!trimmed) return "Gambar galeri wajib diupload.";

  const m = trimmed.match(/\/uploads\/content\/([^/?#]+)$/i) ?? trimmed.match(/\/api\/uploads\/content\/([^/?#]+)$/i);
  if (!m?.[1]) return null;

  try {
    const abs = join(uploadsRootDir(), "content", m[1]);
    const buf = await fs.readFile(abs);
    const ext = m[1].split(".").pop()?.toLowerCase() ?? "";
    const mime =
      ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "";
    if (!mime) return "Gambar galeri hanya mendukung format JPEG, PNG, atau WebP.";
    return validateGalleryImageBuffer(buf, mime);
  } catch {
    return "File gambar galeri tidak ditemukan di server.";
  }
}
