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

function wibLocalToUtcMs(year: number, monthIdx: number, day: number, hour: number, minute: number): number {
  return Date.UTC(year, monthIdx, day, hour - 7, minute, 0);
}

/** Parse Attr3 waktu mulai CMS → UTC ms (WIB). */
export function parseEventTargetMs(attr3: string | null | undefined, publishedAt: Date | null): number | null {
  const text = (attr3 ?? "").trim();
  const m = text.match(/(\d{1,2})\s+([A-Za-zÀ-ÿ]+)\s+(\d{4}).*?(\d{1,2})[:.](\d{2})/);
  if (m) {
    const dayNum = Number(m[1]);
    const monthKey = m[2].toLowerCase();
    const year = Number(m[3]);
    const hour = Number(m[4]);
    const minute = Number(m[5]);
    const monthIdx = ID_MONTHS[monthKey];
    if (monthIdx !== undefined && !Number.isNaN(dayNum) && !Number.isNaN(year)) {
      return wibLocalToUtcMs(year, monthIdx, dayNum, hour, minute);
    }
  }
  if (publishedAt && !Number.isNaN(publishedAt.getTime())) {
    return publishedAt.getTime();
  }
  return null;
}

type EventSortRow = {
  attr_3: string | null;
  published_at: Date | null;
};

/**
 * Urutan publik jadwal: akan datang (countdown) dulu, terdekat di atas;
 * lalu yang sudah lewat, terbaru di atas; tanpa tanggal pakai published_at.
 */
export function comparePublicEvents(a: EventSortRow, b: EventSortRow): number {
  const now = Date.now();
  const ta = parseEventTargetMs(a.attr_3, a.published_at);
  const tb = parseEventTargetMs(b.attr_3, b.published_at);

  const aUpcoming = ta != null && ta > now;
  const bUpcoming = tb != null && tb > now;

  if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;

  if (aUpcoming && bUpcoming && ta != null && tb != null) {
    return ta - tb;
  }

  if (ta != null && tb != null) {
    return tb - ta;
  }
  if (ta != null) return -1;
  if (tb != null) return 1;

  const pa = a.published_at?.getTime() ?? 0;
  const pb = b.published_at?.getTime() ?? 0;
  return pb - pa;
}

const PRAYER_SLOT_ORDER: Record<string, number> = {
  jumat: 0,
  subuh: 1,
  dzuhur: 2,
  ashar: 3,
  maghrib: 4,
  isya: 5,
};

/** Parse judul CMS petugas, mis. `17 Mei 2026`. */
export function parseTitleDateMs(title: string, publishedAt: Date | null): number | null {
  const text = title.trim();
  const m = text.match(/(\d{1,2})\s+([A-Za-zÀ-ÿ]+)\s+(\d{4})/);
  if (m) {
    const dayNum = Number(m[1]);
    const monthKey = m[2].toLowerCase();
    const year = Number(m[3]);
    const monthIdx = ID_MONTHS[monthKey];
    if (monthIdx !== undefined && !Number.isNaN(dayNum) && !Number.isNaN(year)) {
      return wibLocalToUtcMs(year, monthIdx, dayNum, 0, 0);
    }
  }
  if (publishedAt && !Number.isNaN(publishedAt.getTime())) {
    return publishedAt.getTime();
  }
  return null;
}

function prayerSlotRank(slot: string | null | undefined): number {
  const key = (slot ?? "").trim().toLowerCase();
  return PRAYER_SLOT_ORDER[key] ?? 99;
}

type PrayerSortRow = {
  title: string;
  attr_1: string | null;
  published_at: Date | null;
};

/** Jadwal petugas: tanggal terdekat / akan datang dulu, lalu urutan waktu shalat. */
export function comparePublicPrayerStaff(a: PrayerSortRow, b: PrayerSortRow): number {
  const now = Date.now();
  const ta = parseTitleDateMs(a.title, a.published_at);
  const tb = parseTitleDateMs(b.title, b.published_at);

  const aUpcoming = ta != null && ta > now;
  const bUpcoming = tb != null && tb > now;
  if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;

  if (ta != null && tb != null && ta !== tb) {
    return aUpcoming ? ta - tb : tb - ta;
  }

  const sa = prayerSlotRank(a.attr_1);
  const sb = prayerSlotRank(b.attr_1);
  if (sa !== sb) return sa - sb;

  if (ta != null && tb != null) return tb - ta;

  const pa = a.published_at?.getTime() ?? 0;
  const pb = b.published_at?.getTime() ?? 0;
  return pb - pa;
}
