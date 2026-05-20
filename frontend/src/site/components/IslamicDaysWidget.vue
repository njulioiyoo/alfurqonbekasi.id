<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { getLatestIslamicDays, type IslamicDayItem } from "../api.js";
import "../styles/islamic-days-widget.css";

const items = ref<IslamicDayItem[]>([]);
const year = ref<number | null>(null);
const loading = ref(true);
const sourceUrl = ref("https://www.islamicfinder.org/specialislamicdays/");

const hijriLabel = computed(() => {
  if (year.value === 2026) return "(1447 - 1448 A.H)";
  return "";
});

const headingYear = computed(() => {
  if (!year.value) return "";
  return hijriLabel.value ? `${year.value} ${hijriLabel.value}` : String(year.value);
});

/** Urutan kronologis naik seperti daftar IslamicFinder. */
const displayItems = computed(() =>
  [...items.value].sort((a, b) => a.dateIso.localeCompare(b.dateIso))
);

onMounted(async () => {
  loading.value = true;
  const data = await getLatestIslamicDays(4);
  items.value = data.items;
  year.value = data.year;
  sourceUrl.value = data.sourceUrl;
  loading.value = false;
});
</script>

<template>
  <div class="if-days" aria-label="Kalender Hari Besar Islam">
    <p v-if="loading" class="if-days__state">Memuat kalender…</p>
    <template v-else-if="displayItems.length">
      <div class="if-days__head">
        <div class="if-days__title">Special Islamic Days</div>
        <div v-if="headingYear" class="if-days__year">{{ headingYear }}</div>
      </div>
      <ul class="if-days__list">
        <li v-for="row in displayItems" :key="row.dateIso" class="if-days__row">
          <div class="if-days__date">
            <span class="if-days__day">{{ row.day }}</span>
            <span class="if-days__month">{{ row.month }}</span>
          </div>
          <div class="if-days__info">
            <a
              class="if-days__name"
              :href="row.link"
              target="_blank"
              rel="noopener noreferrer"
            >{{ row.title }}</a>
            <span class="if-days__sub">{{ row.subtitle }}</span>
          </div>
        </li>
      </ul>
      <a
        class="if-days__more"
        :href="sourceUrl"
        target="_blank"
        rel="noopener noreferrer"
      >Lihat semua di IslamicFinder</a>
    </template>
    <p v-else class="if-days__state">Kalender tidak tersedia.</p>
  </div>
</template>
