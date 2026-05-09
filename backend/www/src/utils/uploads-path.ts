import { join } from "node:path";

/** Lokasi writable di container (user `node` tidak boleh menulis ke `/app`). */
export function uploadsRootDir(): string {
  return process.env.UPLOADS_DIR?.trim() || join("/tmp", "alfurqon-uploads");
}
