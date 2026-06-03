<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { getPublicPrayerStaff, type PublicContentItem } from "../api.js";
import {
  staffContactHref,
  staffDateBadge,
  staffFallbackImage,
  staffRoleLabel,
  staffWhatsappHref,
} from "../utils/prayer-staff-display.js";
import { plainTextFromHtml } from "../utils/html-text.js";
import SiteNotFoundPanel from "../components/SiteNotFoundPanel.vue";

const B = "/bismillah/assets";
const PAGE_SIZE = 6;
const EXCERPT_MAX = 300;

type StaffCard = PublicContentItem & {
  imageUrl: string;
  slot: string;
  taskType: string;
  mainOfficer: string;
  backup: string;
  contact: string;
  excerptPlain: string;
  roleLabel: string;
  contactTel: string | null;
  contactWa: string | null;
  day: string;
  month: string;
};

type PageToken = number | "ellipsis";

const loading = ref(true);
const loadError = ref("");
const staffList = ref<StaffCard[]>([]);
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

function mapStaff(row: PublicContentItem, globalIndex: number): StaffCard {
  const contact = row.attr5?.trim() || "";
  const badge = staffDateBadge(row.title, row.publishedAt);
  return {
    ...row,
    imageUrl: row.coverImageUrl?.trim() || staffFallbackImage(globalIndex, B),
    slot: row.attr1?.trim() || "",
    taskType: row.attr2?.trim() || "",
    mainOfficer: row.attr3?.trim() || "—",
    backup: row.attr4?.trim() || "",
    contact,
    excerptPlain: (() => { const t = plainTextFromHtml(row.excerpt ?? ""); return t.length > EXCERPT_MAX ? `${t.slice(0, EXCERPT_MAX).trimEnd()}…` : t; })(),
    roleLabel: staffRoleLabel(row.attr1 ?? "", row.attr2 ?? ""),
    contactTel: staffContactHref(contact),
    contactWa: staffWhatsappHref(contact),
    day: badge.day,
    month: badge.month,
  };
}

function scrollToListTop(): void {
  listTopRef.value?.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function loadPage(page: number): Promise<void> {
  loading.value = true;
  loadError.value = "";
  try {
    const json = await getPublicPrayerStaff(page, PAGE_SIZE);
    if (!json.ok || !json.data) {
      loadError.value = json.error?.message || "Gagal memuat jadwal petugas";
      staffList.value = [];
      totalItems.value = 0;
      totalPages.value = 0;
      return;
    }
    const offset = (json.data.page - 1) * json.data.limit;
    staffList.value = json.data.items.map((row, i) => mapStaff(row, offset + i));
    currentPage.value = json.data.page;
    totalItems.value = json.data.total;
    totalPages.value = json.data.totalPages;
  } catch {
    loadError.value = "Tidak dapat menghubungi server";
    staffList.value = [];
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
            <h1>Jadwal Petugas Ibadah</h1>
            <ol class="breadcrumb">
              <li class="breadcrumb-item"><RouterLink :to="{ name: 'home' }">Beranda</RouterLink></li>
              <li class="breadcrumb-item active">Jadwal Petugas Ibadah</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section ref="listTopRef">
    <div class="gap">
      <div class="container">
        <div v-if="loading" class="site-staff-status text-center">
          <p><i class="fas fa-spinner fa-spin theme-clr"></i> Memuat jadwal petugas…</p>
        </div>

        <div v-else-if="loadError" class="site-staff-status text-center site-staff-status--warn">
          <p><i class="fas fa-exclamation-circle theme-clr"></i> {{ loadError }}</p>
          <button type="button" class="theme-btn theme-bg brd-rd5" @click="loadPage(currentPage || 1)">
            Coba lagi
          </button>
        </div>

        <div v-else-if="showEmpty">
          <SiteNotFoundPanel
            kind="data"
            description="Jadwal petugas ibadah belum dipublikasikan. Silakan kembali lagi nanti atau"
            :show-search="false"
          />
        </div>

        <template v-else>
          <div class="team-sec remove-ext7">
            <div class="row">
              <div
                v-for="item in staffList"
                :key="item.id"
                class="col-md-4 col-sm-6 col-lg-4"
              >
                <div class="team-bx text-center">
                  <div class="team-thmb brd-rd5 site-staff-thmb">
                    <span v-if="item.day !== '—'" class="site-staff-date">{{ item.day }} <i>{{ item.month }}</i></span>
                    <span class="site-staff-img-wrap">
                      <img :src="item.imageUrl" :alt="item.mainOfficer" />
                    </span>
                  </div>
                  <div class="team-inf brd-rd5">
                    <div v-if="item.contactTel || item.contactWa" class="scl1">
                      <a
                        v-if="item.contactTel"
                        :href="item.contactTel"
                        title="Telepon petugas"
                      ><i class="fas fa-phone"></i></a>
                      <a
                        v-if="item.contactWa"
                        :href="item.contactWa"
                        target="_blank"
                        rel="noopener noreferrer"
                        title="WhatsApp"
                      ><i class="fab fa-whatsapp"></i></a>
                    </div>
                    <p v-if="item.title" class="site-staff-schedule-date">{{ item.title }}</p>
                    <h5>{{ item.mainOfficer }}</h5>
                    <span>{{ item.roleLabel }}</span>
                    <p v-if="item.backup" class="site-staff-backup">Pengganti: {{ item.backup }}</p>
                    <p v-if="item.excerptPlain" class="site-staff-excerpt">{{ item.excerptPlain }}</p>
                  </div>
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
              <template v-for="(token, idx) in pageTokens" :key="`${token}-${idx}`">
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
.site-staff-status {
  padding: 48px 20px;
  color: #666;
}

.site-staff-status h4 {
  margin: 16px 0 8px;
  color: #333;
}

.site-staff-status p {
  margin: 0;
  max-width: 420px;
  margin-left: auto;
  margin-right: auto;
}

.site-staff-status--warn p {
  color: #856404;
  margin-bottom: 16px;
}

.site-staff-empty-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 8px;
}

.site-staff-thmb {
  position: relative;
}

.site-staff-date {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 2;
  background: var(--theme-color, #c9a227);
  color: #fff;
  padding: 6px 10px;
  border-radius: 4px;
  font-weight: 700;
  line-height: 1.2;
  font-size: 0.95rem;
}

.site-staff-date i {
  display: block;
  font-style: normal;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.site-staff-img-wrap {
  display: block;
}

.site-staff-img-wrap img {
  width: 100%;
  display: block;
}

.site-staff-schedule-date {
  margin: 0 0 6px;
  font-size: 0.8rem;
  color: #999;
  text-transform: capitalize;
}

.site-staff-backup {
  margin: 8px 0 0;
  font-size: 0.85rem;
  color: #666;
}

.site-staff-excerpt {
  margin: 10px 0 0;
  font-size: 0.88rem;
  color: #777;
  line-height: 1.5;
}

/* Scoped menimpa template — putih saat hover hijau */
.team-bx:hover .team-inf > h5,
.team-bx:hover .team-inf > span,
.team-bx:hover .team-inf .site-staff-schedule-date,
.team-bx:hover .team-inf .site-staff-backup,
.team-bx:hover .team-inf .site-staff-excerpt {
  color: #fff;
}

.pagination > li.disabled {
  opacity: 0.45;
  pointer-events: none;
}
</style>
