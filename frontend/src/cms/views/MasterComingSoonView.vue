<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();

const title = computed(() => (route.meta.title as string) || "Master");
const hint = computed(() => (route.meta.hint as string) || "Halaman ini akan dihubungkan ke API.");
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
          <p class="kt-font-muted mb-0">{{ hint }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
