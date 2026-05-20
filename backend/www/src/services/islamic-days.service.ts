import { listConfigEntries } from "./config.service.js";

export type IslamicDayItem = {
  title: string;
  month: string;
  day: number;
  subtitle: string;
  dateIso: string;
  link: string;
};

const DEFAULT_SOURCE_URL = "https://www.islamicfinder.org/specialislamicdays/";

/** Cadangan jika struktur HTML IslamicFinder berubah (tahun 2026). */
export const FALLBACK_ISLAMIC_DAYS: IslamicDayItem[] = [
  { title: "Ramadan", month: "February", day: 18, subtitle: "Wednesday, 1st Ramadan, 1447h", dateIso: "2026-02-18", link: "https://www.islamicfinder.org/ramadan/" },
  { title: "Laylat al qadr", month: "March", day: 9, subtitle: "Monday, 20th Ramadan, 1447h", dateIso: "2026-03-09", link: "https://www.islamicfinder.org/special-islamic-days/laylat-al-qadr-2020/" },
  { title: "Eid ul Fitr", month: "March", day: 20, subtitle: "Friday, 1st Shawwal, 1447h", dateIso: "2026-03-20", link: "https://www.islamicfinder.org/special-islamic-days/eid-ul-fitr-2020/" },
  { title: "Hajj", month: "May", day: 25, subtitle: "Monday, 8th Dhul Hijjah, 1447h", dateIso: "2026-05-25", link: "https://www.islamicfinder.org/hajj-guide/" },
  { title: "Eid ul Adha", month: "May", day: 27, subtitle: "Wednesday, 10th Dhul Hijjah, 1447h", dateIso: "2026-05-27", link: "https://www.islamicfinder.org/special-islamic-days/eid-al-adha-/" },
  { title: "Muharram", month: "June", day: 16, subtitle: "Tuesday, 1st Muharram, 1448h", dateIso: "2026-06-16", link: "https://www.islamicfinder.org/special-islamic-days/muharram-2020/" },
  { title: "Ashura", month: "June", day: 25, subtitle: "Thursday, 10th Muharram, 1448h", dateIso: "2026-06-25", link: "https://www.islamicfinder.org/special-islamic-days/ashura-2020/" },
];
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const MONTH_NAMES =
  "January|February|March|April|May|June|July|August|September|October|November|December";
const MONTH_INDEX: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

let cache: { at: number; items: IslamicDayItem[]; year: number } | null = null;

async function getIslamicDaysSourceUrl(): Promise<string> {
  try {
    const rows = await listConfigEntries();
    const row = rows.find((r) => r.key === "islamicDaysUrl");
    const url = (row?.value || "").trim();
    return url || DEFAULT_SOURCE_URL;
  } catch {
    return DEFAULT_SOURCE_URL;
  }
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function detectYear(html: string, fallback: number): number {
  const m = html.match(/\b(20\d{2})\s*\(\s*\d{3,4}\s*-\s*\d{3,4}\s*A\.?H\.?\s*\)/i);
  if (m) return parseInt(m[1], 10);
  const y = html.match(/\b(20\d{2})\b/);
  return y ? parseInt(y[1], 10) : fallback;
}

/** Parse halaman widget IslamicFinder (specialislamicdays). */
export function parseIslamicDaysHtml(html: string): { year: number; items: IslamicDayItem[] } {
  const year = detectYear(html, new Date().getFullYear());
  const items: IslamicDayItem[] = [];
  const seen = new Set<string>();

  const blockRe = new RegExp(
    `(?:>|\\b)(${MONTH_NAMES})(?:<|\\b)[^\\d]{0,48}(\\d{1,2})[\\s\\S]{0,500}?<h[2-6][^>]*>\\s*([^<]+?)\\s*</h[2-6]>[\\s\\S]{0,220}?<h[4-6][^>]*>\\s*([^<]+?)\\s*</h[4-6]>`,
    "gi"
  );

  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(html)) !== null) {
    const month = m[1];
    const day = parseInt(m[2], 10);
    const title = decodeHtml(m[3]);
    const subtitle = decodeHtml(m[4]);
    const dateIso = formatDateIso(year, month, day);
    if (!dateIso || !title) continue;
    const key = `${dateIso}|${title}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const chunk = html.slice(m.index, m.index + 700);
    const linkMatch = chunk.match(/<a[^>]+href="([^"]+)"/i);
    let link = linkMatch?.[1] ? decodeHtml(linkMatch[1]) : "";
    if (link && !link.startsWith("http")) {
      link = `https://www.islamicfinder.org${link.startsWith("/") ? link : `/${link}`}`;
    }

    items.push({
      title,
      month,
      day,
      subtitle,
      dateIso,
      link,
    });
  }

  if (items.length === 0) {
    const altRe = new RegExp(
      `(${MONTH_NAMES})[^\\d]{0,24}(\\d{1,2})[\\s\\S]{0,350}?<h[2-6][^>]*>\\s*<a[^>]*>\\s*([^<]+?)\\s*</a>[\\s\\S]{0,200}?<h[4-6][^>]*>\\s*([^<]+?)\\s*</h[4-6]>`,
      "gi"
    );
    while ((m = altRe.exec(html)) !== null) {
      const month = m[1];
      const day = parseInt(m[2], 10);
      const title = decodeHtml(m[3]);
      const subtitle = decodeHtml(m[4]);
      const dateIso = formatDateIso(year, month, day);
      if (!title || !dateIso) continue;
      const key = `${dateIso}|${title}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const chunk = html.slice(m.index, m.index + 700);
      const linkMatch = chunk.match(/<a[^>]+href="([^"]+)"/i);
      let link = linkMatch?.[1] ? decodeHtml(linkMatch[1]) : "";
      if (link && !link.startsWith("http")) {
        link = `https://www.islamicfinder.org${link.startsWith("/") ? link : `/${link}`}`;
      }
      items.push({ title, month, day, subtitle, dateIso, link });
    }
  }

  items.sort((a, b) => a.dateIso.localeCompare(b.dateIso));
  return { year, items };
}

function formatDateIso(year: number, month: string, day: number): string {
  const mi = MONTH_INDEX[month.toLowerCase()];
  if (mi === undefined) return "";
  return `${year}-${String(mi + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Ambil N tanggal terbaru (urut menurun), mis. 4 dari 7 entri IslamicFinder. */
export function pickLatestIslamicDays(items: IslamicDayItem[], limit: number): IslamicDayItem[] {
  return [...items].sort((a, b) => b.dateIso.localeCompare(a.dateIso)).slice(0, limit);
}

async function fetchSourceHtml(sourceUrl: string): Promise<string> {
  const res = await fetch(sourceUrl, {
    headers: {
      "User-Agent": "AlfurqonMasjidSite/1.0 (+https://alfurqonbekasi.id)",
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`IslamicFinder HTTP ${res.status}`);
  return res.text();
}

async function loadAllItems(): Promise<IslamicDayItem[]> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.items;

  const sourceUrl = await getIslamicDaysSourceUrl();

  try {
    const html = await fetchSourceHtml(sourceUrl);
    const { items } = parseIslamicDaysHtml(html);
    if (items.length > 0) {
      cache = { at: now, items, year: detectYear(html, new Date().getFullYear()) };
      return items;
    }
  } catch (e) {
    console.error("[islamic-days] fetch/parse gagal:", e);
  }

  if (cache?.items.length) return cache.items;
  cache = { at: now, items: [...FALLBACK_ISLAMIC_DAYS], year: 2026 };
  return cache.items;
}

export async function getLatestIslamicDays(limit = 4): Promise<{
  year: number;
  items: IslamicDayItem[];
  sourceUrl: string;
}> {
  const sourceUrl = await getIslamicDaysSourceUrl();
  const all = await loadAllItems();
  const year = cache?.year ?? new Date().getFullYear();
  return {
    year,
    items: pickLatestIslamicDays(all, limit),
    sourceUrl,
  };
}
