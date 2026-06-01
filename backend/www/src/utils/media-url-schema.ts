import { z } from "zod";

/** Path relatif dari API upload (`/api/uploads/...` atau `/uploads/...`) atau URL absolut. */
const storedMediaUrl = z.union([
  z.literal(""),
  z.null(),
  z
    .string()
    .trim()
    .regex(/^\/(?:api\/)?uploads\/[a-zA-Z0-9._/-]+$/, "Path file upload tidak valid"),
  z.string().trim().url(),
]);

export const optionalStoredMediaUrlSchema = storedMediaUrl.optional();
