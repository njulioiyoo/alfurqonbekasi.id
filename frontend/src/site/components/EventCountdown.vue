<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";

const props = defineProps<{
  /** Timestamp target (UTC ms), dari Attr3 waktu mulai. */
  targetMs: number | null;
}>();

const now = ref(Date.now());
let timer: ReturnType<typeof setInterval> | null = null;

const ended = computed(() => props.targetMs == null || props.targetMs <= now.value);

const parts = computed(() => {
  if (ended.value || props.targetMs == null) {
    return { days: "00", hours: "00", minutes: "00", seconds: "00" };
  }
  let diff = Math.max(0, props.targetMs - now.value);
  const days = Math.floor(diff / 86400000);
  diff -= days * 86400000;
  const hours = Math.floor(diff / 3600000);
  diff -= hours * 3600000;
  const minutes = Math.floor(diff / 60000);
  diff -= minutes * 60000;
  const seconds = Math.floor(diff / 1000);
  return {
    days: String(days).padStart(2, "0"),
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
  };
});

onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now();
  }, 1000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<template>
  <ul class="countdown text-center" :class="{ 'is-ended': ended }">
    <li>
      <span class="days">{{ parts.days }}</span>
      <p class="days_ref">hari</p>
    </li>
    <li>
      <span class="hours">{{ parts.hours }}</span>
      <p class="hours_ref">jam</p>
    </li>
    <li>
      <span class="minutes">{{ parts.minutes }}</span>
      <p class="minutes_ref">menit</p>
    </li>
    <li>
      <span class="seconds">{{ parts.seconds }}</span>
      <p class="seconds_ref">detik</p>
    </li>
  </ul>
</template>
