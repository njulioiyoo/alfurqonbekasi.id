<script setup lang="ts">
import { ref, watch } from "vue";
import { imagePlaceholderDataUrl } from "../utils/image-placeholder.js";

const props = withDefaults(
  defineProps<{
    src: string;
    /** Gambar cadangan dari template (event-img, gallery, dll). */
    fallback: string;
    alt?: string;
    placeholderTitle?: string;
  }>(),
  { alt: "", placeholderTitle: "Gambar tidak tersedia" }
);

const placeholder = imagePlaceholderDataUrl(props.placeholderTitle);
const displaySrc = ref(resolveInitial());

function resolveInitial(): string {
  const primary = props.src?.trim() ?? "";
  if (!primary) return props.fallback?.trim() || placeholder;
  return primary;
}

function onError(): void {
  const fb = props.fallback?.trim() || "";
  if (displaySrc.value !== fb && fb) {
    displaySrc.value = fb;
    return;
  }
  if (displaySrc.value !== placeholder) {
    displaySrc.value = placeholder;
  }
}

watch(
  () => [props.src, props.fallback] as const,
  () => {
    displaySrc.value = resolveInitial();
  }
);
</script>

<template>
  <img
    class="site-img"
    :class="{ 'site-img--placeholder': displaySrc === placeholder }"
    :src="displaySrc"
    :alt="alt"
    loading="lazy"
    decoding="async"
    @error="onError"
  />
</template>

<style scoped>
.site-img {
  display: block;
  width: 100%;
  height: auto;
}

.site-img--placeholder {
  object-fit: cover;
  min-height: 120px;
  background: #eef1f6;
}
</style>
