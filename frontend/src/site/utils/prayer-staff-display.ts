import { parseEventDateParts } from "./event-display.js";

export function staffFallbackImage(index: number, assetBase: string): string {
  const n = (index % 9) + 1;
  return `${assetBase}/images/resources/team-img1-${n}.jpg`;
}

export function staffRoleLabel(slot: string, taskType: string): string {
  const s = slot.trim();
  const t = taskType.trim();
  if (s && t) return `${s} · ${t}`;
  return s || t || "Petugas ibadah";
}

export function staffContactHref(kontak: string): string | null {
  const raw = kontak.trim();
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.length >= 8) {
    const tel = digits.startsWith("+") ? digits : digits.startsWith("0") ? `+62${digits.slice(1)}` : digits;
    return `tel:${tel}`;
  }
  return null;
}

export function staffWhatsappHref(kontak: string): string | null {
  const raw = kontak.trim();
  if (!raw) return null;
  let digits = raw.replace(/[^\d]/g, "");
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  else if (!digits.startsWith("62")) digits = `62${digits}`;
  if (digits.length < 10) return null;
  return `https://wa.me/${digits}`;
}

/** Badge tanggal dari judul CMS (`17 Mei 2026`). */
export function staffDateBadge(title: string, publishedAt: string | null): { day: string; month: string } {
  const pseudo = title.includes("·") ? title : `${title.trim()} · 00:00`;
  const parts = parseEventDateParts(pseudo, publishedAt);
  return { day: parts.day, month: parts.month };
}
