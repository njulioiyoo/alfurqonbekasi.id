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
import { plainTextFromHtml } from "../utils/html-text.js";
import {
  eventFallbackImage,
  eventTimeLabel,
  galleryFallbackImage,
  isExternalUrl,
  parseEventDateParts,
} from "../utils/event-display.js";

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

type HomeBook = {
  id: string;
  author: string;
  coverUrl: string;
  pdfUrl: string;
  downloadUrl: string;
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

const homeBooks: HomeBook[] = [
  {
    id: "1",
    author: "Ustadz Alfurqon",
    coverUrl: `${B}/images/book-cover.jpg`,
    pdfUrl: `${B}/sample/text.zip`,
    downloadUrl: `${B}/sample/text.zip`,
  },
  {
    id: "2",
    author: "Tim Kajian Masjid",
    coverUrl: `${B}/images/book-cover.jpg`,
    pdfUrl: `${B}/sample/text.zip`,
    downloadUrl: `${B}/sample/text.zip`,
  },
  {
    id: "3",
    author: "Pengurus TPQ",
    coverUrl: `${B}/images/book-cover.jpg`,
    pdfUrl: `${B}/sample/text.zip`,
    downloadUrl: `${B}/sample/text.zip`,
  },
  {
    id: "4",
    author: "Dewan Masjid",
    coverUrl: `${B}/images/book-cover.jpg`,
    pdfUrl: `${B}/sample/text.zip`,
    downloadUrl: `${B}/sample/text.zip`,
  },
];

const soundcloudEmbedUrl =
  "https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/128094075&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true";

const cfg = ref<SiteConfig | null>(null);
const bannerCarouselEl = ref<HTMLElement | null>(null);

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

function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

function internalPath(url: string): string {
  const t = url.trim();
  if (!t) return "/";
  if (t.startsWith("/")) return t;
  return `/${t}`;
}

function slideCtaLabel(slide: HomeBannerSlide): string {
  return slide.linkLabel?.trim() || "Selengkapnya";
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
  const $ = jq();
  const el = bannerCarouselEl.value;
  if (!$?.fn?.trigger || !el) return;
  const $el = $(el);
  if (!($el as unknown as { data?: (k: string) => unknown }).data?.("owl.carousel")) return;
  $el.trigger("refresh.owl.carousel");
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
    responsive: {
      0: { items: 1 },
      600: { items: 1 },
      1000: { items: 1 },
    },
  });
  $el.on("initialized.owl.carousel.siteHero", () => refreshBannerOwlHeight());
  const capAssets = [
    `${B}/images/resources/bsml-txt.png`,
    `${B}/images/resources/bsml-txt2.png`,
    `${B}/images/resources/ayat-txt.png`,
    `${B}/images/pshapeg.png`,
    `${B}/images/shp1g.png`,
  ];
  preloadSlideImages(
    [...slides.map((s) => s.imageUrl), ...capAssets],
    () => {
      refreshBannerOwlHeight();
      window.setTimeout(refreshBannerOwlHeight, 80);
    }
  );
}

async function refreshBannerCarousel(): Promise<void> {
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
  <section>
    <div class="gap no-gap">
      <img class="botm-shp shp-img" :src="`${B}/images/shp1g.png`" alt="" />
      <div class="featured-area-wrap text-center">
        <div ref="bannerCarouselEl" class="featured-area owl-carousel">
          <div
            v-for="(slide, i) in displaySlides"
            :key="i"
            class="featured-item"
            :style="{ backgroundImage: `url(${slide.imageUrl})` }"
          >
            <div class="featured-cap">
              <img :src="`${B}/images/resources/${i === 0 ? 'bsml-txt' : 'bsml-txt2'}.png`" alt="" />
              <h1><img :src="`${B}/images/resources/ayat-txt.png`" alt="" /></h1>
              <img class="before-imge" :src="`${B}/images/pshapeg.png`" alt="" />
              <h3>{{ slide.title }}</h3>
              <span v-if="slide.subtitle">{{ slide.subtitle }}</span>
              <RouterLink
                v-if="slide.linkUrl?.trim() && !isExternalUrl(slide.linkUrl)"
                class="theme-btn theme-bg brd-rd5"
                :to="internalPath(slide.linkUrl)"
                :title="slideCtaLabel(slide)"
              >
                {{ slideCtaLabel(slide) }}
              </RouterLink>
              <a
                v-else
                class="theme-btn theme-bg brd-rd5"
                :href="slide.linkUrl?.trim() || '#'"
                :target="isExternalUrl(slide.linkUrl || '') ? '_blank' : undefined"
                :rel="isExternalUrl(slide.linkUrl || '') ? 'noopener noreferrer' : undefined"
                :title="slideCtaLabel(slide)"
              >
                {{ slideCtaLabel(slide) }}
              </a>
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
          <span class="theme-clr">This Month's Guest</span>
          <h2>Featured Scholar</h2>
          <img :src="`${B}/images/pshapeg.png`" alt="" />
        </div>
        <div class="team-sec remove-ext7">
          <div class="row">
            <div class="col-md-4 col-sm-12 col-lg-4">
              <div class="team-bx text-center">
                <div class="team-thmb brd-rd5">
                  <a href="#" title=""><img :src="`${B}/images/resources/team-img1-3.jpg`" alt="team-img1-3.jpg" /></a>
                </div>
                <div class="team-inf brd-rd5">
                  <div class="scl1">
                    <a href="#" title="Twitter" target="_blank"><i class="fab fa-twitter"></i></a>
                    <a href="#" title="Facebook" target="_blank"><i class="fab fa-facebook-f"></i></a>
                    <a href="#" title="Linkedin" target="_blank"><i class="fab fa-linkedin-in"></i></a>
                    <a href="#" title="Google Plus" target="_blank"><i class="fab fa-google-plus-g"></i></a>
                    <a href="#" title="Youtube" target="_blank"><i class="fab fa-youtube"></i></a>
                  </div>
                  <h5><a href="#" title="">Sharuf Al Hammam</a></h5>
                  <span>Islamic Scholar</span>
                </div>
              </div>
            </div>
            <div class="col-md-8 col-sm-12 col-lg-8">
              <div class="remove-ext3 tch-wrp row">
                <div class="col-md-4 col-sm-4 col-lg-4">
                  <div class="tch-bx brd-rd5">
                    <div class="tch-thmb">
                      <img :src="`${B}/images/resources/tch-ado-img1.jpg`" alt="tch-ado-img1.jpg" />
                      <a class="fancybox fancybox.iframe" :href="soundcloudEmbedUrl" data-fancybox="" title="" rel="gallery"><i class="flaticon-play-button"></i></a>
                    </div>
                    <div class="tch-inf">
                      <span><i class="far fa-user theme-clr"></i>Sharuf Al Hammam</span>
                    </div>
                  </div>
                </div>
                <div class="col-md-4 col-sm-4 col-lg-4">
                  <div class="tch-bx brd-rd5">
                    <div class="tch-thmb">
                      <img :src="`${B}/images/resources/tch-ado-img2.jpg`" alt="tch-ado-img2.jpg" />
                      <a class="fancybox fancybox.iframe" :href="soundcloudEmbedUrl" data-fancybox="" title="" rel="gallery"><i class="flaticon-play-button"></i></a>
                    </div>
                    <div class="tch-inf">
                      <span><i class="far fa-user theme-clr"></i>Sharuf Al Hammam</span>
                    </div>
                  </div>
                </div>
                <div class="col-md-4 col-sm-4 col-lg-4">
                  <div class="tch-bx brd-rd5">
                    <div class="tch-thmb">
                      <img :src="`${B}/images/resources/tch-ado-img3.jpg`" alt="tch-ado-img3.jpg" />
                      <a class="fancybox fancybox.iframe" :href="soundcloudEmbedUrl" data-fancybox="" title="" rel="gallery"><i class="flaticon-play-button"></i></a>
                    </div>
                    <div class="tch-inf">
                      <span><i class="far fa-user theme-clr"></i>Sharuf Al Hammam</span>
                    </div>
                  </div>
                </div>
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
            <div class="col-md-3 col-sm-6 col-lg-3">
              <div class="serv-bx text-center">
                <i class="flaticon-open-book theme-clr"></i>
                <h5><a href="#" title="">Kajian & Pengajian</a></h5>
                <div class="srv-inf theme-bg brd-rd10">
                  <p>Kajian rutin harian, mingguan dan bulanan bersama ustadz-ustadz pilihan.</p>
                </div>
              </div>
            </div>
            <div class="col-md-3 col-sm-6 col-lg-3">
              <div class="serv-bx text-center">
                <i class="flaticon-grave theme-clr"></i>
                <h5><a href="#" title="">Layanan Jenazah</a></h5>
                <div class="srv-inf theme-bg brd-rd10">
                  <p>Pengurusan jenazah lengkap dari memandikan hingga pemakaman.</p>
                </div>
              </div>
            </div>
            <div class="col-md-3 col-sm-6 col-lg-3">
              <div class="serv-bx text-center">
                <i class="flaticon-mosque theme-clr"></i>
                <h5><a href="#" title="">TPQ Alfurqon</a></h5>
                <div class="srv-inf theme-bg brd-rd10">
                  <p>Pendidikan Al-Quran untuk anak-anak dengan metode pembelajaran modern.</p>
                </div>
              </div>
            </div>
            <div class="col-md-3 col-sm-6 col-lg-3">
              <div class="serv-bx text-center">
                <i class="flaticon-begging theme-clr"></i>
                <h5><a href="#" title="">Qurban & Zakat</a></h5>
                <div class="srv-inf theme-bg brd-rd10">
                  <p>Penerimaan dan penyaluran qurban serta zakat untuk yang membutuhkan.</p>
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
          <h2>Attend Our Events</h2>
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
              v-for="ev in homeEvents"
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
                  ><img :src="ev.imageUrl" :alt="ev.title" /></a>
                  <RouterLink v-else :to="{ name: 'jadwal-kajian' }" :title="ev.title">
                    <img :src="ev.imageUrl" :alt="ev.title" />
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
            <div v-for="item in homeGallery" :key="item.id" class="col-md-3 col-sm-6 col-lg-3">
              <div class="gallery-item brd-rd5">
                <a
                  :href="item.imageUrl"
                  data-fancybox="gallery"
                  :data-caption="item.title"
                  :title="item.title"
                >
                  <img :src="item.imageUrl" :alt="item.title" />
                </a>
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
          <span class="theme-clr">Free Gift Books</span>
          <h2>Books Corner</h2>
          <img :src="`${B}/images/pshapeg.png`" alt="" />
        </div>
        <div class="team-sec">
          <div class="row">
            <div
              v-for="book in homeBooks"
              :key="book.id"
              class="col-md-3 col-sm-6 col-lg-3"
            >
              <div class="book-block">
                <img :src="book.coverUrl" :alt="book.author" />
                <div class="tch-inf">
                  <span><i class="far fa-user theme-clr"></i>{{ book.author }}</span>
                  <div class="tch-dwn-btn">
                    <a :href="book.pdfUrl" title="PDF" target="_blank" rel="noopener noreferrer"><i class="flaticon-pdf-file"></i></a>
                    <a :href="book.downloadUrl" title="Unduh" download><i class="flaticon-download"></i></a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.site-home-status {
  padding: 24px 16px;
  color: #666;
}

.site-home-status p {
  margin: 0;
}
</style>
