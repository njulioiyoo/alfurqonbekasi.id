import { pickLatestIslamicDaysFallback } from "./data/islamic-days-fallback.js";

const BASE = "/api/public";

/** Slide banner beranda (JSON `homeBannersJson` di CMS). */
export type HomeBannerSlide = {
  imageUrl: string;
  title: string;
  subtitle?: string;
  /** URL tombol "Selengkapnya" — bisa path internal (/donasi) atau https://… */
  linkUrl?: string;
  linkLabel?: string;
};

export interface SiteConfig {
  websiteName: string;
  websiteTagline: string;
  websiteUrl: string;
  adminEmail: string;
  adminPhone: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  siteTitle: string;
  logoUrl: string;
  logoLightUrl: string;
  faviconUrl: string;
  footerText: string;
  igUrl: string;
  ytUrl: string;
  fbUrl: string;
  xUrl: string;
  tiktokUrl: string;
  waChannelUrl: string;
  mapsEmbedUrl: string;
  islamicDaysUrl: string;
  gaMeasurementId: string;
  gtmContainerId: string;
  recaptchaSiteKey: string;
  visi: string;
  misi: string;
  homeBanners: HomeBannerSlide[];
  maintenanceMode: boolean;
}

function readBool(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined || raw === "") return fallback;
  const v = raw.trim().toLowerCase();
  if (v === "true" || v === "1" || v === "yes") return true;
  if (v === "false" || v === "0" || v === "no") return false;
  return fallback;
}

function parseHomeBannersJson(raw: string | undefined): HomeBannerSlide[] {
  if (!raw?.trim()) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    const out: HomeBannerSlide[] = [];
    for (const row of data) {
      if (!row || typeof row !== "object") continue;
      const o = row as Record<string, unknown>;
      const imageUrl = typeof o.imageUrl === "string" ? o.imageUrl.trim() : "";
      if (!imageUrl) continue;
      out.push({
        imageUrl,
        title: typeof o.title === "string" ? o.title : "",
        subtitle: typeof o.subtitle === "string" ? o.subtitle : "",
        linkUrl: typeof o.linkUrl === "string" ? o.linkUrl.trim() : "",
        linkLabel: typeof o.linkLabel === "string" ? o.linkLabel.trim() : "",
      });
    }
    return out;
  } catch {
    return [];
  }
}

export async function getPublicConfig(): Promise<SiteConfig> {
  const defaults: SiteConfig = {
    websiteName: "Masjid Alfurqon Bekasi",
    websiteTagline: "Pusat Informasi & Kegiatan Masjid",
    websiteUrl: "",
    adminEmail: "",
    adminPhone: "",
    address: "",
    city: "Bekasi",
    province: "Jawa Barat",
    postalCode: "",
    siteTitle: "Masjid Alfurqon Bekasi",
    logoUrl: "",
    logoLightUrl: "",
    faviconUrl: "",
    footerText: "",
    igUrl: "",
    ytUrl: "",
    fbUrl: "",
    xUrl: "",
    tiktokUrl: "",
    waChannelUrl: "",
    mapsEmbedUrl: "",
    islamicDaysUrl: "https://www.islamicfinder.org/specialislamicdays/",
    gaMeasurementId: "",
    gtmContainerId: "",
    recaptchaSiteKey: "",
    visi: "",
    misi: "",
    homeBanners: [],
    maintenanceMode: false,
  };

  try {
    const res = await fetch(`${BASE}/config`);
    const json = await res.json();
    if (!json.ok || !json.data?.values) return defaults;
    const v = json.data.values as Record<string, string>;
    for (const key of Object.keys(defaults) as (keyof SiteConfig)[]) {
      if (key === "homeBanners") continue;
      if (v[key] !== undefined && v[key] !== "") {
        (defaults[key] as string) = v[key];
      }
    }
    defaults.homeBanners = parseHomeBannersJson(v.homeBannersJson);
    defaults.maintenanceMode = readBool(v.maintenanceMode, false);
  } catch { /* fallback to defaults */ }

  return defaults;
}

export type SubmitContactBody = {
  name: string;
  email: string;
  phone?: string;
  message: string;
  recaptchaToken?: string;
};

export type PublicContentItem = {
  id: string;
  type: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImageUrl: string;
  publishedAt: string | null;
  sortOrder: number;
  isFeatured: boolean;
  attr1: string;
  attr2: string;
  attr3: string;
  attr4: string;
  attr5: string;
};

export type ContentStatusCounts = {
  published: number;
  draft: number;
  archived: number;
  all: number;
};

export type PublicEventsResponse = {
  ok: boolean;
  data?: {
    items: PublicContentItem[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    statusCounts?: ContentStatusCounts;
  };
  error?: { message: string };
};

export async function getPublicEvents(
  page = 1,
  limit = 6
): Promise<PublicEventsResponse> {
  try {
    const q = new URLSearchParams({
      page: String(Math.max(1, page)),
      limit: String(Math.max(1, limit)),
    });
    const res = await fetch(`${BASE}/content/event?${q}`);
    return (await res.json()) as PublicEventsResponse;
  } catch {
    return { ok: false, error: { message: "Tidak dapat menghubungi server" } };
  }
}

export type PublicPrayerStaffResponse = PublicEventsResponse;

export async function getPublicPrayerStaff(
  page = 1,
  limit = 6
): Promise<PublicPrayerStaffResponse> {
  try {
    const q = new URLSearchParams({
      page: String(Math.max(1, page)),
      limit: String(Math.max(1, limit)),
    });
    const res = await fetch(`${BASE}/content/prayer_staff?${q}`);
    return (await res.json()) as PublicPrayerStaffResponse;
  } catch {
    return { ok: false, error: { message: "Tidak dapat menghubungi server" } };
  }
}

export type PublicGalleryResponse = PublicEventsResponse;

export async function getPublicGallery(
  page = 1,
  limit = 8
): Promise<PublicGalleryResponse> {
  try {
    const q = new URLSearchParams({
      page: String(Math.max(1, page)),
      limit: String(Math.max(1, limit)),
    });
    const res = await fetch(`${BASE}/content/gallery?${q}`);
    return (await res.json()) as PublicGalleryResponse;
  } catch {
    return { ok: false, error: { message: "Tidak dapat menghubungi server" } };
  }
}

export type IslamicDayItem = {
  title: string;
  month: string;
  day: number;
  subtitle: string;
  dateIso: string;
  link: string;
};

export async function getLatestIslamicDays(limit = 4): Promise<{
  year: number;
  items: IslamicDayItem[];
  sourceUrl: string;
  fromFallback?: boolean;
}> {
  const fallback = (): { year: number; items: IslamicDayItem[]; sourceUrl: string; fromFallback: true } => ({
    year: 2026,
    items: pickLatestIslamicDaysFallback(limit),
    sourceUrl: "https://www.islamicfinder.org/specialislamicdays/",
    fromFallback: true,
  });

  try {
    const res = await fetch(`${BASE}/islamic-days?limit=${limit}`);
    if (!res.ok) return fallback();
    const json = (await res.json()) as {
      ok?: boolean;
      data?: { year: number; items: IslamicDayItem[]; sourceUrl: string };
    };
    const items = json.data?.items ?? [];
    if (!json.ok || items.length === 0) return fallback();
    return { ...json.data!, fromFallback: false };
  } catch {
    return fallback();
  }
}

export async function submitContact(
  body: SubmitContactBody
): Promise<{ ok: boolean; data?: { id: string; emailSent: boolean }; error?: { message: string } }> {
  try {
    const res = await fetch(`${BASE}/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch {
    return { ok: false, error: { message: "Tidak dapat menghubungi server" } };
  }
}
