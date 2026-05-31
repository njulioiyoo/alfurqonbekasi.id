<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { getPublicConfig, type SiteConfig } from "../api.js";

const B = "/bismillah/assets";
const cfg = ref<SiteConfig | null>(null);

const siteName = computed(() => cfg.value?.websiteName || "Masjid Alfurqon Bekasi");
const contactEmail = computed(() => cfg.value?.adminEmail?.trim() || "");
const lastUpdated = "31 Mei 2026";

onMounted(async () => {
  cfg.value = await getPublicConfig();
});
</script>

<template>
  <section>
    <div class="gap black-layer opc7">
      <div class="fixed-bg2" :style="{ backgroundImage: `url(${B}/images/pg-tp-bg.jpg)` }"></div>
      <div class="container">
        <div class="pg-tp-wrp text-center">
          <div class="pg-tp-inr">
            <h1>Kebijakan Privasi</h1>
            <ol class="breadcrumb">
              <li class="breadcrumb-item"><RouterLink :to="{ name: 'home' }">Beranda</RouterLink></li>
              <li class="breadcrumb-item active">Kebijakan Privasi</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section>
    <div class="gap">
      <div class="container">
        <div class="site-legal-doc">
          <p class="site-legal-updated">Terakhir diperbarui: {{ lastUpdated }}</p>

          <p>
            Kebijakan privasi ini menjelaskan bagaimana <strong>{{ siteName }}</strong> (“kami”) mengumpulkan,
            menggunakan, dan melindungi informasi pengunjung situs web resmi masjid.
          </p>

          <h2>1. Informasi yang kami kumpulkan</h2>
          <ul>
            <li>
              <strong>Formulir kontak & penyewaan aula</strong> — nama, nomor telepon, email, dan pesan yang Anda
              kirimkan secara sukarela.
            </li>
            <li>
              <strong>Data teknis</strong> — alamat IP, jenis perangkat, browser, dan halaman yang dikunjungi melalui
              log server atau layanan analitik (jika diaktifkan).
            </li>
            <li>
              <strong>Cookie</strong> — file kecil di perangkat Anda untuk fungsi situs, analitik, keamanan, dan
              penayangan iklan (Google AdSense).
            </li>
          </ul>

          <h2>2. Penggunaan informasi</h2>
          <p>Informasi digunakan untuk:</p>
          <ul>
            <li>Menanggapi pertanyaan, pengajuan sewa aula, dan komunikasi jamaah.</li>
            <li>Mengelola, mengamankan, dan meningkatkan situs web.</li>
            <li>Memahami statistik kunjungan melalui Google Analytics (jika dikonfigurasi).</li>
            <li>Menampilkan iklan relevan melalui Google AdSense.</li>
          </ul>

          <h2>3. Google AdSense & Analytics</h2>
          <p>
            Situs ini dapat menggunakan Google AdSense dan Google Analytics. Google dan mitra iklannya dapat
            menggunakan cookie untuk menayangkan iklan berdasarkan kunjungan sebelumnya ke situs ini atau situs
            lain. Anda dapat mempelajari cara Google menggunakan data di
            <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">Kebijakan Google</a>.
          </p>
          <p>
            Kelola preferensi iklan personal melalui
            <a href="https://adssettings.google.com/" target="_blank" rel="noopener noreferrer">Pengaturan Iklan Google</a>.
          </p>

          <h2>4. Berbagi data</h2>
          <p>
            Kami tidak menjual data pribadi pengunjung. Data dapat diproses oleh penyedia layanan teknis (hosting,
            email, Google) sejauh diperlukan untuk operasional situs.
          </p>

          <h2>5. Keamanan & retensi</h2>
          <p>
            Kami menerapkan langkah wajar untuk melindungi data. Pesan formulir disimpan selama diperlukan untuk
            keperluan administrasi masjid, lalu dihapus atau diarsipkan sesuai kebijakan internal.
          </p>

          <h2>6. Hak pengunjung</h2>
          <p>
            Anda dapat meminta akses, koreksi, atau penghapusan data pribadi yang kami simpan dengan
            <template v-if="contactEmail">
              menghubungi <a :href="`mailto:${contactEmail}`">{{ contactEmail }}</a>.
            </template>
            <template v-else>
              menghubungi pengurus melalui halaman <RouterLink :to="{ name: 'kontak' }">Kontak</RouterLink>.
            </template>
          </p>

          <h2>7. Perubahan kebijakan</h2>
          <p>
            Kebijakan ini dapat diperbarui sewaktu-waktu. Perubahan material akan ditampilkan di halaman ini dengan
            tanggal pembaruan terbaru.
          </p>

          <p class="site-legal-footer">
            <RouterLink :to="{ name: 'kontak' }" class="theme-btn theme-bg brd-rd5">Hubungi Kami</RouterLink>
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.site-legal-doc {
  max-width: 760px;
  margin: 0 auto;
  color: #444;
  line-height: 1.7;
}

.site-legal-updated {
  color: #888;
  font-size: 0.95rem;
  margin-bottom: 24px;
}

.site-legal-doc h2 {
  font-size: 1.25rem;
  margin: 28px 0 12px;
  color: #333;
}

.site-legal-doc ul {
  padding-left: 1.25rem;
  margin-bottom: 12px;
}

.site-legal-doc li {
  margin-bottom: 8px;
}

.site-legal-footer {
  margin-top: 32px;
  text-align: center;
}
</style>
