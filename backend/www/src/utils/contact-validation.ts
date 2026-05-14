import { z } from "zod";

const phoneRegex = /^[+]?[\d\s()-]{8,40}$/;

export const contactBodySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama minimal 2 karakter")
    .max(120, "Nama maksimal 120 karakter"),
  email: z.string().trim().email("Format email tidak valid").max(255, "Email terlalu panjang"),
  phone: z
    .union([
      z.literal(""),
      z
        .string()
        .trim()
        .regex(phoneRegex, "Format nomor telepon tidak valid (min. 8 digit)"),
    ])
    .optional(),
  message: z
    .string()
    .trim()
    .min(10, "Pesan minimal 10 karakter")
    .max(5000, "Pesan maksimal 5000 karakter"),
});

export type ContactBody = z.infer<typeof contactBodySchema>;

export function contactValidationMessage(err: z.ZodError): string {
  const first = err.errors[0];
  return first?.message ?? "Data formulir tidak valid";
}
