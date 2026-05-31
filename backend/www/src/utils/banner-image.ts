import { readImageDimensionsFromBuffer } from "./image-dimensions.js";

export const BANNER_IMAGE_WIDTH = 2256;
export const BANNER_IMAGE_HEIGHT = 990;

export const BANNER_IMAGE_SIZE_MESSAGE = `Gambar banner wajib berukuran tepat ${BANNER_IMAGE_WIDTH}×${BANNER_IMAGE_HEIGHT} piksel.`;

const BANNER_RASTER_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export function validateBannerImageDimensions(width: number, height: number): string | null {
  if (width === BANNER_IMAGE_WIDTH && height === BANNER_IMAGE_HEIGHT) return null;
  return `${BANNER_IMAGE_SIZE_MESSAGE} Ukuran terdeteksi: ${width}×${height}.`;
}

export function validateBannerImageBuffer(buf: Buffer, mime: string): string | null {
  if (!BANNER_RASTER_MIME.has(mime)) {
    return "Gambar banner hanya mendukung format JPEG, PNG, atau WebP.";
  }
  const dims = readImageDimensionsFromBuffer(buf);
  if (!dims) return "Tidak dapat membaca ukuran gambar. Pastikan file gambar valid.";
  return validateBannerImageDimensions(dims.width, dims.height);
}
