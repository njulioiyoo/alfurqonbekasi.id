import type { ContactMailPayload } from "../services/mail.service.js";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function absoluteAssetUrl(baseUrl: string, path: string): string {
  const p = path.trim();
  if (!p) return "";
  if (/^https?:\/\//i.test(p)) return p;
  const base = baseUrl.replace(/\/+$/, "");
  return `${base}${p.startsWith("/") ? p : `/${p}`}`;
}

export type ContactMailBranding = {
  siteName: string;
  logoUrl: string;
  websiteUrl: string;
};

export function buildContactNotificationHtml(
  payload: ContactMailPayload,
  branding: ContactMailBranding
): string {
  const siteName = escapeHtml(branding.siteName || "Masjid Alfurqon Bekasi");
  const logoSrc = absoluteAssetUrl(branding.websiteUrl, branding.logoUrl);
  const name = escapeHtml(payload.name);
  const email = escapeHtml(payload.email);
  const phone = payload.phone ? escapeHtml(payload.phone) : "";
  const message = escapeHtml(payload.message).replace(/\n/g, "<br />");
  const year = new Date().getFullYear();

  const logoBlock = logoSrc
    ? `<img src="${escapeHtml(logoSrc)}" alt="${siteName}" style="display:block;margin:0 auto 12px;max-height:72px;width:auto;height:auto;" />`
    : `<div style="font-size:22px;font-weight:700;color:#ffffff;">${siteName}</div>`;

  const phoneRow = phone
    ? `<tr>
                  <td style="padding:14px 18px;background:#f7faf8;border-bottom:1px solid #e8ecea;font-size:13px;font-weight:700;color:#0d7a44;">Telepon</td>
                  <td style="padding:14px 18px;border-bottom:1px solid #e8ecea;font-size:14px;">${phone}</td>
                </tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="id">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#eef2f0;font-family:Arial,Helvetica,sans-serif;color:#333;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef2f0;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#0d7a44,#12a35c);padding:28px 32px;text-align:center;">
            ${logoBlock}
            <div style="font-size:13px;color:rgba(255,255,255,0.9);text-transform:uppercase;letter-spacing:1px;">Pesan Kontak Website</div>
            <div style="font-size:20px;font-weight:700;color:#fff;margin-top:6px;">${siteName}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#555;">Ada pengunjung yang mengirim pesan melalui formulir kontak. Berikut detailnya:</p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e8ecea;border-radius:8px;overflow:hidden;">
              <tr>
                <td style="padding:14px 18px;background:#f7faf8;border-bottom:1px solid #e8ecea;width:120px;font-size:13px;font-weight:700;color:#0d7a44;">Nama</td>
                <td style="padding:14px 18px;border-bottom:1px solid #e8ecea;font-size:14px;">${name}</td>
              </tr>
              <tr>
                <td style="padding:14px 18px;background:#f7faf8;border-bottom:1px solid #e8ecea;font-size:13px;font-weight:700;color:#0d7a44;">Email</td>
                <td style="padding:14px 18px;border-bottom:1px solid #e8ecea;font-size:14px;"><a href="mailto:${email}" style="color:#0d7a44;text-decoration:none;">${email}</a></td>
              </tr>
              ${phoneRow}
              <tr>
                <td style="padding:14px 18px;background:#f7faf8;vertical-align:top;font-size:13px;font-weight:700;color:#0d7a44;">Pesan</td>
                <td style="padding:14px 18px;font-size:14px;line-height:1.7;">${message}</td>
              </tr>
            </table>
            <p style="margin:24px 0 0;font-size:13px;color:#888;text-align:center;">Balas langsung ke pengirim dengan menekan <strong>Reply</strong> pada email ini.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 32px;background:#f7faf8;border-top:1px solid #e8ecea;text-align:center;font-size:12px;color:#999;">&copy; ${year} ${siteName} — Notifikasi otomatis dari website</td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function buildContactNotificationText(
  payload: ContactMailPayload,
  branding: ContactMailBranding
): string {
  const siteName = branding.siteName || "Masjid Alfurqon Bekasi";
  return [
    `Pesan kontak baru — ${siteName}`,
    "",
    `Nama: ${payload.name}`,
    `Email: ${payload.email}`,
    payload.phone ? `Telepon: ${payload.phone}` : null,
    "",
    "Pesan:",
    payload.message,
  ]
    .filter((l): l is string => l !== null)
    .join("\n");
}
