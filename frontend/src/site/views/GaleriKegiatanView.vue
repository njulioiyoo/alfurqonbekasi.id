<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import SiteImg from "../components/SiteImg.vue";
import SiteNotFoundPanel from "../components/SiteNotFoundPanel.vue";
import { getPublicGallery, type PublicContentItem } from "../api.js";
import { galleryFallbackImage, publicAssetUrl } from "../utils/event-display.js";

const B = "/bismillah/assets";
const PAGE_SIZE = 12;

type GalleryCard = {
  id: string;
  title: string;
  imageUrl: string;
  lightboxUrl: string;
  caption: string;
  eventDate: string;
  location: string;
};

type PageToken = number | "ellipsis";

const loading = ref(true);
const loadError = ref("");
const items = ref<GalleryCard[]>([]);
const currentPage = ref(1);
const totalItems = ref(0);
const totalPages = ref(0);
const listTopRef = ref<HTMLElement | null>(null);

const showEmpty = computed(() => !loading.value && !loadError.value && totalItems.value === 0);
const showPagination = computed(() => !loading.value && !loadError.value && totalPages.value > 1);

const pageTokens = computed((): PageToken[] => {
  const total = totalPages.value;
  const cur = currentPage.value;
  if (total <= 1) return [];
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const tokens: PageToken[] = [1];
  if (cur > 3) tokens.push("ellipsis");
  const start = Math.max(2, cur - 1);
  const end = Math.min(total - 1, cur + 1);
  for (let p = start; p <= end; p++) tokens.push(p);
  if (cur < total - 2) tokens.push("ellipsis");
  tokens.push(total);
  return tokens;
});

function galleryCaption(title: string, eventDate: string, location: string): string {
  return [title, eventDate, location].filter(Boolean).join(" · ");
}

function mapGallery(row: PublicContentItem, globalIndex: number): GalleryCard {
  const cover = row.coverImageUrl?.trim() || "";
  const imageUrl = cover || galleryFallbackImage(globalIndex, B);
  const eventDate = row.attr1?.trim() || "";
  const location = row.attr2?.trim() || "";
  return {
    id: row.id,
    title: row.title,
    imageUrl,
    lightboxUrl: publicAssetUrl(cover || imageUrl),
    caption: galleryCaption(row.title, eventDate, location),
    eventDate,
    location,
  };
}

function scrollToListTop(): void {
  listTopRef.value?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function jq(): typeof window.jQuery {
  return window.jQuery;
}

function initFancybox(): void {
  const $ = jq();
  if ($?.fn?.fancybox) {
    $('[data-fancybox="site-gallery"]').fancybox({});
  }
}

async function loadPage(page: number): Promise<void> {
  loading.value = true;
  loadError.value = "";
  try {
    const json = await getPublicGallery(page, PAGE_SIZE);
    if (!json.ok || !json.data) {
      loadError.value = json.error?.message || "Gagal memuat galeri kegiatan";
      items.value = [];
      totalItems.value = 0;
      totalPages.value = 0;
      return;
    }
    const offset = (json.data.page - 1) * json.data.limit;
    items.value = json.data.items.map((row, i) => mapGallery(row, offset + i));
    currentPage.value = json.data.page;
    totalItems.value = json.data.total;
    totalPages.value = json.data.totalPages;
  } catch {
    loadError.value = "Tidak dapat menghubungi server";
    items.value = [];
    totalItems.value = 0;
    totalPages.value = 0;
  } finally {
    loading.value = false;
    await nextTick();
    initFancybox();
  }
}

async function goToPage(page: number): Promise<void> {
  if (page < 1 || page > totalPages.value || page === currentPage.value || loading.value) return;
  await loadPage(page);
  scrollToListTop();
}

onMounted(() => {
  void loadPage(1);
});

watch(items, () => {
  void nextTick(() => initFancybox());
});
</script>

<template>
  <section>
    <div class="gap black-layer opc7">
      <div class="fixed-bg2" :style="{ backgroundImage: `url(${B}/images/pg-tp-bg.jpg)` }"></div>
      <div class="container">
        <div class="pg-tp-wrp text-center">
          <div class="pg-tp-inr">
            <h1 itemprop="headline">Galeri Kegiatan</h1>
            <ol class="breadcrumb">
              <li class="breadcrumb-item"><RouterLink :to="{ name: 'home' }">Beranda</RouterLink></li>
              <li class="breadcrumb-item active">Galeri Kegiatan</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section ref="listTopRef">
    <div class="gap">
      <div class="container">
        <div v-if="loading" class="site-gallery-status text-center">
          <p><i class="fas fa-spinner fa-spin theme-clr"></i> Memuat galeri kegiatan…</p>
        </div>

        <div v-else-if="loadError" class="site-gallery-status text-center site-gallery-status--warn">
          <p><i class="fas fa-exclamation-circle theme-clr"></i> {{ loadError }}</p>
          <button type="button" class="theme-btn theme-bg brd-rd5" @click="loadPage(currentPage || 1)">
            Coba lagi
          </button>
        </div>

        <div v-else-if="showEmpty">
          <SiteNotFoundPanel
            kind="data"
            description="Belum ada foto galeri dipublikasikan. Silakan kembali lagi nanti atau"
            :show-search="false"
          />
        </div>

        <template v-else>
          <div class="gallery-wrap">
            <div class="row mrg10">
              <div
                v-for="(item, idx) in items"
                :key="item.id"
                class="col-md-3 col-sm-6 col-lg-3"
              >
                <div class="gallery-item brd-rd5">
                  <a
                    :href="item.lightboxUrl"
                    data-fancybox="site-gallery"
                    :data-caption="item.caption"
                    :title="item.title"
                    itemprop="url"
                  >
                    <SiteImg
                      :src="item.imageUrl"
                      :fallback="galleryFallbackImage(idx, B)"
                      :alt="item.title"
                      placeholder-title="Foto galeri"
                    />
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div v-if="showPagination" class="pagination-wrap text-center">
            <ul class="pagination">
              <li class="page-item brd-rd5" :class="{ disabled: currentPage <= 1 }">
                <a
                  href="#"
                  class="page-link"
                  title="Halaman sebelumnya"
                  @click.prevent="goToPage(currentPage - 1)"
                ><i class="fas fa-angle-left"></i></a>
              </li>
              <template v-for="(token, tokenIdx) in pageTokens" :key="`${token}-${tokenIdx}`">
                <li v-if="token === 'ellipsis'" class="brd-rd5">....</li>
                <li v-else class="page-item brd-rd5" :class="{ active: token === currentPage }">
                  <span v-if="token === currentPage">{{ token }}</span>
                  <a
                    v-else
                    href="#"
                    class="page-link"
                    :title="`Halaman ${token}`"
                    @click.prevent="goToPage(token)"
                  >{{ token }}</a>
                </li>
              </template>
              <li class="page-item brd-rd5" :class="{ disabled: currentPage >= totalPages }">
                <a
                  href="#"
                  class="page-link"
                  title="Halaman berikutnya"
                  @click.prevent="goToPage(currentPage + 1)"
                ><i class="fas fa-angle-right"></i></a>
              </li>
            </ul>
          </div>
        </template>
      </div>
    </div>
  </section>
</template>

<style scoped>
.site-gallery-status {
  padding: 48px 20px;
  color: #666;
}

.site-gallery-status--warn p {
  color: #856404;
  margin-bottom: 16px;
}

.gallery-item :deep(.site-img) {
  width: 100%;
  display: block;
  aspect-ratio: 1 / 1;
  object-fit: cover;
}

.pagination > li.disabled {
  opacity: 0.45;
  pointer-events: none;
}
</style>
