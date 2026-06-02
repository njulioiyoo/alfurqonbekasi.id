import type { Request, Response } from "express";
import { listActiveHalls, getActiveHallById } from "../services/hall.service.js";
import {
  createHallBooking,
  listApprovedDateRangesForHall,
} from "../services/hall-booking.service.js";
import { listConfigEntries } from "../services/config.service.js";
import { sendHallBookingNotificationEmail } from "../services/mail.service.js";
import {
  hallBookingCreateSchema,
  hallBookingValidationMessage,
} from "../utils/hall-booking-validation.js";
import { verifyRecaptchaToken } from "../utils/recaptcha.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function configMap(): Promise<Record<string, string>> {
  const rows = await listConfigEntries();
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  return map;
}

export async function getPublicHalls(_req: Request, res: Response): Promise<void> {
  try {
    const halls = await listActiveHalls();
    res.json({
      ok: true,
      data: {
        items: halls.map((h) => ({
          id: h.id,
          name: h.name,
          slug: h.slug,
          capacity: h.capacity,
          description: h.description ?? "",
          coverImageUrl: h.cover_image_url ?? "",
          amenities: Array.isArray(h.amenities_json)
            ? (h.amenities_json as string[])
            : [],
        })),
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}

export async function getPublicHallAvailability(req: Request, res: Response): Promise<void> {
  const hallId = typeof req.query.hallId === "string" ? req.query.hallId.trim() : "";
  if (!hallId) {
    res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: "hallId wajib" } });
    return;
  }
  if (!UUID_RE.test(hallId)) {
    res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: "hallId tidak valid" } });
    return;
  }
  try {
    const hall = await getActiveHallById(hallId);
    if (!hall) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Aula tidak ditemukan" } });
      return;
    }
    const ranges = await listApprovedDateRangesForHall(hallId);
    res.json({ ok: true, data: { hallId, approvedRanges: ranges } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}

export async function postPublicHallBooking(req: Request, res: Response): Promise<void> {
  const parsed = hallBookingCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: hallBookingValidationMessage(parsed.error),
        details: parsed.error.flatten(),
      },
    });
    return;
  }

  const data = parsed.data;
  const hall = await getActiveHallById(data.hallId);
  if (!hall) {
    res.status(400).json({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Aula tidak tersedia atau tidak ditemukan" },
    });
    return;
  }

  const cfg = await configMap();
  const recaptchaSiteKey = (cfg.recaptchaSiteKey || "").trim();
  const recaptchaSecret = (cfg.recaptchaSecretKey || "").trim();
  if (recaptchaSiteKey) {
    if (!recaptchaSecret) {
      res.status(503).json({
        ok: false,
        error: {
          code: "RECAPTCHA_MISCONFIGURED",
          message: "reCAPTCHA belum dikonfigurasi lengkap di CMS.",
        },
      });
      return;
    }
    if (!data.recaptchaToken) {
      res.status(400).json({
        ok: false,
        error: { code: "RECAPTCHA_REQUIRED", message: "Selesaikan verifikasi reCAPTCHA." },
      });
      return;
    }
    const captcha = await verifyRecaptchaToken(recaptchaSecret, data.recaptchaToken);
    if (!captcha.ok) {
      res.status(400).json({
        ok: false,
        error: { code: "RECAPTCHA_FAILED", message: "Verifikasi reCAPTCHA gagal." },
      });
      return;
    }
  }

  const eventDateEnd = data.eventDateEnd?.trim() || data.eventDateStart;
  const email = data.applicantEmail?.trim() || "";

  try {
    const row = await createHallBooking({
      hallId: data.hallId,
      applicantName: data.applicantName,
      applicantPhone: data.applicantPhone,
      applicantEmail: email || null,
      organization: data.organization?.trim() || null,
      eventType: data.eventType,
      eventTitle: data.eventTitle,
      eventDateStart: data.eventDateStart,
      eventDateEnd,
      timeStart: data.timeStart?.trim() || null,
      timeEnd: data.timeEnd?.trim() || null,
      expectedAttendees: data.expectedAttendees ?? null,
      notes: data.notes?.trim() || null,
      emailSent: false,
      emailError: null,
    });

    let emailSent = false;
    try {
      const mail = await sendHallBookingNotificationEmail({
        hallName: hall.name,
        applicantName: data.applicantName,
        applicantPhone: data.applicantPhone,
        applicantEmail: email,
        organization: data.organization?.trim() || "",
        eventType: data.eventType,
        eventTitle: data.eventTitle,
        eventDateStart: data.eventDateStart,
        eventDateEnd,
        timeStart: data.timeStart?.trim() || "",
        timeEnd: data.timeEnd?.trim() || "",
        expectedAttendees: data.expectedAttendees ?? null,
        notes: data.notes?.trim() || "",
      });
      emailSent = mail.sent;
    } catch (mailErr) {
      console.error("hall booking notification email:", mailErr);
    }

    res.status(201).json({
      ok: true,
      data: { id: row.id, emailSent },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" } });
  }
}
