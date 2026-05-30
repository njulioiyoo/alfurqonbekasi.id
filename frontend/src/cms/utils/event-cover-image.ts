/** Selaras dengan `backend/www/src/utils/event-cover-image.ts` dan tampilan kartu di website. */
export const EVENT_COVER_WIDTH = 870;
export const EVENT_COVER_HEIGHT = 400;
export const EVENT_THUMB_WIDTH = 350;
export const EVENT_THUMB_HEIGHT = 280;
export const EVENT_COVER_RATIO_TOLERANCE = 0.15;

export const EVENT_COVER_ACCEPT = "image/jpeg,image/png,image/webp";

export const EVENT_COVER_SIZE_HINT = `Satu gambar untuk web: minimal ${EVENT_COVER_WIDTH}×${EVENT_COVER_HEIGHT} px (rasio ±15%). Tampil sebagai thumbnail ${EVENT_THUMB_WIDTH}×${EVENT_THUMB_HEIGHT} dan detail ${EVENT_COVER_WIDTH}×${EVENT_COVER_HEIGHT}. Format JPEG, PNG, atau WebP.`;

export function readImageFileDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("INVALID_IMAGE"));
    };
    img.src = url;
  });
}

export async function validateEventCoverImageFile(file: File): Promise<string | null> {
  if (!EVENT_COVER_ACCEPT.split(",").includes(file.type)) {
    return "Gambar sampul hanya mendukung format JPEG, PNG, atau WebP.";
  }
  try {
    const { width, height } = await readImageFileDimensions(file);
    if (width < EVENT_COVER_WIDTH || height < EVENT_COVER_HEIGHT) {
      return `Gambar sampul minimal ${EVENT_COVER_WIDTH}×${EVENT_COVER_HEIGHT} piksel. Ukuran terdeteksi: ${width}×${height}.`;
    }
    const target = EVENT_COVER_WIDTH / EVENT_COVER_HEIGHT;
    const ratio = width / height;
    if (Math.abs(ratio - target) > EVENT_COVER_RATIO_TOLERANCE) {
      return `Rasio gambar disarankan ${EVENT_COVER_WIDTH}:${EVENT_COVER_HEIGHT} (±15%). Ukuran terdeteksi: ${width}×${height}.`;
    }
    return null;
  } catch {
    return "Tidak dapat membaca ukuran gambar. Pastikan file gambar valid.";
  }
}
