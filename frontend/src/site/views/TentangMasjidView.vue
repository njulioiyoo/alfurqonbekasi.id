<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { getPublicConfig, type SiteConfig } from "../api.js";
import { plainTextFromHtml } from "../utils/html-text.js";

const B = "/bismillah/assets";
const cfg = ref<SiteConfig | null>(null);
const loading = ref(true);

const siteName = computed(() => cfg.value?.websiteName || "Masjid Alfurqon Bekasi");
const tagline = computed(() => cfg.value?.websiteTagline?.trim() || "");
const fullAddress = computed(() => {
  if (!cfg.value) return "";
  const parts = [cfg.value.address, cfg.value.city, cfg.value.province].filter(Boolean);
  if (cfg.value.postalCode) parts.push(cfg.value.postalCode);
  return parts.join(", ");
});

const hasVisi = computed(() => plainTextFromHtml(cfg.value?.visi ?? "").length > 0);
const hasMisi = computed(() => plainTextFromHtml(cfg.value?.misi ?? "").length > 0);
const introText = computed(() => {
  if (tagline.value) return tagline.value;
  return `${siteName.value} adalah pusat kegiatan ibadah dan kemasyarakatan umat Islam di ${cfg.value?.city || "Bekasi"}. Kami menyelenggarakan kajian rutin, pengajian, layanan jamaah, serta fasilitas aula untuk kegiatan yang sesuai syariat.`;
});

const services = [
  {
    icon: "flaticon-open-book",
    title: "Jadwal Kajian",
    desc: "Informasi kegiatan pengajian, tabligh, dan acara keagamaan yang dipublikasikan pengurus masjid.",
    route: "jadwal-kajian" as const,
  },
  {
    icon: "flaticon-mosque",
    title: "Jadwal Petugas Ibadah",
    desc: "Jadwal petugas imam, muadzin, dan khotib untuk ibadah harian maupun Jumat.",
    route: "jadwal-petugas" as const,
  },
  {
    icon: "flaticon-mosque",
    title: "Penyewaan Aula",
    desc: "Pengajuan sewa aula/gedung masjid untuk acara yang memenuhi ketentuan pengurus.",
    route: "penyewaan-aula" as const,
  },
  {
    icon: "far fa-envelope",
    title: "Hubungi Pengurus",
    desc: "Sampaikan pertanyaan, kerjasama, atau informasi layanan melalui formulir kontak resmi.",
    route: "kontak" as const,
  },
];

onMounted(async () => {
  loading.value = true;
  try {
    cfg.value = await getPublicConfig();
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section>
    <div class="gap black-layer opc7">
      <div class="fixed-bg2" :style="{ backgroundImage: `url(${B}/images/pg-tp-bg.jpg)` }"></div>
      <div class="container">
        <div class="pg-tp-wrp text-center">
          <div class="pg-tp-inr">
            <h1>Tentang Masjid</h1>
            <ol class="breadcrumb">
              <li class="breadcrumb-item"><RouterLink :to="{ name: 'home' }">Beranda</RouterLink></li>
              <li class="breadcrumb-item active">Tentang Masjid</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section>
    <div class="gap">
      <div class="container">
        <div v-if="loading" class="site-about-status text-center">
          <p><i class="fas fa-spinner fa-spin theme-clr"></i> Memuat profil masjid…</p>
        </div>
        <template v-else>
          <div class="abt-sec-wrp">
            <div class="row">
              <div class="col-md-6 col-sm-12 col-lg-6">
                <div class="abt-vdo brd-rd5">
                  <img :src="`${B}/images/resources/abt-img.jpg`" :alt="siteName" />
                </div>
              </div>
              <div class="col-md-6 col-sm-12 col-lg-6">
                <div class="abt-desc">
                  <div class="sec-tl">
                    <span class="theme-clr">Profil</span>
                    <h2>{{ siteName }}</h2>
                    <img :src="`${B}/images/pshapeg.png`" alt="" />
                  </div>
                  <p>{{ introText }}</p>
                  <ul v-if="fullAddress || cfg?.adminPhone || cfg?.adminEmail" class="site-about-contact-list">
                    <li v-if="fullAddress">
                      <i class="fas fa-map-marker-alt theme-clr"></i> {{ fullAddress }}
                    </li>
                    <li v-if="cfg?.adminPhone">
                      <i class="fas fa-phone theme-clr"></i> {{ cfg.adminPhone }}
                    </li>
                    <li v-if="cfg?.adminEmail">
                      <i class="far fa-envelope theme-clr"></i>
                      <a :href="`mailto:${cfg.adminEmail}`">{{ cfg.adminEmail }}</a>
                    </li>
                  </ul>
                  <RouterLink class="theme-btn theme-bg brd-rd5" :to="{ name: 'kontak' }">Hubungi Kami</RouterLink>
                </div>
              </div>
            </div>
          </div>

          <div v-if="hasVisi || hasMisi" class="site-about-vm row kt-margin-t-30">
            <div v-if="hasVisi" class="col-md-6 col-sm-12 col-lg-6">
              <div class="site-about-vm-box brd-rd5">
                <h3>Visi</h3>
                <div class="site-rich-html" v-html="cfg!.visi"></div>
              </div>
            </div>
            <div v-if="hasMisi" class="col-md-6 col-sm-12 col-lg-6">
              <div class="site-about-vm-box brd-rd5">
                <h3>Misi</h3>
                <div class="site-rich-html" v-html="cfg!.misi"></div>
              </div>
            </div>
          </div>

          <div v-if="cfg?.mapsEmbedUrl" class="site-about-map kt-margin-t-30 brd-rd5">
            <iframe
              :src="cfg.mapsEmbedUrl"
              title="Peta lokasi masjid"
              allowfullscreen
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </template>
      </div>
    </div>
  </section>

  <section>
    <div class="gap white-layer opc7">
      <div class="fixed-bg" :style="{ backgroundImage: `url(${B}/images/parallax1.jpg)` }"></div>
      <div class="container">
        <div class="sec-tl text-center">
          <span class="theme-clr">Informasi Publik</span>
          <h2>Layanan & Halaman</h2>
          <img :src="`${B}/images/pshapeg.png`" alt="" />
        </div>
        <div class="serv-wrp remove-ext3">
          <div class="row">
            <div v-for="svc in services" :key="svc.route" class="col-md-3 col-sm-6 col-lg-3">
              <div class="serv-bx text-center">
                <i :class="[svc.icon, 'theme-clr']"></i>
                <h5>
                  <RouterLink :to="{ name: svc.route }">{{ svc.title }}</RouterLink>
                </h5>
                <div class="srv-inf theme-bg brd-rd10">
                  <p>{{ svc.desc }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.site-about-status {
  padding: 48px 16px;
  color: #666;
}

.site-about-contact-list {
  list-style: none;
  padding: 0;
  margin: 0 0 20px;
}

.site-about-contact-list li {
  margin-bottom: 10px;
  color: #555;
  line-height: 1.5;
}

.site-about-contact-list i {
  margin-right: 8px;
  width: 18px;
}

.site-about-vm-box {
  background: #f8f9fa;
  padding: 24px;
  height: 100%;
  border: 1px solid #eee;
}

.site-about-vm-box h3 {
  margin: 0 0 12px;
  color: #333;
}

.site-about-map {
  overflow: hidden;
  height: 360px;
}

.site-about-map iframe {
  width: 100%;
  height: 100%;
  border: 0;
}

.site-rich-html :deep(p) {
  margin-bottom: 0.75rem;
  line-height: 1.65;
  color: #555;
}

.site-rich-html :deep(ul),
.site-rich-html :deep(ol) {
  padding-left: 1.25rem;
  margin-bottom: 0.75rem;
  color: #555;
}

.site-rich-html :deep(li) {
  margin-bottom: 0.35rem;
}
</style>
