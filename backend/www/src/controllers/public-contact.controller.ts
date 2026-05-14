import type { Request, Response } from "express";
import { createContactMessage } from "../services/contact-message.service.js";
import { sendContactNotificationEmail } from "../services/mail.service.js";
import { contactBodySchema, contactValidationMessage } from "../utils/contact-validation.js";

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

  const { name, email, phone, message } = parsed.data;
  const phoneVal = phone?.trim() || "";

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
