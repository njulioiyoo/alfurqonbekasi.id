<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { storeToRefs } from "pinia";
import {
  CMS_ACCESS_DENIED_MESSAGE,
  CMS_ACCESS_DENIED_TITLE,
} from "../../constants/access-messages.js";
import { useAccessStore, menuRouteTarget } from "../../stores/access.js";

const route = useRoute();
const access = useAccessStore();
const { menu } = storeToRefs(access);

const moduleLabel = computed(() => {
  const q = route.query.module;
  return typeof q === "string" && q.trim() ? q.trim() : "";
});

const homeTarget = computed(() => {
  const first = menu.value[0];
  if (first) return menuRouteTarget(first);
  return { name: "dashboard" as const };
});
</script>

<template>
  <div class="row">
    <div class="col-12">
      <div class="kt-portlet">
        <div class="kt-portlet__body py-5">
          <div class="text-center cms-forbidden-wrap">
            <span class="kt-font-danger display-4 d-block mb-3">
              <i class="flaticon-lock" aria-hidden="true"></i>
            </span>
            <h3 class="kt-font-bolder mb-3">{{ CMS_ACCESS_DENIED_TITLE }}</h3>
            <p class="kt-font-muted mb-4">{{ CMS_ACCESS_DENIED_MESSAGE }}</p>
            <p v-if="moduleLabel" class="kt-font-muted small mb-4">
              Modul: <strong>{{ moduleLabel }}</strong>
            </p>
            <RouterLink :to="homeTarget" class="btn btn-brand btn-sm btn-bold">
              Kembali ke menu utama
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cms-forbidden-wrap {
  max-width: 520px;
  margin: 0 auto;
}
</style>
