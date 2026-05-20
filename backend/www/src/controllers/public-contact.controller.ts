import type { Request, Response } from "express";
import { createContactMessage } from "../services/contact-message.service.js";
import { listConfigEntries } from "../services/config.service.js";
import { sendContactNotificationEmail } from "../services/mail.service.js";
import { contactBodySchema, contactValidationMessage } from "../utils/contact-validation.js";
import { verifyRecaptchaToken } from "../utils/recaptcha.js";

async function configMap(): Promise<Record<string, string>> {
  const rows = await listConfigEntries();
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  return map;
}

export async function postPublicContact(req: Request, res: Response): Promise<void> {
  const parsed = contactBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: contactValidationMessage(parsed.error),
        details: parsed.error.flatten(),
      },
    });
    return;
  }

  const { name, email, phone, message, recaptchaToken } = parsed.data;
  const phoneVal = phone?.trim() || "";

  const cfg = await configMap();
  const recaptchaSiteKey = (cfg.recaptchaSiteKey || "").trim();
  const recaptchaSecret = (cfg.recaptchaSecretKey || "").trim();
  if (recaptchaSiteKey) {
    if (!recaptchaSecret) {
      res.status(503).json({
        ok: false,
        error: {
          code: "RECAPTCHA_MISCONFIGURED",
          message: "reCAPTCHA belum dikonfigurasi lengkap di CMS (butuh Secret Key).",
        },
      });
      return;
    }
    if (!recaptchaToken) {
      res.status(400).json({
        ok: false,
        error: { code: "RECAPTCHA_REQUIRED", message: "Selesaikan verifikasi reCAPTCHA." },
      });
      return;
    }
    const captcha = await verifyRecaptchaToken(recaptchaSecret, recaptchaToken);
    if (!captcha.ok) {
      res.status(400).json({
        ok: false,
        error: {
          code: "RECAPTCHA_FAILED",
          message: "Verifikasi reCAPTCHA gagal. Muat ulang halaman dan coba lagi.",
        },
      });
      return;
    }
  }

  try {
    const mail = await sendContactNotificationEmail({
      name,
      email,
      phone: phoneVal,
      message,
    });

    const row = await createContactMessage({
      name,
      email,
      phone: phoneVal || null,
      message,
      emailSent: mail.sent,
      emailError: mail.error ?? null,
    });

    res.status(201).json({
      ok: true,
      data: {
        id: row.id,
        emailSent: mail.sent,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" },
    });
  }
}
