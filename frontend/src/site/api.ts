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
  visi: string;
  misi: string;
  homeBanners: HomeBannerSlide[];
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
    visi: "",
    misi: "",
    homeBanners: [],
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
  } catch { /* fallback to defaults */ }

  return defaults;
}

export type SubmitContactBody = {
  name: string;
  email: string;
  phone?: string;
  message: string;
};

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
