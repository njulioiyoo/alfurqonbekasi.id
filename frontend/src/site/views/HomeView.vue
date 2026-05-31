<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import {
  getPublicConfig,
  getPublicEvents,
  getPublicGallery,
  type HomeBannerSlide,
  type PublicContentItem,
  type SiteConfig,
} from "../api.js";
import EventCountdown from "../components/EventCountdown.vue";
import SiteImg from "../components/SiteImg.vue";
import { plainTextFromHtml } from "../utils/html-text.js";
import {
  eventFallbackImage,
  eventTimeLabel,
  galleryFallbackImage,
  isExternalUrl,
  parseEventDateParts,
} from "../utils/event-display.js";
import { imagePlaceholderDataUrl } from "../utils/image-placeholder.js";

const B = "/bismillah/assets";

type HomeEvent = {
  id: string;
  title: string;
  imageUrl: string;
  location: string;
  time: string;
  description: string;
  day: string;
  month: string;
  targetMs: number | null;
  detailUrl: string;
  detailExternal: boolean;
};

type HomeGalleryItem = {
  id: string;
  title: string;
  imageUrl: string;
  eventDate: string;
  location: string;
};

const HOME_EVENTS_LIMIT = 3;
const HOME_GALLERY_LIMIT = 8;

const homeEvents = ref<HomeEvent[]>([]);
const homeGallery = ref<HomeGalleryItem[]>([]);
const homeEventsLoading = ref(true);
const homeGalleryLoading = ref(true);

function mapHomeEvent(row: PublicContentItem, index: number): HomeEvent {
  const parts = parseEventDateParts(row.attr3, row.publishedAt);
  const link = row.attr5?.trim() || "";
  return {
    id: row.id,
    title: row.title,
    imageUrl: row.coverImageUrl?.trim() || eventFallbackImage(index, B),
    location: row.attr1?.trim() || "—",
    time: eventTimeLabel(row.attr3, row.attr4),
    description: plainTextFromHtml(row.excerpt ?? ""),
    day: parts.day,
    month: parts.month,
    targetMs: parts.targetMs,
    detailUrl: link,
    detailExternal: isExternalUrl(link),
  };
}

function mapHomeGallery(row: PublicContentItem, index: number): HomeGalleryItem {
  return {
    id: row.id,
    title: row.title,
    imageUrl: row.coverImageUrl?.trim() || galleryFallbackImage(index, B),
    eventDate: row.attr1?.trim() || "",
    location: row.attr2?.trim() || "",
  };
}

async function loadHomeEvents(): Promise<void> {
  homeEventsLoading.value = true;
  try {
    const json = await getPublicEvents(1, HOME_EVENTS_LIMIT);
    homeEvents.value =
      json.ok && json.data?.items.length
        ? json.data.items.map((row, i) => mapHomeEvent(row, i))
        : [];
  } catch {
    homeEvents.value = [];
  } finally {
    homeEventsLoading.value = false;
  }
}

async function loadHomeGallery(): Promise<void> {
  homeGalleryLoading.value = true;
  try {
    const json = await getPublicGallery(1, HOME_GALLERY_LIMIT);
    homeGallery.value =
      json.ok && json.data?.items.length
        ? json.data.items.map((row, i) => mapHomeGallery(row, i))
        : [];
  } catch {
    homeGallery.value = [];
  } finally {
    homeGalleryLoading.value = false;
  }
}

const homeServices = [
  {
    icon: "flaticon-open-book",
    title: "Jadwal Kajian",
    desc: "Kajian rutin harian, mingguan, dan bulanan bersama ustadz-ustadz pilihan.",
    route: "jadwal-kajian" as const,
  },
  {
    icon: "flaticon-mosque",
    title: "Jadwal Petugas Ibadah",
    desc: "Informasi petugas imam, muadzin, dan khotib untuk ibadah di masjid.",
    route: "jadwal-petugas" as const,
  },
  {
    icon: "flaticon-mosque",
    title: "Penyewaan Aula",
    desc: "Ajukan sewa aula/gedung masjid untuk acara sesuai ketentuan pengurus.",
    route: "penyewaan-aula" as const,
  },
  {
    icon: "far fa-envelope",
    title: "Hubungi Pengurus",
    desc: "Sampaikan pertanyaan, kerjasama, atau informasi layanan jamaah.",
    route: "kontak" as const,
  },
];

const cfg = ref<SiteConfig | null>(null);
const bannerCarouselEl = ref<HTMLElement | null>(null);
/** URL background banner per slide (setelah cek load / fallback). */
const bannerBgByIndex = ref<Record<number, string>>({});

const fallbackSlides: HomeBannerSlide[] = [
  {
    imageUrl: `${B}/images/resources/slide-4.jpg`,
    title: "Selamat Datang di Masjid Alfurqon Bekasi",
    subtitle: "Pusat Informasi & Kegiatan Masjid",
    linkUrl: "",
    linkLabel: "Selengkapnya",
  },
  {
    imageUrl: `${B}/images/resources/slide3.jpg`,
    title: "Masjid untuk Semua Umat",
    subtitle: "Jadwal Kajian, Donasi, dan Informasi Kegiatan",
    linkUrl: "",
    linkLabel: "Selengkapnya",
  },
];

const displaySlides = computed(() => {
  const from = cfg.value?.homeBanners?.filter((s) => s.imageUrl?.trim()) ?? [];
  return from.length > 0 ? from : fallbackSlides;
});

const usingCmsBanners = computed(() => {
  const from = cfg.value?.homeBanners?.filter((s) => s.imageUrl?.trim()) ?? [];
  return from.length > 0;
});

const siteName = computed(() => cfg.value?.websiteName || "Masjid Alfurqon Bekasi");
const aboutTeaser = computed(() => {
  const visi = plainTextFromHtml(cfg.value?.visi ?? "");
  if (visi.length >= 40) return visi.length > 280 ? `${visi.slice(0, 280).trimEnd()}…` : visi;
  const tagline = cfg.value?.websiteTagline?.trim();
  if (tagline) return tagline;
  return `${siteName.value} melayani jamaah melalui kajian, ibadah berjamaah, dan layanan kemasyarakatan di ${cfg.value?.city || "Bekasi"}.`;
});

function slideHasCaption(slide: HomeBannerSlide): boolean {
  return Boolean(slide.title?.trim() || slide.subtitle?.trim() || slide.linkUrl?.trim());
}

function internalPath(url: string): string {
  const t = url.trim();
  if (!t) return "/";
  if (t.startsWith("/")) return t;
  return `/${t}`;
}

function slideCtaLabel(slide: HomeBannerSlide): string {
  const label = slide.linkLabel?.trim();
  return label || "Selengkapnya";
}

function defaultBannerFallback(index: number): string {
  return fallbackSlides[index % fallbackSlides.length]?.imageUrl ?? fallbackSlides[0].imageUrl;
}

function slideBgUrl(index: number, slide: HomeBannerSlide): string {
  return bannerBgByIndex.value[index] ?? (slide.imageUrl?.trim() || defaultBannerFallback(index));
}

function validateBannerImages(): void {
  const slides = displaySlides.value;
  const next: Record<number, string> = {};
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const raw = slide.imageUrl?.trim() ?? "";
    const fb = defaultBannerFallback(i);
    const ph = imagePlaceholderDataUrl("Banner tidak tersedia");

    if (!raw) {
      next[i] = fb;
      continue;
    }

    next[i] = raw;
    const img = new Image();
    img.onload = () => {
      bannerBgByIndex.value = { ...bannerBgByIndex.value, [i]: raw };
      refreshBannerOwlHeight();
    };
    img.onerror = () => {
      const fbImg = new Image();
      fbImg.onload = () => {
        bannerBgByIndex.value = { ...bannerBgByIndex.value, [i]: fb };
        refreshBannerOwlHeight();
      };
      fbImg.onerror = () => {
        bannerBgByIndex.value = { ...bannerBgByIndex.value, [i]: ph };
        refreshBannerOwlHeight();
      };
      fbImg.src = fb;
    };
    img.src = raw;
  }
  bannerBgByIndex.value = next;
}

function eventImageFallback(index: number): string {
  return eventFallbackImage(index, B);
}

function galleryImageFallback(index: number): string {
  return galleryFallbackImage(index, B);
}

function jq(): typeof window.jQuery {
  return window.jQuery;
}

function initHomeFancybox(): void {
  const $ = jq();
  if ($?.isFunction?.($.fn.fancybox)) {
    $('[data-fancybox],[data-fancybox="gallery"]').fancybox({});
  }
}

function destroyBannerOwl(): void {
  const $ = jq();
  const el = bannerCarouselEl.value;
  if (!$?.fn?.trigger || !el) return;
  const $el = $(el);
  if (!$el.hasClass("owl-loaded")) return;
  $el.off(".siteHero");
  $el.trigger("destroy.owl.carousel");
  $el.find(".owl-stage-outer").children().unwrap();
  $el.removeClass("owl-loaded owl-drag owl-grab");
  $el.find(".owl-nav, .owl-dots").remove();
}

function refreshBannerOwlHeight(): void {
  syncBannerCarouselHeight();
}

function syncBannerCarouselHeight(): void {
  const $ = jq();
  const el = bannerCarouselEl.value;
  if (!$?.fn?.trigger || !el) return;
  const $el = $(el);
  const $slide = $el.find(".site-hero-slide").first();
  if (!$slide.length) return;
  const h = $slide.outerHeight();
  if (h && h > 0) {
    $el.find(".owl-stage-outer").css("height", `${h}px`);
  }
  if (($el as unknown as { data?: (k: string) => unknown }).data?.("owl.carousel")) {
    $el.trigger("refresh.owl.carousel");
  }
}

function preloadSlideImages(urls: string[], onDone: () => void): void {
  const unique = [...new Set(urls.filter(Boolean))];
  if (unique.length === 0) {
    onDone();
    return;
  }
  let pending = unique.length;
  const done = (): void => {
    pending -= 1;
    if (pending <= 0) onDone();
  };
  for (const url of unique) {
    const img = new Image();
    img.onload = done;
    img.onerror = done;
    img.src = url;
  }
}

function initBannerOwl(): void {
  const $ = jq();
  const el = bannerCarouselEl.value;
  const slides = displaySlides.value;
  if (!$?.fn?.owlCarousel || !el || slides.length === 0) return;
  destroyBannerOwl();
  const $el = $(el);
  $el.owlCarousel({
    loop: slides.length > 1,
    margin: 0,
    nav: true,
    autoHeight: true,
    responsive: {
      0: { items: 1 },
      600: { items: 1 },
      1000: { items: 1 },
    },
  });
  $el.on("initialized.owl.carousel.siteHero refreshed.owl.carousel.siteHero", () => {
    syncBannerCarouselHeight();
  });
  const capAssets = [
    `${B}/images/resources/bsml-txt.png`,
    `${B}/images/resources/bsml-txt2.png`,
    `${B}/images/resources/ayat-txt.png`,
    `${B}/images/pshapeg.png`,
    `${B}/images/shp1g.png`,
  ];
  preloadSlideImages(
    [...slides.map((_, i) => slideBgUrl(i, slides[i])), ...capAssets],
    () => {
      syncBannerCarouselHeight();
      window.setTimeout(syncBannerCarouselHeight, 80);
      window.setTimeout(syncBannerCarouselHeight, 300);
    }
  );
}

async function refreshBannerCarousel(): Promise<void> {
  validateBannerImages();
  await nextTick();
  initBannerOwl();
}

function onBannerResize(): void {
  refreshBannerOwlHeight();
}

onMounted(async () => {
  cfg.value = await getPublicConfig();
  await Promise.all([loadHomeEvents(), loadHomeGallery()]);
  await refreshBannerCarousel();
  await nextTick();
  initHomeFancybox();
  const onLoad = (): void => {
    void refreshBannerCarousel();
    initHomeFancybox();
  };
  if (document.readyState === "complete") {
    window.setTimeout(onLoad, 0);
  } else {
    window.addEventListener("load", onLoad, { once: true });
  }
  window.addEventListener("resize", onBannerResize);
});

watch(displaySlides, () => {
  void refreshBannerCarousel();
});

watch(homeGallery, () => {
  nextTick(() => initHomeFancybox());
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", onBannerResize);
  destroyBannerOwl();
});
</script>

<template>
  <section class="site-hero-section">
    <div class="gap no-gap">
      <img v-if="!usingCmsBanners" class="botm-shp shp-img" :src="`${B}/images/shp1g.png`" alt="" />
      <div class="featured-area-wrap site-hero-banners text-center">
        <div ref="bannerCarouselEl" class="featured-area owl-carousel">
          <div
            v-for="(slide, i) in displaySlides"
            :key="i"
            class="featured-item site-hero-slide"
            :class="{ 'site-hero-slide--caption': slideHasCaption(slide) || !usingCmsBanners }"
            :style="{ backgroundImage: `url(${slideBgUrl(i, slide)})` }"
          >
            <div
              v-if="slideHasCaption(slide) || !usingCmsBanners"
              class="featured-cap site-hero-cap"
            >
              <template v-if="!usingCmsBanners">
                <img :src="`${B}/images/resources/${i === 0 ? 'bsml-txt' : 'bsml-txt2'}.png`" alt="" />
                <h1><img :src="`${B}/images/resources/ayat-txt.png`" alt="" /></h1>
                <img class="before-imge" :src="`${B}/images/pshapeg.png`" alt="" />
                <h3 v-if="slide.title?.trim()">{{ slide.title.trim() }}</h3>
                <span v-if="slide.subtitle?.trim()">{{ slide.subtitle.trim() }}</span>
                <RouterLink
                  v-if="slide.linkUrl?.trim() && !isExternalUrl(slide.linkUrl)"
                  class="theme-btn theme-bg brd-rd5"
                  :to="internalPath(slide.linkUrl)"
                  :title="slideCtaLabel(slide)"
                >
                  {{ slideCtaLabel(slide) }}
                </RouterLink>
                <a
                  v-else-if="slide.linkUrl?.trim()"
                  class="theme-btn theme-bg brd-rd5"
                  :href="slide.linkUrl.trim()"
                  target="_blank"
                  rel="noopener noreferrer"
                  :title="slideCtaLabel(slide)"
                >
                  {{ slideCtaLabel(slide) }}
                </a>
              </template>
              <template v-else>
                <h3 v-if="slide.title?.trim()">{{ slide.title.trim() }}</h3>
                <span v-if="slide.subtitle?.trim()">{{ slide.subtitle.trim() }}</span>
                <RouterLink
                  v-if="slide.linkUrl?.trim() && !isExternalUrl(slide.linkUrl)"
                  class="theme-btn theme-bg brd-rd5"
                  :to="internalPath(slide.linkUrl)"
                  :title="slideCtaLabel(slide)"
                >
                  {{ slideCtaLabel(slide) }}
                </RouterLink>
                <a
                  v-else-if="slide.linkUrl?.trim()"
                  class="theme-btn theme-bg brd-rd5"
                  :href="slide.linkUrl.trim()"
                  target="_blank"
                  rel="noopener noreferrer"
                  :title="slideCtaLabel(slide)"
                >
                  {{ slideCtaLabel(slide) }}
                </a>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section>
    <div class="gap">
      <div class="container">
        <div class="abt-sec-wrp">
          <div class="row">
            <div class="col-md-6 col-sm-12 col-lg-6">
              <div class="abt-vdo brd-rd5">
                <img :src="`${B}/images/resources/abt-img.jpg`" :alt="siteName" />
              </div>
            </div>
            <div class="col-md-6 col-sm-12 col-lg-6">
              <div class="abt-desc">
                <div class="sec-tl">
                  <span class="theme-clr">Profil Masjid</span>
                  <h2>{{ siteName }}</h2>
                  <img :src="`${B}/images/pshapeg.png`" alt="" />
                </div>
                <p>{{ aboutTeaser }}</p>
                <RouterLink class="theme-btn theme-bg brd-rd5" :to="{ name: 'tentang-masjid' }">
                  Selengkapnya
                </RouterLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section>
    <div class="gap white-layer opc7">
      <div class="fixed-bg" :style="{ backgroundImage: `url(${B}/images/parallax1.jpg)` }"></div>
      <div class="container">
        <div class="sec-tl text-center">
          <span class="theme-clr">Melayani Jamaah dengan Sepenuh Hati</span>
          <h2>Layanan Kami</h2>
          <img :src="`${B}/images/pshapeg.png`" alt="" />
        </div>
        <div class="serv-wrp remove-ext3">
          <div class="row">
            <div v-for="svc in homeServices" :key="svc.route" class="col-md-3 col-sm-6 col-lg-3">
              <div class="serv-bx text-center">
                <i :class="[svc.icon, 'theme-clr']"></i>
                <h5>
                  <RouterLink :to="{ name: svc.route }">{{ svc.title }}</RouterLink>
                </h5>
                <div class="srv-inf theme-bg brd-rd10">
                  <p>{{ svc.desc }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section>
    <div class="gap">
      <div class="container">
        <div class="sec-tl text-center">
          <span class="theme-clr">Kegiatan Masjid Alfurqon</span>
          <h2>Kegiatan Terbaru</h2>
          <img :src="`${B}/images/pshapeg.png`" alt="" />
        </div>
        <div v-if="homeEventsLoading" class="site-home-status text-center">
          <p><i class="fas fa-spinner fa-spin theme-clr"></i> Memuat kegiatan…</p>
        </div>
        <div v-else-if="homeEvents.length === 0" class="site-home-status text-center">
          <p>Belum ada kegiatan dipublikasikan. Lihat <RouterLink :to="{ name: 'jadwal-kajian' }">jadwal kajian</RouterLink>.</p>
        </div>
        <div v-else class="event-sec remove-ext5">
          <div class="row">
            <div
              v-for="(ev, evIdx) in homeEvents"
              :key="ev.id"
              class="col-md-4 col-sm-6 col-lg-4"
            >
              <div class="event-bx2 brd-rd5">
                <div class="event-thmb">
                  <span>{{ ev.day }} <i>{{ ev.month }}</i></span>
                  <a
                    v-if="ev.detailExternal && ev.detailUrl"
                    :href="ev.detailUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    :title="ev.title"
                  ><SiteImg :src="ev.imageUrl" :fallback="eventImageFallback(evIdx)" :alt="ev.title" /></a>
                  <RouterLink v-else :to="{ name: 'jadwal-kajian' }" :title="ev.title">
                    <SiteImg :src="ev.imageUrl" :fallback="eventImageFallback(evIdx)" :alt="ev.title" />
                  </RouterLink>
                  <EventCountdown v-if="ev.targetMs != null" :target-ms="ev.targetMs" />
                </div>
                <div class="event-inf">
                  <h5>
                    <a
                      v-if="ev.detailExternal && ev.detailUrl"
                      :href="ev.detailUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      :title="ev.title"
                    >{{ ev.title }}</a>
                    <RouterLink v-else :to="{ name: 'jadwal-kajian' }" :title="ev.title">{{ ev.title }}</RouterLink>
                  </h5>
                  <ul class="pst-mta">
                    <li><i class="fas fa-map-marker-alt theme-clr"></i> {{ ev.location }}</li>
                    <li><i class="far fa-clock theme-clr"></i> {{ ev.time }}</li>
                  </ul>
                  <p v-if="ev.description">{{ ev.description }}</p>
                  <a
                    v-if="ev.detailExternal && ev.detailUrl"
                    :href="ev.detailUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                  >Detail Kegiatan</a>
                  <RouterLink v-else :to="{ name: 'jadwal-kajian' }">Detail Kegiatan</RouterLink>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section>
    <div class="gap black-layer opc8 white-testi">
      <div class="fixed-bg" :style="{ backgroundImage: `url(${B}/images/parallax2.jpg)` }"></div>
      <div class="container">
        <div class="sec-tl text-center">
          <span class="theme-clr">Kenangan Indah</span>
          <h2>Galeri Kegiatan</h2>
          <img :src="`${B}/images/pshapeg.png`" alt="" />
        </div>
        <div v-if="homeGalleryLoading" class="site-home-status text-center">
          <p><i class="fas fa-spinner fa-spin theme-clr"></i> Memuat galeri…</p>
        </div>
        <div v-else-if="homeGallery.length === 0" class="site-home-status text-center">
          <p>Belum ada foto galeri dipublikasikan.</p>
        </div>
        <div v-else class="gallery-wrap">
          <div class="row mrg10">
            <div v-for="(item, galIdx) in homeGallery" :key="item.id" class="col-md-3 col-sm-6 col-lg-3">
              <div class="gallery-item brd-rd5">
                <a
                  :href="item.imageUrl || galleryImageFallback(galIdx)"
                  data-fancybox="gallery"
                  :data-caption="item.title"
                  :title="item.title"
                >
                  <SiteImg
                    :src="item.imageUrl"
                    :fallback="galleryImageFallback(galIdx)"
                    :alt="item.title"
                  />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.site-hero-section {
  overflow: visible;
}

.site-hero-section > .gap.no-gap {
  overflow: visible;
}

.site-hero-banners :deep(.featured-area),
.site-hero-banners :deep(.owl-stage-outer),
.site-hero-banners :deep(.owl-stage),
.site-hero-banners :deep(.owl-item) {
  height: auto !important;
}

.site-hero-banners :deep(.owl-item) {
  float: none;
}

.site-hero-banners :deep(.featured-item.site-hero-slide) {
  float: none;
  width: 100%;
  aspect-ratio: 2256 / 990;
  min-height: 200px;
  padding: 0 !important;
  background-size: cover;
  background-position: center center;
  background-repeat: no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.site-hero-banners :deep(.site-hero-slide--caption:before) {
  opacity: 0.45;
}

.site-hero-banners :deep(.site-hero-slide:not(.site-hero-slide--caption):before) {
  opacity: 0;
}

.site-hero-banners :deep(.site-hero-cap) {
  max-width: min(720px, 88%);
  padding: 24px 16px 32px;
}

.site-hero-banners :deep(.site-hero-cap > h3:empty),
.site-hero-banners :deep(.site-hero-cap > span:empty) {
  display: none;
  margin: 0;
}

.site-home-status {
  padding: 24px 16px;
  color: #666;
}

.site-home-status p {
  margin: 0;
}
</style>
