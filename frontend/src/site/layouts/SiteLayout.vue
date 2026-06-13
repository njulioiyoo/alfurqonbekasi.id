<script setup lang="ts">
import { computed, onMounted, nextTick, ref } from "vue";
import { RouterLink, RouterView } from "vue-router";
import { siteMenu } from "../menu.js";
import { getPublicConfig, type SiteConfig } from "../api.js";
import { applySiteIntegrations } from "../utils/site-integrations.js";

const B = "/bismillah/assets";
const cfg = ref<SiteConfig | null>(null);
const configReady = ref(false);

const maintenanceActive = computed(() => cfg.value?.maintenanceMode === true);

const siteName = computed(() => cfg.value?.websiteName || "Masjid Alfurqon Bekasi");
const phone = computed(() => cfg.value?.adminPhone || "");
const email = computed(() => cfg.value?.adminEmail || "");
const fullAddress = computed(() => {
  if (!cfg.value) return "";
  const parts = [cfg.value.address, cfg.value.city, cfg.value.province].filter(Boolean);
  if (cfg.value.postalCode) parts.push(cfg.value.postalCode);
  return parts.join(", ") || "Bekasi, Jawa Barat";
});
const shortLocation = computed(() => {
  if (!cfg.value) return "Bekasi, Jawa Barat";
  return [cfg.value.city, cfg.value.province].filter(Boolean).join(", ") || "Bekasi, Jawa Barat";
});
const logoUrl = computed(() => cfg.value?.logoUrl || `${B}/images/logogg.png`);
const logoSmUrl = computed(() => cfg.value?.logoLightUrl || cfg.value?.logoUrl || `${B}/images/logo2.png`);
const footerText = computed(() => cfg.value?.footerText || siteName.value);
const islamicDaysUrl = computed(
  () => cfg.value?.islamicDaysUrl?.trim() || "https://www.islamicfinder.org/specialislamicdays/"
);
type SocialLink = { url: string; icon: string; label: string };

const socials = computed((): SocialLink[] => {
  if (!cfg.value) return [];
  const list: SocialLink[] = [];
  if (cfg.value.igUrl) list.push({ url: cfg.value.igUrl, icon: "fab fa-instagram", label: "Instagram" });
  if (cfg.value.ytUrl) list.push({ url: cfg.value.ytUrl, icon: "fab fa-youtube", label: "YouTube" });
  if (cfg.value.fbUrl) list.push({ url: cfg.value.fbUrl, icon: "fab fa-facebook-f", label: "Facebook" });
  if (cfg.value.xUrl) list.push({ url: cfg.value.xUrl, icon: "fab fa-twitter", label: "X" });
  if (cfg.value.tiktokUrl) list.push({ url: cfg.value.tiktokUrl, icon: "fab fa-tiktok", label: "TikTok" });
  if (cfg.value.waChannelUrl) list.push({ url: cfg.value.waChannelUrl, icon: "fab fa-whatsapp", label: "WhatsApp" });
  return list;
});

const templateTopbarSocials: SocialLink[] = [
  { url: "#", icon: "fab fa-twitter", label: "Twitter" },
  { url: "#", icon: "fab fa-facebook-f", label: "Facebook" },
  { url: "#", icon: "fab fa-linkedin-in", label: "Linkedin" },
  { url: "#", icon: "fab fa-google-plus-g", label: "Google Plus" },
];

/** index4 topbar: tepat 4 ikon agar tinggi & lebar topbar sama template. */
const headerSocials = computed((): SocialLink[] => {
  const fromCfg = socials.value.slice(0, 4);
  return fromCfg.length > 0 ? fromCfg : templateTopbarSocials;
});

const displayPhone = computed(() => phone.value || "1800-123-456-7");
const displayEmail = computed(() => email.value || "support@bismillah.com");
const displayRspnPhone = computed(() => phone.value || "+(00) 123-345-11");
const displayRspnEmail = computed(() => email.value || "info@bismillah.com");

const year = computed(() => new Date().getFullYear());

function hidePreloader(): void {
  const $ = (window as unknown as Record<string, unknown>).jQuery as
    | ((sel: string) => { fadeOut?: (speed: string) => void })
    | undefined;
  if ($) {
    $(".preloader").fadeOut?.("slow");
  } else {
    const el = document.querySelector(".preloader") as HTMLElement | null;
    if (el) el.style.display = "none";
  }
}

onMounted(async () => {
  try {
    const loaded = await getPublicConfig();
    cfg.value = loaded;
    applySiteIntegrations(loaded);
  } finally {
    configReady.value = true;
    await nextTick();
    hidePreloader();
  }
});
</script>

<template>
  <div class="preloader">
    <div class="loader-inner ball-scale-multiple">
      <div></div>
      <div></div>
      <div></div>
    </div>
  </div>

  <main v-if="configReady && maintenanceActive" class="site-maintenance">
    <section class="site-maintenance-hero">
      <div class="container text-center">
        <div class="site-maintenance-logo">
          <img :src="logoUrl" :alt="siteName" />
        </div>
        <h1>{{ siteName }}</h1>
        <p class="site-maintenance-lead">Situs sedang dalam pemeliharaan</p>
        <p class="site-maintenance-desc">
          Kami sedang melakukan perbaikan singkat. Silakan kembali lagi nanti.
        </p>
        <ul v-if="phone || email" class="site-maintenance-contact">
          <li v-if="phone">
            <i class="flaticon-phone-volume theme-clr"></i>
            <span>{{ phone }}</span>
          </li>
          <li v-if="email">
            <i class="far fa-envelope theme-clr"></i>
            <a :href="`mailto:${email}`">{{ email }}</a>
          </li>
        </ul>
      </div>
    </section>
  </main>

  <main v-else-if="configReady">
    <header class="style2">
      <div class="topbar">
        <div class="container">
          <ul class="float-left tp-lnks">
            <li><i class="far fa-map theme-clr"></i>{{ shortLocation }}</li>
            <li><i class="far fa-clock theme-clr"></i>Mon - Sat 8:00 AM - 18:00 PM</li>
          </ul>
          <div class="scl1 float-right">
            <span>Follow us:</span>
            <a
              v-for="s in headerSocials"
              :key="s.label"
              :href="s.url"
              :title="s.label"
              target="_blank"
              rel="noopener noreferrer"
            ><i :class="s.icon"></i></a>
          </div>
        </div>
      </div>

      <div class="logo-inf-sec">
        <div class="container">
          <div class="logo">
            <RouterLink v-slot="{ href, navigate }" :to="{ name: 'home' }" custom>
              <a :href="href" title="Logo" @click="navigate"><img :src="logoUrl" :alt="siteName" /></a>
            </RouterLink>
          </div>
          <div class="float-right cnt-inf-btn">
            <ul class="inf-lst">
              <li>
                <i class="flaticon-phone-volume theme-clr brd-rd50"></i>Call us:
                <span class="theme-clr">{{ displayPhone }}</span>
              </li>
              <li>
                <i class="fas fa-envelope theme-clr brd-rd50"></i>
                <a :href="email ? `mailto:${email}` : '#'" :title="displayEmail">{{ displayEmail }}</a>
              </li>
            </ul>
            <RouterLink v-slot="{ href, navigate }" :to="{ name: 'kontak' }" custom>
              <a :href="href" class="theme-btn theme-bg brd-rd5" title="Hubungi pengurus masjid" @click="navigate">HUBUNGI KAMI</a>
            </RouterLink>
          </div>
        </div>
      </div>

      <!-- Desktop Navigation -->
      <div class="menu-sec theme-bg">
        <div class="container">
          <nav>
            <div>
              <ul>
                <template v-for="group in siteMenu" :key="group.label">
                  <li v-if="group.routeName && !group.children">
                    <RouterLink v-slot="{ href, navigate }" :to="{ name: group.routeName }" custom>
                      <a :href="href" :title="group.label" @click="navigate">{{ group.label }}</a>
                    </RouterLink>
                  </li>
                  <li v-else class="menu-item-has-children">
                    <a href="#" :title="group.label">{{ group.label }}</a><i class="fas fa-angle-down"></i>
                    <ul>
                      <li v-for="child in group.children" :key="child.routeName">
                        <RouterLink v-slot="{ href, navigate }" :to="{ name: child.routeName }" custom>
                          <a :href="href" :title="child.label" @click="navigate">{{ child.label }}</a>
                        </RouterLink>
                      </li>
                    </ul>
                  </li>
                </template>
              </ul>
              <div class="hdr-srch">
                <form>
                  <input type="text" placeholder="Search Here" />
                  <button type="submit"><i class="fa fa-search"></i></button>
                </form>
              </div>
            </div>
          </nav>
        </div>
        <div class="mnu-btm-shp">
          <i v-for="n in 50" :key="n" class="theme-bg" :class="`crl${n}`"></i>
        </div>
      </div>
    </header>

    <!-- Header Search Overlay -->
    <div class="header-search">
      <span class="srch-cls-btn brd-rd5"><i class="fas fa-times"></i></span>
      <form>
        <input type="text" placeholder="Search here..." />
        <button type="submit"><i class="fas fa-search"></i></button>
      </form>
    </div>

    <!-- Responsive Header -->
    <div class="rspn-hdr">
      <div class="rspn-mdbr">
        <ul class="rspn-scil">
          <li v-for="s in headerSocials" :key="`rspn-${s.label}`">
            <a :href="s.url" :title="s.label" target="_blank" rel="noopener noreferrer"><i :class="s.icon"></i></a>
          </li>
        </ul>
        <form class="rspn-srch" @submit.prevent>
          <input type="text" placeholder="Enter Your Keyword" />
          <button type="submit"><i class="fa fa-search"></i></button>
        </form>
      </div>
      <div class="lg-mn">
        <div class="logo">
          <RouterLink v-slot="{ href, navigate }" :to="{ name: 'home' }" custom>
            <a :href="href" title="Logo" @click="navigate"><img :src="logoSmUrl" :alt="siteName" /></a>
          </RouterLink>
        </div>
        <div class="rspn-cnt">
          <span><i class="fas fa-envelope theme-clr"></i><a :href="email ? `mailto:${email}` : '#'" :title="displayRspnEmail">{{ displayRspnEmail }}</a></span>
          <span><i class="flaticon-phone-volume theme-clr"></i>{{ displayRspnPhone }}</span>
        </div>
        <span class="rspn-mnu-btn"><i class="fa fa-list-ul"></i></span>
      </div>
      <div class="rsnp-mnu">
        <span class="rspn-mnu-cls"><i class="fa fa-times"></i></span>
        <ul>
          <template v-for="group in siteMenu" :key="group.label">
            <li v-if="group.routeName && !group.children">
              <RouterLink v-slot="{ href, navigate }" :to="{ name: group.routeName }" custom>
                <a :href="href" :title="group.label" @click="navigate">{{ group.label }}</a>
              </RouterLink>
            </li>
            <li v-else class="menu-item-has-children">
              <a href="#" :title="group.label">{{ group.label }}</a>
              <ul>
                <li v-for="child in group.children" :key="child.routeName">
                  <RouterLink v-slot="{ href, navigate }" :to="{ name: child.routeName }" custom>
                    <a :href="href" :title="child.label" @click="navigate">{{ child.label }}</a>
                  </RouterLink>
                </li>
              </ul>
            </li>
          </template>
        </ul>
      </div>
    </div>

    <!-- Page Content -->
    <RouterView />

    <!-- Footer -->
    <footer>
      <div class="gap no-gap">
        <img class="vector-bg-footer" :src="`${B}/images/bg-vector.png`" alt="" />
        <div class="container">
          <div class="footer-data brd-rd20 overlap-220">
            <div class="footer-data-inr">
              <div class="row">
                <div class="col-md-3 col-sm-6 col-lg-3">
                  <div class="widget">
                    <h5>{{ siteName }}</h5>
                    <p v-if="cfg?.websiteTagline">{{ cfg.websiteTagline }}</p>
                    <div v-if="cfg?.mapsEmbedUrl" class="site-footer-map brd-rd5">
                      <iframe :src="cfg.mapsEmbedUrl" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
                    </div>
                  </div>
                </div>
                <div class="col-md-3 col-sm-6 col-lg-3">
                  <div class="widget">
                    <h5>Tautan Cepat</h5>
                    <ul class="cnt-inf">
                      <li><RouterLink :to="{ name: 'home' }">Beranda</RouterLink></li>
                      <li><RouterLink :to="{ name: 'tentang-masjid' }">Tentang Masjid</RouterLink></li>
                      <li><RouterLink :to="{ name: 'jadwal-kajian' }">Jadwal Kajian</RouterLink></li>
                      <li><RouterLink :to="{ name: 'galeri-kegiatan' }">Galeri Kegiatan</RouterLink></li>
                      <li><RouterLink :to="{ name: 'penyewaan-aula' }">Penyewaan Aula</RouterLink></li>
                      <li><RouterLink :to="{ name: 'kontak' }">Kontak</RouterLink></li>
                      <li><RouterLink :to="{ name: 'kebijakan-privasi' }">Kebijakan Privasi</RouterLink></li>
                    </ul>
                  </div>
                </div>
                <div class="col-md-3 col-sm-6 col-lg-3">
                  <div class="widget">
                    <h5>Informasi Kontak</h5>
                    <ul class="cnt-inf">
                      <li v-if="email"><i class="far fa-envelope theme-clr"></i><a :href="`mailto:${email}`">{{ email }}</a></li>
                      <li v-if="phone"><i class="fas fa-phone theme-clr"></i><span>{{ phone }}</span></li>
                      <li v-if="fullAddress"><i class="fas fa-map-marker-alt theme-clr"></i>{{ fullAddress }}</li>
                    </ul>
                    <div v-if="socials.length" class="scl1">
                      <a v-for="s in socials" :key="s.label" :href="s.url" :title="s.label" target="_blank"><i :class="s.icon"></i></a>
                    </div>
                  </div>
                </div>
                <div class="col-md-3 col-sm-6 col-lg-3">
                  <div class="widget">
                    <h5>Hari Besar Islam</h5>
                    <div v-if="islamicDaysUrl" class="site-islamic-days">
                      <iframe
                        :src="islamicDaysUrl"
                        title="Kalender Hari Besar Islam"
                        scrolling="yes"
                      ></iframe>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="cpy-rgt text-center">
              <p>
                &copy; {{ year }}
                <RouterLink :to="{ name: 'home' }">{{ footerText }}</RouterLink>
                / HAK CIPTA DILINDUNGI —
                <RouterLink :to="{ name: 'kebijakan-privasi' }">Kebijakan Privasi</RouterLink>
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>

    <!-- Newsletter -->
    <section>
      <div class="gap theme-bg bottom-spac50 top-spac270">
        <div class="container">
          <div class="newsletter-wrp">
            <div class="row">
              <div class="col-md-4 col-sm-12 col-lg-4">
                <h4>Dapatkan Info Terbaru</h4>
              </div>
              <div class="col-md-8 col-sm-12 col-lg-8">
                <form class="newsletter brd-rd30" @submit.prevent>
                  <input type="email" placeholder="Masukkan alamat email Anda" />
                  <button type="submit" class="green-bg theme-btn">BERLANGGANAN</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<style>
.site-footer-map {
  width: 100%;
  height: 160px;
  overflow: hidden;
  margin-top: 10px;
}

.site-footer-map iframe {
  width: 100%;
  height: 100%;
  border: 0;
}

/* Sama seperti template Bismillah (300×260); scroll vertikal di dalam frame */
.site-islamic-days {
  margin-top: 5px;
  width: 300px;
  max-width: 100%;
  height: 260px;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
}

.site-islamic-days iframe {
  width: 300px;
  height: 260px;
  max-width: 100%;
  border: 0 dotted #ddd;
  display: block;
}

.site-maintenance {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
}

.site-maintenance-hero {
  width: 100%;
  padding: 60px 20px;
}

.site-maintenance-logo img {
  max-height: 90px;
  margin-bottom: 24px;
}

.site-maintenance h1 {
  font-size: 1.75rem;
  margin-bottom: 12px;
}

.site-maintenance-lead {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--theme-clr, #c9a227);
  margin-bottom: 8px;
}

.site-maintenance-desc {
  color: #666;
  max-width: 480px;
  margin: 0 auto 24px;
}

.site-maintenance-contact {
  list-style: none;
  padding: 0;
  margin: 0;
}

.site-maintenance-contact li {
  margin: 8px 0;
}

.site-maintenance-contact i {
  margin-right: 8px;
}
</style>
