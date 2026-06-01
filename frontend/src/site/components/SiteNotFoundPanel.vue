<script setup lang="ts">
import { computed, ref } from "vue";
import { RouterLink, useRouter } from "vue-router";

/** UI error-page dari template Bismillah 404.html */
export type SiteNotFoundKind = "page" | "data" | "error";

const props = withDefaults(
  defineProps<{
    kind?: SiteNotFoundKind;
    /** Teks di bawah "error!" — default sesuai kind */
    statusLabel?: string;
    /** Paragraf utama; boleh HTML ringan via slot */
    description?: string;
    /** Tampilkan form search seperti template */
    showSearch?: boolean;
    /** Versi ringkas untuk embed di section beranda / list */
    compact?: boolean;
  }>(),
  {
    kind: "page",
    showSearch: undefined,
    compact: false,
  }
);

const router = useRouter();
const searchQuery = ref("");

const statusText = computed(() => {
  if (props.statusLabel?.trim()) return props.statusLabel.trim();
  if (props.kind === "data") return "data tidak ditemukan";
  if (props.kind === "error") return "gagal memuat data";
  return "halaman tidak ditemukan";
});

const descriptionText = computed(() => {
  if (props.description?.trim()) return props.description.trim();
  if (props.kind === "data") {
    return "Konten yang Anda cari belum tersedia atau belum dipublikasikan. Silakan coba lagi nanti atau";
  }
  if (props.kind === "error") {
    return "Terjadi gangguan saat memuat data. Periksa koneksi Anda atau coba lagi, atau";
  }
  return "Sepertinya halaman yang Anda minta tidak ada. Silakan kembali ke beranda atau";
});

const showSearchForm = computed(() => {
  if (props.showSearch !== undefined) return props.showSearch;
  return props.kind === "page" && !props.compact;
});

function onSearchSubmit(): void {
  const q = searchQuery.value.trim();
  void router.push({
    name: "jadwal-kajian",
    query: q ? { q } : undefined,
  });
}
</script>

<template>
  <div class="error-page" :class="{ 'error-page--compact': compact }">
    <div class="error-page-inner">
      <h1>4<i class="theme-clr">0</i>4</h1>
      <span>error! <span class="theme-clr">{{ statusText }}</span></span>
      <p>
        {{ descriptionText }}
        <RouterLink class="theme-clr" :to="{ name: 'home' }">Kembali ke Beranda</RouterLink>
        <template v-if="kind !== 'page'">
          atau <RouterLink class="theme-clr" :to="{ name: 'kontak' }">Hubungi Pengurus</RouterLink>
        </template>
      </p>
      <form
        v-if="showSearchForm"
        class="search-form brd-rd30"
        @submit.prevent="onSearchSubmit"
      >
        <input v-model="searchQuery" type="text" placeholder="Masukkan kata kunci" />
        <button class="theme-btn theme-bg brd-rd30" type="submit">Cari Kegiatan</button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.error-page--compact {
  padding: 2rem 0 1rem;
}

.error-page--compact .error-page-inner > h1 {
  font-size: clamp(4rem, 12vw, 8rem);
}

.error-page--compact .error-page-inner > span {
  font-size: 1rem;
}
</style>
