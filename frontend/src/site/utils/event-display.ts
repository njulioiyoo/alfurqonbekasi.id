const ID_MONTHS: Record<string, number> = {
  januari: 0,
  jan: 0,
  februari: 1,
  feb: 1,
  maret: 2,
  mar: 2,
  april: 3,
  apr: 3,
  mei: 4,
  juni: 5,
  jun: 5,
  juli: 6,
  jul: 6,
  agustus: 7,
  agu: 7,
  agt: 7,
  september: 8,
  sep: 8,
  oktober: 9,
  okt: 9,
  november: 10,
  nov: 10,
  desember: 11,
  des: 11,
};

const MONTH_SHORT_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export type EventDateParts = {
  day: string;
  month: string;
  /** Unix ms (WIB) untuk countdown Vue. */
  targetMs: number | null;
};

/** Waktu lokal WIB → UTC ms (untuk perbandingan dengan Date.now()). */
function wibLocalToUtcMs(year: number, monthIdx: number, day: number, hour: number, minute: number): number {
  return Date.UTC(year, monthIdx, day, hour - 7, minute, 0);
}

/** Parse teks waktu CMS, mis. `17 Mei 2026 · 08:00 WIB`. */
export function parseEventDateParts(waktuMulai: string, publishedAt: string | null): EventDateParts {
  const text = waktuMulai.trim();
  const m = text.match(/(\d{1,2})\s+([A-Za-zÀ-ÿ]+)\s+(\d{4}).*?(\d{1,2})[:.](\d{2})/);
  if (m) {
    const dayNum = Number(m[1]);
    const monthKey = m[2].toLowerCase();
    const year = Number(m[3]);
    const hour = Number(m[4]);
    const minute = Number(m[5]);
    const monthIdx = ID_MONTHS[monthKey];
    if (monthIdx !== undefined && !Number.isNaN(dayNum) && !Number.isNaN(year)) {
      return {
        day: String(dayNum).padStart(2, "0"),
        month: MONTH_SHORT_ID[monthIdx] ?? m[2].slice(0, 3),
        targetMs: wibLocalToUtcMs(year, monthIdx, dayNum, hour, minute),
      };
    }
  }
  if (publishedAt) {
    const fb = new Date(publishedAt);
    if (!Number.isNaN(fb.getTime())) {
      return {
        day: String(fb.getUTCDate()).padStart(2, "0"),
        month: MONTH_SHORT_ID[fb.getUTCMonth()] ?? "—",
        targetMs: fb.getTime(),
      };
    }
  }
  return { day: "—", month: "—", targetMs: null };
}

/** Parse `MM/DD/YYYY HH:mm:ss` sebagai waktu WIB → UTC ms. */
export function parseMmDdYyyyWibTarget(dateStr: string): number | null {
  const m = dateStr.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  const monthIdx = Number(m[1]) - 1;
  const day = Number(m[2]);
  const year = Number(m[3]);
  const hour = Number(m[4]);
  const minute = Number(m[5]);
  if ([monthIdx, day, year, hour, minute].some((n) => Number.isNaN(n))) return null;
  return wibLocalToUtcMs(year, monthIdx, day, hour, minute);
}

export function eventTimeLabel(waktuMulai: string, selesaiBerulang: string): string {
  const start = waktuMulai.trim();
  const end = selesaiBerulang.trim();
  if (start && end) return `${start} · ${end}`;
  return start || end || "—";
}

export function eventFallbackImage(index: number, assetBase: string): string {
  const n = (index % 6) + 1;
  return `${assetBase}/images/resources/event-img${n}.jpg`;
}

export function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

