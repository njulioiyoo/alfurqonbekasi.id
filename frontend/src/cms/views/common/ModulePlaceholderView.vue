<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const title = computed(() => (route.meta.title as string) || "Modul");
const desc = computed(
  () =>
    (route.meta.desc as string) ||
    "Modul ini sudah disiapkan di menu dan akan dilanjutkan implementasi fiturnya."
);
</script>

<template>
  <div class="row">
    <div class="col-12">
      <div class="kt-portlet">
        <div class="kt-portlet__head">
          <div class="kt-portlet__head-label">
            <h3 class="kt-portlet__head-title">{{ title }}</h3>
          </div>
        </div>
        <div class="kt-portlet__body">
          <div class="alert alert-outline-brand fade show" role="alert">
            <div class="alert-text">{{ desc }}</div>
          </div>
          <p class="kt-font-muted mb-0">
            Placeholder aktif agar alur menu dan permission bisa dipakai dulu sambil bertahap menambah CRUD.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
