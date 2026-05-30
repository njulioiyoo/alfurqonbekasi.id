import nodemailer from "nodemailer";
import { listConfigEntries } from "./config.service.js";
import {
  buildContactNotificationHtml,
  buildContactNotificationText,
} from "../utils/contact-mail.template.js";

type MailConfig = {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
  notifyEmail: string;
  siteName: string;
  logoUrl: string;
  websiteUrl: string;
};

async function loadMailConfig(): Promise<MailConfig | null> {
  const rows = await listConfigEntries();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const smtpUser = (map.smtpUser ?? "").trim();
  const smtpPass = (map.smtpPass ?? "").trim();
  const notifyEmail = (map.contactNotifyEmail ?? map.adminEmail ?? "").trim();
  if (!smtpUser || !smtpPass || !notifyEmail) return null;

  const port = Number.parseInt((map.smtpPort ?? "587").trim(), 10);
  return {
    smtpHost: (map.smtpHost ?? "smtp.gmail.com").trim() || "smtp.gmail.com",
    smtpPort: Number.isFinite(port) ? port : 587,
    smtpUser,
    smtpPass,
    smtpFrom: (map.smtpFrom ?? smtpUser).trim() || smtpUser,
    notifyEmail,
    siteName: (map.websiteName ?? map.siteTitle ?? "Masjid Alfurqon Bekasi").trim(),
    logoUrl: (map.logoUrl ?? "").trim(),
    websiteUrl: (map.websiteUrl ?? "").trim(),
  };
}

export type ContactMailPayload = {
  name: string;
  email: string;
  phone: string;
  message: string;
};

function friendlySmtpError(err: unknown): string {
  const e = err as { code?: string; response?: string; message?: string };
  const blob = `${e.response ?? ""} ${e.message ?? ""}`.toLowerCase();

  if (
    e.code === "EAUTH" ||
    blob.includes("application-specific password") ||
    blob.includes("invalidsecondfactor")
  ) {
    return "Gmail menolak login: gunakan App Password (bukan password login biasa). Aktifkan 2-Step Verification di Google Account, lalu buat App Password di https://myaccount.google.com/apppasswords";
  }
  if (blob.includes("username and password not accepted") || blob.includes("bad credentials")) {
    return "SMTP user atau password salah. Untuk Gmail pastikan memakai App Password 16 karakter.";
  }
  if (blob.includes("self signed certificate") || blob.includes("certificate")) {
    return "Gagal verifikasi sertifikat SMTP. Coba port 587 (TLS) atau 465 (SSL).";
  }

  return e.message ?? "Gagal mengirim email";
}

export async function sendContactNotificationEmail(
  payload: ContactMailPayload
): Promise<{ sent: boolean; error?: string }> {
  const cfg = await loadMailConfig();
  if (!cfg) {
    return { sent: false, error: "SMTP belum dikonfigurasi (smtpUser, smtpPass, atau email tujuan kosong)" };
  }

  const transporter = nodemailer.createTransport({
    host: cfg.smtpHost,
    port: cfg.smtpPort,
    secure: cfg.smtpPort === 465,
    auth: { user: cfg.smtpUser, pass: cfg.smtpPass },
  });

  const branding = {
    siteName: cfg.siteName,
    logoUrl: cfg.logoUrl,
    websiteUrl: cfg.websiteUrl,
  };

  try {
    await transporter.sendMail({
      from: cfg.smtpFrom,
      to: cfg.notifyEmail,
      replyTo: payload.email || undefined,
      subject: `[Kontak Website] Pesan dari ${payload.name}`,
      text: buildContactNotificationText(payload, branding),
      html: buildContactNotificationHtml(payload, branding),
    });
    return { sent: true };
  } catch (e) {
    const msg = friendlySmtpError(e);
    console.error("sendContactNotificationEmail:", e);
    return { sent: false, error: msg };
  }
}

export type HallBookingMailPayload = {
  hallName: string;
  applicantName: string;
  applicantPhone: string;
  applicantEmail: string;
  organization: string;
  eventType: string;
  eventTitle: string;
  eventDateStart: string;
  eventDateEnd: string;
  timeStart: string;
  timeEnd: string;
  expectedAttendees: number | null;
  notes: string;
};

export async function sendHallBookingNotificationEmail(
  payload: HallBookingMailPayload
): Promise<{ sent: boolean; error?: string }> {
  const cfg = await loadMailConfig();
  if (!cfg) {
    return { sent: false, error: "SMTP belum dikonfigurasi" };
  }

  const transporter = nodemailer.createTransport({
    host: cfg.smtpHost,
    port: cfg.smtpPort,
    secure: cfg.smtpPort === 465,
    auth: { user: cfg.smtpUser, pass: cfg.smtpPass },
  });

  const lines = [
    `Pengajuan penyewaan aula baru — ${cfg.siteName}`,
    "",
    `Aula: ${payload.hallName}`,
    `Acara: ${payload.eventTitle} (${payload.eventType})`,
    `Tanggal: ${payload.eventDateStart}${payload.eventDateEnd !== payload.eventDateStart ? ` s/d ${payload.eventDateEnd}` : ""}`,
    payload.timeStart ? `Jam: ${payload.timeStart}${payload.timeEnd ? ` – ${payload.timeEnd}` : ""}` : "",
    payload.expectedAttendees ? `Perkiraan tamu: ${payload.expectedAttendees}` : "",
    "",
    `Pemohon: ${payload.applicantName}`,
    `Telepon: ${payload.applicantPhone}`,
    payload.applicantEmail ? `Email: ${payload.applicantEmail}` : "",
    payload.organization ? `Organisasi: ${payload.organization}` : "",
    payload.notes ? `\nCatatan:\n${payload.notes}` : "",
  ].filter(Boolean);

  try {
    await transporter.sendMail({
      from: cfg.smtpFrom,
      to: cfg.notifyEmail,
      replyTo: payload.applicantEmail || undefined,
      subject: `[Penyewaan Aula] ${payload.eventTitle} — ${payload.hallName}`,
      text: lines.join("\n"),
      html: `<pre style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5">${lines.join("\n").replace(/</g, "&lt;")}</pre>`,
    });
    return { sent: true };
  } catch (e) {
    const msg = friendlySmtpError(e);
    console.error("sendHallBookingNotificationEmail:", e);
    return { sent: false, error: msg };
  }
}
