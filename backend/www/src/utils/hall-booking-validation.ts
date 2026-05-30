import { z } from "zod";

const phoneRegex = /^[+]?[\d\s()-]{8,40}$/;
const timeRegex = /^([01]?\d|2[0-3]):[0-5]\d$/;

export const HALL_EVENT_TYPES = [
  "pernikahan",
  "pengajian",
  "rapat",
  "pelatihan",
  "arisan",
  "lainnya",
] as const;

export const HALL_BOOKING_STATUSES = [
  "pending",
  "reviewed",
  "approved",
  "rejected",
  "cancelled",
] as const;

export const hallBookingCreateSchema = z
  .object({
    hallId: z.string().uuid("Pilih aula yang valid"),
    applicantName: z.string().trim().min(2, "Nama minimal 2 karakter").max(120),
    applicantPhone: z
      .string()
      .trim()
      .regex(phoneRegex, "Format nomor telepon tidak valid (min. 8 digit)"),
    applicantEmail: z
      .union([z.literal(""), z.string().trim().email("Format email tidak valid").max(255)])
      .optional(),
    organization: z.string().trim().max(200).optional(),
    eventType: z.enum(HALL_EVENT_TYPES, { message: "Jenis acara tidak valid" }),
    eventTitle: z.string().trim().min(3, "Judul acara minimal 3 karakter").max(255),
    eventDateStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal mulai tidak valid"),
    eventDateEnd: z
      .union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)])
      .optional(),
    timeStart: z.union([z.literal(""), z.string().regex(timeRegex)]).optional(),
    timeEnd: z.union([z.literal(""), z.string().regex(timeRegex)]).optional(),
    expectedAttendees: z.coerce.number().int().min(1).max(50000).optional(),
    notes: z.string().trim().max(3000).optional(),
    recaptchaToken: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    const end = data.eventDateEnd?.trim() || data.eventDateStart;
    if (end < data.eventDateStart) {
      ctx.addIssue({
        code: "custom",
        path: ["eventDateEnd"],
        message: "Tanggal selesai tidak boleh sebelum tanggal mulai",
      });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(`${data.eventDateStart}T00:00:00`);
    if (start < today) {
      ctx.addIssue({
        code: "custom",
        path: ["eventDateStart"],
        message: "Tanggal acara tidak boleh di masa lalu",
      });
    }
  });

export const hallBookingPatchSchema = z.object({
  status: z.enum(HALL_BOOKING_STATUSES).optional(),
  adminNotes: z.union([z.string().trim().max(4000), z.literal(""), z.null()]).optional(),
});

export type HallBookingCreateBody = z.infer<typeof hallBookingCreateSchema>;

export function hallBookingValidationMessage(err: z.ZodError): string {
  return err.errors[0]?.message ?? "Data formulir tidak valid";
}
