<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import EventCountdown from "../components/EventCountdown.vue";
import SiteNotFoundPanel from "../components/SiteNotFoundPanel.vue";
import { getPublicEvents, type PublicContentItem } from "../api.js";
import {
  eventFallbackImage,
  eventTimeLabel,
  isExternalUrl,
  parseEventDateParts,
} from "../utils/event-display.js";
import { plainTextFromHtml } from "../utils/html-text.js";

const B = "/bismillah/assets";
const PAGE_SIZE = 6;
const EXCERPT_MAX = 200;

type EventCard = PublicContentItem & {
  imageUrl: string;
  location: string;
  speaker: string;
  timeLabel: string;
  day: string;
  month: string;
  targetMs: number | null;
  detailUrl: string;
  detailExternal: boolean;
  excerptPlain: string;
};

type PageToken = number | "ellipsis";

const loading = ref(true);
const loadError = ref("");
const events = ref<EventCard[]>([]);
const currentPage = ref(1);
const totalItems = ref(0);
const totalPages = ref(0);
const listTopRef = ref<HTMLElement | null>(null);
const expandedExcerpts = ref<Set<number>>(new Set());

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

function mapEvent(row: PublicContentItem, globalIndex: number): EventCard {
  const parts = parseEventDateParts(row.attr3, row.publishedAt);
  const link = row.attr5?.trim() || "";
  return {
    ...row,
    imageUrl: row.coverImageUrl?.trim() || eventFallbackImage(globalIndex, B),
    location: row.attr1?.trim() || "—",
    speaker: row.attr2?.trim() || "",
    timeLabel: eventTimeLabel(row.attr3, row.attr4),
    day: parts.day,
    month: parts.month,
    targetMs: parts.targetMs,
    detailUrl: link || "#",
    detailExternal: isExternalUrl(link),
    excerptPlain: plainTextFromHtml(row.excerpt ?? ""),
  };
}

function scrollToListTop(): void {
  listTopRef.value?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function excerptNeedsMore(text: string): boolean {
  return text.length > EXCERPT_MAX;
}

function excerptDisplay(text: string, id: number): string {
  if (!excerptNeedsMore(text) || expandedExcerpts.value.has(id)) return text;
  return `${text.slice(0, EXCERPT_MAX).trimEnd()}…`;
}

function toggleExcerpt(id: number): void {
  const next = new Set(expandedExcerpts.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  expandedExcerpts.value = next;
}

async function loadPage(page: number): Promise<void> {
  loading.value = true;
  loadError.value = "";
  try {
    const json = await getPublicEvents(page, PAGE_SIZE);
    if (!json.ok || !json.data) {
      loadError.value = json.error?.message || "Gagal memuat jadwal kajian";
      events.value = [];
      totalItems.value = 0;
      totalPages.value = 0;
      return;
    }
    const offset = (json.data.page - 1) * json.data.limit;
    events.value = json.data.items.map((row, i) => mapEvent(row, offset + i));
    currentPage.value = json.data.page;
    totalItems.value = json.data.total;
    totalPages.value = json.data.totalPages;
  } catch {
    loadError.value = "Tidak dapat menghubungi server";
    events.value = [];
    totalItems.value = 0;
    totalPages.value = 0;
  } finally {
    loading.value = false;
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
</script>

<template>
  <section>
    <div class="gap black-layer opc7">
      <div class="fixed-bg2" :style="{ backgroundImage: `url(${B}/images/pg-tp-bg.jpg)` }"></div>
      <div class="container">
        <div class="pg-tp-wrp text-center">
          <div class="pg-tp-inr">
            <h1>Jadwal Kajian</h1>
            <ol class="breadcrumb">
              <li class="breadcrumb-item"><RouterLink :to="{ name: 'home' }">Beranda</RouterLink></li>
              <li class="breadcrumb-item active">Jadwal Kajian</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section ref="listTopRef">
    <div class="gap">
      <div class="container">
        <div v-if="loading" class="site-events-status text-center">
          <p><i class="fas fa-spinner fa-spin theme-clr"></i> Memuat jadwal kajian…</p>
        </div>

        <div v-else-if="loadError">
          <SiteNotFoundPanel
            kind="error"
            :description="`${loadError}. Silakan coba lagi atau`"
            :show-search="false"
          />
        </div>

        <div v-else-if="showEmpty">
          <SiteNotFoundPanel
            kind="data"
            description="Jadwal kajian belum dipublikasikan. Silakan kembali lagi nanti atau"
            :show-search="false"
          />
        </div>

        <template v-else>
          <div class="event-sec remove-ext5">
            <div class="row">
              <div
                v-for="ev in events"
                :key="ev.id"
                class="col-md-4 col-sm-6 col-lg-4"
              >
                <div class="event-bx2 brd-rd5">
                  <div class="event-thmb">
                    <span>{{ ev.day }} <i>{{ ev.month }}</i></span>
                    <a
                      :href="ev.detailExternal ? ev.detailUrl : '#'"
                      :target="ev.detailExternal ? '_blank' : undefined"
                      :rel="ev.detailExternal ? 'noopener noreferrer' : undefined"
                      :title="ev.title"
                    >
                      <img :src="ev.imageUrl" :alt="ev.title" />
                    </a>
                  <EventCountdown v-if="ev.targetMs != null" :target-ms="ev.targetMs" />
                  </div>
                  <div class="event-inf">
                    <h5>
                      <a
                        :href="ev.detailExternal ? ev.detailUrl : '#'"
                        :target="ev.detailExternal ? '_blank' : undefined"
                        :rel="ev.detailExternal ? 'noopener noreferrer' : undefined"
                        :title="ev.title"
                      >{{ ev.title }}</a>
                    </h5>
                    <ul class="pst-mta">
                      <li><i class="fas fa-map-marker-alt theme-clr"></i> {{ ev.location }}</li>
                      <li v-if="ev.speaker"><i class="far fa-user theme-clr"></i> {{ ev.speaker }}</li>
                      <li><i class="far fa-clock theme-clr"></i> {{ ev.timeLabel }}</li>
                    </ul>
                    <p v-if="ev.excerptPlain" class="site-event-excerpt">
                      {{ excerptDisplay(ev.excerptPlain, ev.id) }}
                      <button
                        v-if="excerptNeedsMore(ev.excerptPlain)"
                        type="button"
                        class="site-event-readmore"
                        @click="toggleExcerpt(ev.id)"
                      >
                        {{ expandedExcerpts.has(ev.id) ? "Sembunyikan" : "Baca selengkapnya" }}
                      </button>
                    </p>
                    <a
                      v-if="ev.detailExternal"
                      :href="ev.detailUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Detail kegiatan"
                    >Detail Kegiatan</a>
                    <span v-else class="site-event-no-link">Detail segera hadir</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="showPagination" class="pagination-wrap text-center">
            <ul class="pagination">
              <li
                class="page-item brd-rd5"
                :class="{ disabled: currentPage <= 1 }"
              >
                <a
                  href="#"
                  class="page-link"
                  title="Halaman sebelumnya"
                  @click.prevent="goToPage(currentPage - 1)"
                ><i class="fas fa-angle-left"></i></a>
              </li>
              <template v-for="(token, idx) in pageTokens" :key="`${token}-${idx}`">
                <li v-if="token === 'ellipsis'" class="brd-rd5">....</li>
                <li
                  v-else
                  class="page-item brd-rd5"
                  :class="{ active: token === currentPage }"
                >
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
              <li
                class="page-item brd-rd5"
                :class="{ disabled: currentPage >= totalPages }"
              >
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
.site-events-status {
  padding: 48px 20px;
  color: #666;
}

.site-events-status h4 {
  margin: 16px 0 8px;
  color: #333;
}

.site-events-status p {
  margin: 0;
  max-width: 420px;
  margin-left: auto;
  margin-right: auto;
}

.site-events-status--warn p {
  color: #856404;
}

.site-events-empty-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 8px;
}

.site-event-no-link {
  font-size: 0.9rem;
  color: #888;
  font-style: italic;
}

.site-event-excerpt {
  margin: 0;
  line-height: 1.5;
}

.site-event-readmore {
  display: inline;
  margin-left: 4px;
  padding: 0;
  border: 0;
  background: none;
  font-size: inherit;
  font-weight: 600;
  color: var(--theme-color, #c9a227);
  cursor: pointer;
  text-decoration: underline;
}

.site-event-readmore:hover {
  opacity: 0.85;
}

.pagination > li.disabled {
  opacity: 0.45;
  pointer-events: none;
}
</style>
