<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import EventCountdown from "../components/EventCountdown.vue";
import SiteImg from "../components/SiteImg.vue";
import SiteNotFoundPanel from "../components/SiteNotFoundPanel.vue";
import {
  getPublicConfig,
  getPublicEventBySlug,
  getPublicEvents,
  type PublicContentDetailItem,
  type PublicContentItem,
  type SiteConfig,
} from "../api.js";
import {
  eventFallbackImage,
  eventTimeLabel,
  isExternalUrl,
  jadwalKajianDetailRoute,
  parseEventDateParts,
  publicAssetUrl,
} from "../utils/event-display.js";

const B = "/bismillah/assets";
const route = useRoute();

const loading = ref(true);
const loadError = ref("");
const notFound = ref(false);
const event = ref<PublicContentDetailItem | null>(null);
const recentEvents = ref<PublicContentItem[]>([]);
const siteCfg = ref<SiteConfig | null>(null);

const slug = computed(() => String(route.params.slug ?? "").trim());

const dateParts = computed(() =>
  event.value ? parseEventDateParts(event.value.attr3, event.value.publishedAt) : { day: "—", month: "—", targetMs: null }
);

const coverUrl = computed(() => {
  if (!event.value) return `${B}/images/resources/event-detail-img.jpg`;
  return event.value.coverImageUrl?.trim() || eventFallbackImage(0, B);
});

const coverFallback = computed(() => `${B}/images/resources/event-detail-img.jpg`);

const timeLabel = computed(() =>
  event.value ? eventTimeLabel(event.value.attr3, event.value.attr4) : "—"
);

const locationLabel = computed(() => event.value?.attr1?.trim() || "Masjid Alfurqon Bekasi");

const speakerName = computed(() => event.value?.attr2?.trim() || "");

const attachmentUrl = computed(() => {
  const link = event.value?.attr5?.trim() || "";
  if (!link) return "";
  return publicAssetUrl(link);
});

const attachmentExternal = computed(() => isExternalUrl(event.value?.attr5 ?? ""));

const mapsEmbedUrl = computed(() => siteCfg.value?.mapsEmbedUrl?.trim() || "");

const hasExcerpt = computed(() => Boolean(event.value?.excerpt?.trim()));
const hasBody = computed(() => Boolean(event.value?.body?.trim()));

async function loadRecentExcept(currentSlug: string): Promise<void> {
  try {
    const json = await getPublicEvents(1, 8);
    if (!json.ok || !json.data?.items.length) {
      recentEvents.value = [];
      return;
    }
    recentEvents.value = json.data.items
      .filter((row) => row.slug !== currentSlug)
      .slice(0, 4);
  } catch {
    recentEvents.value = [];
  }
}

async function loadDetail(): Promise<void> {
  const s = slug.value;
  if (!s) {
    notFound.value = true;
    loading.value = false;
    return;
  }
  loading.value = true;
  loadError.value = "";
  notFound.value = false;
  event.value = null;
  try {
    const json = await getPublicEventBySlug(s);
    if (!json.ok || !json.data) {
      if (json.error?.message?.toLowerCase().includes("tidak ditemukan")) {
        notFound.value = true;
      } else {
        loadError.value = json.error?.message || "Gagal memuat detail kajian";
      }
      return;
    }
    event.value = json.data;
    await loadRecentExcept(s);
  } catch {
    loadError.value = "Tidak dapat menghubungi server";
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  siteCfg.value = await getPublicConfig();
  await loadDetail();
});

watch(slug, () => {
  void loadDetail();
});
</script>

<template>
  <section>
    <div class="gap black-layer opc7">
      <div class="fixed-bg2" :style="{ backgroundImage: `url(${B}/images/pg-tp-bg.jpg)` }"></div>
      <div class="container">
        <div class="pg-tp-wrp text-center">
          <div class="pg-tp-inr">
            <h1 itemprop="headline">{{ event?.title || "Detail Kajian" }}</h1>
            <ol class="breadcrumb">
              <li class="breadcrumb-item"><RouterLink :to="{ name: 'home' }">Beranda</RouterLink></li>
              <li class="breadcrumb-item"><RouterLink :to="{ name: 'jadwal-kajian' }">Jadwal Kajian</RouterLink></li>
              <li class="breadcrumb-item active">Detail</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section>
    <div class="gap">
      <div class="container">
        <div v-if="loading" class="site-event-detail-status text-center">
          <p><i class="fas fa-spinner fa-spin theme-clr"></i> Memuat detail kajian…</p>
        </div>

        <div v-else-if="loadError" class="site-event-detail-status text-center site-event-detail-status--warn">
          <p><i class="fas fa-exclamation-circle theme-clr"></i> {{ loadError }}</p>
          <button type="button" class="theme-btn theme-bg brd-rd5" @click="loadDetail">Coba lagi</button>
        </div>

        <SiteNotFoundPanel
          v-else-if="notFound"
          kind="data"
          description="Kajian tidak ditemukan atau sudah tidak dipublikasikan."
          :show-search="false"
        />

        <div v-else-if="event" class="event-detail-wrp">
          <div class="row">
            <div class="col-md-9 col-sm-12 col-lg-9">
              <div class="event-detail">
                <div class="event-detail-img brd-rd5">
                  <span>{{ dateParts.day }} <i>{{ dateParts.month }}</i></span>
                  <SiteImg
                    :src="coverUrl"
                    :fallback="coverFallback"
                    :alt="event.title"
                    placeholder-title="Poster kajian"
                  />
                  <EventCountdown v-if="dateParts.targetMs != null" :target-ms="dateParts.targetMs" />
                </div>

                <div class="event-detail-inf-inr">
                  <ul class="pst-mta">
                    <li><i class="fas fa-map-marker-alt theme-clr"></i>{{ locationLabel }}</li>
                    <li><i class="far fa-clock theme-clr"></i> {{ timeLabel }}</li>
                  </ul>
                </div>

                <div class="event-detail-desc">
                  <div
                    v-if="hasExcerpt"
                    class="site-event-detail-html"
                    v-html="event.excerpt"
                  />
                  <div
                    v-if="hasBody"
                    class="site-event-detail-html site-event-detail-html--body"
                    v-html="event.body"
                  />
                  <p v-if="!hasExcerpt && !hasBody" class="text-muted">
                    Informasi lengkap kajian akan segera ditambahkan.
                  </p>
                </div>

                <div v-if="speakerName" class="rprsntv-wrp">
                  <h3 itemprop="headline">Pemateri</h3>
                  <div class="team-sec remove-ext7">
                    <div class="row">
                      <div class="col-md-4 col-sm-6 col-lg-4">
                        <div class="team-bx text-center">
                          <div class="team-thmb brd-rd5">
                            <img :src="`${B}/images/resources/team-img1-1.jpg`" :alt="speakerName" />
                          </div>
                          <div class="team-inf brd-rd5">
                            <h5 itemprop="headline">{{ speakerName }}</h5>
                            <span>Pemateri / Ustadz</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-if="attachmentUrl" class="site-event-detail-attach kt-margin-b-20">
                  <h3 itemprop="headline">Lampiran</h3>
                  <a
                    :href="attachmentUrl"
                    class="theme-btn theme-bg brd-rd5"
                    :target="attachmentExternal ? '_blank' : undefined"
                    :rel="attachmentExternal ? 'noopener noreferrer' : undefined"
                    :download="attachmentExternal ? undefined : ''"
                  >
                    <i class="fas fa-paperclip"></i>
                    {{ attachmentExternal ? "Buka tautan" : "Unduh dokumen" }}
                  </a>
                </div>

                <div v-if="mapsEmbedUrl" class="event-srch-mp">
                  <h3 itemprop="headline">Lokasi</h3>
                  <div class="evnt-srch brd-rd5">
                    <p class="site-event-detail-location"><i class="fas fa-map-marker-alt theme-clr"></i> {{ locationLabel }}</p>
                    <div class="site-event-detail-map">
                      <iframe
                        :src="mapsEmbedUrl"
                        title="Peta lokasi masjid"
                        loading="lazy"
                        referrerpolicy="no-referrer-when-downgrade"
                        allowfullscreen
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="col-md-3 col-sm-6 col-lg-3">
              <div class="sidebar-wrp">
                <div class="widget">
                  <h5 itemprop="headline">Navigasi</h5>
                  <ul class="cat-lst">
                    <li>
                      <RouterLink :to="{ name: 'jadwal-kajian' }">← Semua jadwal kajian</RouterLink>
                    </li>
                    <li>
                      <RouterLink :to="{ name: 'home' }">Beranda</RouterLink>
                    </li>
                    <li>
                      <RouterLink :to="{ name: 'kontak' }">Hubungi pengurus</RouterLink>
                    </li>
                  </ul>
                </div>

                <div v-if="recentEvents.length" class="widget">
                  <h5 itemprop="headline">Kajian lainnya</h5>
                  <div class="rcnt-wrp">
                    <div v-for="item in recentEvents" :key="item.id" class="rcnt-bx">
                      <RouterLink
                        class="brd-rd5 site-event-detail-rcnt-thumb"
                        :to="jadwalKajianDetailRoute(item.slug)"
                        :title="item.title"
                      >
                        <SiteImg
                          :src="item.coverImageUrl"
                          :fallback="eventFallbackImage(0, B)"
                          :alt="item.title"
                          placeholder-title="Poster kajian"
                        />
                      </RouterLink>
                      <div class="rcnt-inf">
                        <h6 itemprop="headline">
                          <RouterLink :to="jadwalKajianDetailRoute(item.slug)" :title="item.title">
                            {{ item.title }}
                          </RouterLink>
                        </h6>
                        <span class="theme-clr">
                          <i class="far fa-clock"></i>
                          {{ eventTimeLabel(item.attr3, item.attr4) }}
                        </span>
                      </div>
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
</template>

<style scoped>
.site-event-detail-status {
  padding: 48px 20px;
  color: #666;
}

.site-event-detail-status--warn p {
  color: #856404;
  margin-bottom: 16px;
}

.site-event-detail-html :deep(p) {
  margin-bottom: 1rem;
  line-height: 1.7;
  color: #555;
}

.site-event-detail-html :deep(ul),
.site-event-detail-html :deep(ol) {
  margin: 0 0 1rem;
  padding-left: 1.25rem;
  color: #555;
}

.site-event-detail-html :deep(h3),
.site-event-detail-html :deep(h4) {
  margin: 1.25rem 0 0.75rem;
  color: #333;
}

.site-event-detail-html--body {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
}

.site-event-detail-location {
  margin: 0 0 12px;
  font-size: 14px;
  color: #555;
}

.site-event-detail-map {
  position: relative;
  width: 100%;
  min-height: 280px;
  overflow: hidden;
  border-radius: 5px;
  background: #f3f4f6;
}

.site-event-detail-map iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
}

.site-event-detail-rcnt-thumb {
  display: block;
  width: 70px;
  height: 70px;
  overflow: hidden;
  flex-shrink: 0;
}

.site-event-detail-rcnt-thumb :deep(.site-img) {
  width: 100%;
  height: 70px;
  object-fit: cover;
}

.site-event-detail-attach a i {
  margin-right: 6px;
}
</style>
