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
const hasVisiMisi = computed(() => hasVisi.value || hasMisi.value);

const introText = computed(() => {
  if (tagline.value) return tagline.value;
  return `${siteName.value} melayani jamaah melalui ibadah berjamaah, kajian rutin, dan kegiatan kemasyarakatan di ${cfg.value?.city || "Bekasi"}.`;
});

const quickLinks = [
  { icon: "flaticon-open-book", label: "Jadwal Kajian", route: "jadwal-kajian" as const },
  { icon: "flaticon-mosque", label: "Jadwal Petugas", route: "jadwal-petugas" as const },
  { icon: "flaticon-mosque", label: "Penyewaan Aula", route: "penyewaan-aula" as const },
  { icon: "far fa-envelope", label: "Kontak", route: "kontak" as const },
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

  <section class="site-about">
    <div class="gap">
      <div class="container">
        <div v-if="loading" class="site-about__loading text-center">
          <p><i class="fas fa-spinner fa-spin theme-clr"></i> Memuat profil masjid…</p>
        </div>

        <template v-else>
          <div class="row align-items-center site-about__intro">
            <div class="col-lg-5 col-md-6 col-sm-12">
              <div class="site-about__photo brd-rd5">
                <img :src="`${B}/images/resources/abt-img.jpg`" :alt="siteName" />
              </div>
            </div>
            <div class="col-lg-7 col-md-6 col-sm-12">
              <div class="sec-tl site-about__title">
                <span class="theme-clr">Profil</span>
                <h2>{{ siteName }}</h2>
                <img :src="`${B}/images/pshapeg.png`" alt="" />
              </div>
              <p class="site-about__lead">{{ introText }}</p>

              <ul v-if="fullAddress || cfg?.adminPhone || cfg?.adminEmail" class="site-about__meta">
                <li v-if="fullAddress">
                  <i class="fas fa-map-marker-alt theme-clr"></i>
                  <span>{{ fullAddress }}</span>
                </li>
                <li v-if="cfg?.adminPhone">
                  <i class="flaticon-phone-volume theme-clr"></i>
                  <span>{{ cfg.adminPhone }}</span>
                </li>
                <li v-if="cfg?.adminEmail">
                  <i class="far fa-envelope theme-clr"></i>
                  <a :href="`mailto:${cfg.adminEmail}`">{{ cfg.adminEmail }}</a>
                </li>
              </ul>

              <RouterLink class="theme-btn theme-bg brd-rd5" :to="{ name: 'kontak' }">Hubungi Pengurus</RouterLink>
            </div>
          </div>
        </template>
      </div>
    </div>
  </section>

  <section v-if="!loading" class="site-about-vm">
    <div class="gap site-about-vm__section">
      <div class="container">
        <div class="sec-tl text-center site-about-vm__intro">
          <span class="theme-clr">Arah & Tujuan</span>
          <h2>Visi & Misi</h2>
          <img :src="`${B}/images/pshapeg.png`" alt="" />
        </div>

        <div v-if="hasVisiMisi" class="site-about-vm__board brd-rd10">
          <div
            class="site-about-vm__columns"
            :class="{
              'site-about-vm__columns--solo': hasVisi !== hasMisi,
            }"
          >
            <div v-if="hasVisi" class="site-about-vm__col">
              <header class="site-about-vm__col-head">
                <span class="site-about-vm__icon theme-bg brd-rd50">
                  <i class="flaticon-mosque"></i>
                </span>
                <div class="site-about-vm__col-titles">
                  <h3>Visi</h3>
                </div>
              </header>
              <div class="site-about-vm__body site-about__rich" v-html="cfg!.visi"></div>
            </div>

            <div v-if="hasVisi && hasMisi" class="site-about-vm__divider" aria-hidden="true"></div>

            <div v-if="hasMisi" class="site-about-vm__col">
              <header class="site-about-vm__col-head">
                <span class="site-about-vm__icon theme-bg brd-rd50">
                  <i class="flaticon-open-book"></i>
                </span>
                <div class="site-about-vm__col-titles">
                  <h3>Misi</h3>
                </div>
              </header>
              <div class="site-about-vm__body site-about__rich" v-html="cfg!.misi"></div>
            </div>
          </div>
        </div>

        <p v-else class="site-about-vm__empty text-center">
          Visi dan misi masjid akan segera dipublikasikan di halaman ini.
        </p>
      </div>
    </div>
  </section>

  <section v-if="!loading && cfg?.mapsEmbedUrl" class="site-about">
    <div class="gap">
      <div class="container">
        <div class="sec-tl text-center">
          <span class="theme-clr">Lokasi</span>
          <h2>Temukan Kami</h2>
          <img :src="`${B}/images/pshapeg.png`" alt="" />
        </div>
        <div class="site-about__map brd-rd5">
          <iframe
            :src="cfg.mapsEmbedUrl"
            title="Peta lokasi masjid"
            allowfullscreen
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>
      </div>
    </div>
  </section>

  <section class="site-about">
    <div class="gap white-layer opc7">
      <div class="fixed-bg" :style="{ backgroundImage: `url(${B}/images/parallax1.jpg)` }"></div>
      <div class="container">
        <div class="sec-tl text-center">
          <span class="theme-clr">Akses Cepat</span>
          <h2>Layanan Jamaah</h2>
        </div>
        <div class="serv-wrp remove-ext3">
          <div class="row">
            <div v-for="link in quickLinks" :key="link.route" class="col-md-3 col-sm-6 col-lg-3">
              <div class="serv-bx text-center">
                <i :class="[link.icon, 'theme-clr']"></i>
                <h5>
                  <RouterLink :to="{ name: link.route }">{{ link.label }}</RouterLink>
                </h5>
                <div class="srv-inf theme-bg brd-rd10">
                  <p>
                    <RouterLink :to="{ name: link.route }">Buka halaman</RouterLink>
                  </p>
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
.site-about__loading {
  padding: 48px 16px;
  color: #666;
}

/* Intro: layout LTR normal, tanpa abt-sec-wrp RTL */
.site-about__intro {
  direction: ltr;
}

.site-about__photo {
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
}

.site-about__photo img {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 5 / 4;
  object-fit: cover;
}

.site-about__title {
  float: none;
  display: inline-block;
  text-align: left;
  margin-bottom: 0;
}

.site-about__lead {
  margin: 18px 0 0;
  font-family: Merriweather, serif;
  font-size: 15px;
  line-height: 1.75;
  color: #555;
  max-width: 36rem;
}

.site-about__meta {
  list-style: none;
  padding: 0;
  margin: 22px 0 26px;
}

.site-about__meta li {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
  font-size: 15px;
  color: #444;
  line-height: 1.5;
}

.site-about__meta i {
  margin-top: 3px;
  flex-shrink: 0;
  width: 20px;
  text-align: center;
}

.site-about__meta a {
  color: inherit;
  text-decoration: underline;
}

.site-about__meta a:hover {
  color: #0a9f4f;
}

/* —— Visi & Misi —— */
.site-about-vm__section {
  background: linear-gradient(180deg, #f7faf8 0%, #fff 48%);
}

.site-about-vm__intro {
  margin-bottom: 8px;
}

.site-about-vm__board {
  margin-top: 28px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  direction: ltr;
}

.site-about-vm__columns {
  display: flex;
  align-items: stretch;
}

.site-about-vm__columns--solo .site-about-vm__col {
  max-width: 820px;
  margin: 0 auto;
}

.site-about-vm__col {
  flex: 1 1 50%;
  padding: 36px 40px 40px;
  min-width: 0;
}

.site-about-vm__divider {
  flex: 0 0 1px;
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(0, 0, 0, 0.08) 12%,
    rgba(0, 0, 0, 0.08) 88%,
    transparent 100%
  );
}

.site-about-vm__col-head {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  padding-bottom: 18px;
  border-bottom: 2px solid rgba(10, 159, 79, 0.15);
}

.site-about-vm__icon {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 24px;
}

.site-about-vm__col-titles {
  text-align: left;
}

.site-about-vm__col-titles h3 {
  margin: 0;
  font-family: Philosopher, sans-serif;
  font-size: 1.5rem;
  line-height: 1.3;
  color: #222;
}

.site-about-vm__body {
  padding-top: 4px;
}

.site-about-vm__empty {
  margin: 28px 0 0;
  padding: 32px 20px;
  font-family: Merriweather, serif;
  font-size: 15px;
  color: #777;
  background: #fff;
  border: 1px dashed #ddd;
  border-radius: 10px;
}

.site-about__map {
  overflow: hidden;
  height: 380px;
  width: 100%;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.1);
}

.site-about__map iframe {
  width: 100%;
  height: 100%;
  border: 0;
}

.site-about__rich :deep(p),
.site-about__rich :deep(li) {
  margin: 0 0 0.75rem;
  font-family: Merriweather, serif;
  font-size: 14.5px;
  line-height: 1.7;
  color: #555;
}

.site-about__rich :deep(p:last-child),
.site-about__rich :deep(ul:last-child),
.site-about__rich :deep(ol:last-child) {
  margin-bottom: 0;
}

.site-about__rich :deep(ul),
.site-about__rich :deep(ol) {
  padding-left: 1.2rem;
  margin: 0 0 0.75rem;
}

.site-about__rich :deep(h1),
.site-about__rich :deep(h2),
.site-about__rich :deep(h3),
.site-about__rich :deep(h4) {
  margin: 1rem 0 0.5rem;
  font-family: Philosopher, sans-serif;
  color: #333;
  font-size: 1.1rem;
}

@media (max-width: 991px) {
  .site-about__intro {
    text-align: center;
  }

  .site-about__title {
    text-align: center;
    display: block;
  }

  .site-about__lead {
    margin-left: auto;
    margin-right: auto;
  }

  .site-about__meta {
    text-align: left;
    max-width: 28rem;
    margin-left: auto;
    margin-right: auto;
  }

  .site-about__photo {
    margin-bottom: 28px;
    max-width: 420px;
    margin-left: auto;
    margin-right: auto;
  }

  .site-about-vm__columns {
    flex-direction: column;
  }

  .site-about-vm__divider {
    flex: 0 0 auto;
    height: 1px;
    width: auto;
    margin: 0 24px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(0, 0, 0, 0.08) 12%,
      rgba(0, 0, 0, 0.08) 88%,
      transparent 100%
    );
  }

  .site-about-vm__col {
    padding: 28px 24px 32px;
  }

  .site-about-vm__columns--solo .site-about-vm__col {
    max-width: none;
  }
}
</style>
