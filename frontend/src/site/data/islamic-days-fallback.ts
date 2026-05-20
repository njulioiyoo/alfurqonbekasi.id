import type { IslamicDayItem } from "../api.js";

/** Cadangan jika API belum di-deploy / IslamicFinder tidak terjangkau. */
export const ISLAMIC_DAYS_FALLBACK: IslamicDayItem[] = [
  { title: "Ramadan", month: "February", day: 18, subtitle: "Wednesday, 1st Ramadan, 1447h", dateIso: "2026-02-18", link: "https://www.islamicfinder.org/ramadan/" },
  { title: "Laylat al qadr", month: "March", day: 9, subtitle: "Monday, 20th Ramadan, 1447h", dateIso: "2026-03-09", link: "https://www.islamicfinder.org/special-islamic-days/laylat-al-qadr-2020/" },
  { title: "Eid ul Fitr", month: "March", day: 20, subtitle: "Friday, 1st Shawwal, 1447h", dateIso: "2026-03-20", link: "https://www.islamicfinder.org/special-islamic-days/eid-ul-fitr-2020/" },
  { title: "Hajj", month: "May", day: 25, subtitle: "Monday, 8th Dhul Hijjah, 1447h", dateIso: "2026-05-25", link: "https://www.islamicfinder.org/hajj-guide/" },
  { title: "Eid ul Adha", month: "May", day: 27, subtitle: "Wednesday, 10th Dhul Hijjah, 1447h", dateIso: "2026-05-27", link: "https://www.islamicfinder.org/special-islamic-days/eid-al-adha-/" },
  { title: "Muharram", month: "June", day: 16, subtitle: "Tuesday, 1st Muharram, 1448h", dateIso: "2026-06-16", link: "https://www.islamicfinder.org/special-islamic-days/muharram-2020/" },
  { title: "Ashura", month: "June", day: 25, subtitle: "Thursday, 10th Muharram, 1448h", dateIso: "2026-06-25", link: "https://www.islamicfinder.org/special-islamic-days/ashura-2020/" },
];

export function pickLatestIslamicDaysFallback(limit = 4): IslamicDayItem[] {
  return [...ISLAMIC_DAYS_FALLBACK]
    .sort((a, b) => b.dateIso.localeCompare(a.dateIso))
    .slice(0, limit);
}
