import { z } from "zod";

export const hallSlugSchema = z
  .string()
  .trim()
  .min(2)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug hanya huruf kecil, angka, dan tanda hubung");

function coerceAmenities(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const s = item.trim();
    if (s) out.push(s.slice(0, 120));
  }
  return out.slice(0, 30);
}

export const hallWriteSchema = z.object({
  name: z.string().trim().min(2).max(255),
  slug: hallSlugSchema.optional(),
  capacity: z.union([z.coerce.number().int().min(1).max(100000), z.null()]).optional(),
  description: z.union([z.string().trim().max(5000), z.literal(""), z.null()]).optional(),
  coverImageUrl: z.union([z.string().trim().max(2000), z.literal(""), z.null()]).optional(),
  amenities: z.array(z.string()).optional().default([]),
  isActive: z.coerce.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

export const hallCreateSchema = hallWriteSchema;
export const hallPatchSchema = hallWriteSchema.partial();

export const hallSyncItemSchema = hallWriteSchema.extend({
  id: z.string().uuid().optional(),
});

export const hallSyncSchema = z.object({
  items: z.array(hallSyncItemSchema).max(50),
});

export function parseHallAmenities(raw: unknown): string[] {
  return coerceAmenities(raw);
}

export function hallValidationMessage(err: z.ZodError): string {
  const first = err.issues[0];
  return first?.message || "Data tidak valid";
}

export function slugifyHallName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100) || "aula";
}
