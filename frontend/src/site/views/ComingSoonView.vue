<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

const B = "/bismillah/assets";
const route = useRoute();
const pageTitle = computed(() => (route.meta.title as string) || "Halaman");
</script>

<template>
  <!-- Page Header / Breadcrumb -->
  <section>
    <div class="gap white-layer opc7" style="padding-bottom: 30px;">
      <div class="fixed-bg" :style="{ backgroundImage: `url(${B}/images/parallax1.jpg)` }"></div>
      <div class="container">
        <div class="pg-tp-wrp text-center">
          <h1>{{ pageTitle }}</h1>
          <ol class="breadcrumb">
            <li class="breadcrumb-item"><router-link :to="{ name: 'home' }">Beranda</router-link></li>
            <li class="breadcrumb-item active">{{ pageTitle }}</li>
          </ol>
        </div>
      </div>
    </div>
  </section>

  <!-- Coming Soon Content -->
  <section>
    <div class="gap">
      <div class="container">
        <div class="text-center" style="padding: 60px 0;">
          <i class="flaticon-mosque theme-clr" style="font-size: 4rem;"></i>
          <h2 class="kt-margin-t-20" style="margin-top: 20px;">{{ pageTitle }}</h2>
          <p style="font-size: 1.1rem; color: #666; max-width: 500px; margin: 15px auto 30px;">
            Halaman ini sedang dalam pengembangan. Silakan kunjungi kembali nanti.
          </p>
          <router-link :to="{ name: 'home' }" class="theme-btn theme-bg brd-rd5" style="display: inline-block;">
            Kembali ke Beranda
          </router-link>
        </div>
      </div>
    </div>
  </section>
</template>
