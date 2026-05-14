<script setup lang="ts">
import { computed, onMounted, nextTick, ref } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";
import { siteMenu, type MenuGroup } from "../menu.js";
import { getPublicConfig, type SiteConfig } from "../api.js";

const B = "/bismillah/assets";
const route = useRoute();

const cfg = ref<SiteConfig | null>(null);

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
const islamicDaysUrl = computed(() => cfg.value?.islamicDaysUrl || "https://www.islamicfinder.org/specialislamicdays/");

const socials = computed(() => {
  if (!cfg.value) return [];
  const list: { url: string; icon: string; label: string }[] = [];
  if (cfg.value.igUrl) list.push({ url: cfg.value.igUrl, icon: "fab fa-instagram", label: "Instagram" });
  if (cfg.value.ytUrl) list.push({ url: cfg.value.ytUrl, icon: "fab fa-youtube", label: "YouTube" });
  if (cfg.value.fbUrl) list.push({ url: cfg.value.fbUrl, icon: "fab fa-facebook-f", label: "Facebook" });
  if (cfg.value.xUrl) list.push({ url: cfg.value.xUrl, icon: "fab fa-twitter", label: "X" });
  if (cfg.value.tiktokUrl) list.push({ url: cfg.value.tiktokUrl, icon: "fab fa-tiktok", label: "TikTok" });
  if (cfg.value.waChannelUrl) list.push({ url: cfg.value.waChannelUrl, icon: "fab fa-whatsapp", label: "WhatsApp" });
  return list;
});

function isActive(group: MenuGroup): boolean {
  if (group.routeName) return route.name === group.routeName;
  return group.children?.some((c) => route.name === c.routeName) ?? false;
}

const year = computed(() => new Date().getFullYear());

onMounted(async () => {
  void getPublicConfig().then((c) => { cfg.value = c; });

  await nextTick();
  const $ = (window as unknown as Record<string, unknown>).jQuery as
    | ((sel: string) => { fadeOut?: (speed: string) => void })
    | undefined;
  if ($) {
    $(".preloader").fadeOut?.("slow");
  } else {
    const el = document.querySelector(".preloader") as HTMLElement | null;
    if (el) el.style.display = "none";
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

  <main>
    <header class="style2">
      <div class="topbar">
        <div class="container">
          <ul class="float-left tp-lnks">
            <li><i class="far fa-map theme-clr"></i>{{ shortLocation }}</li>
            <li><i class="far fa-clock theme-clr"></i>Senin - Minggu | Buka 24 Jam</li>
          </ul>
          <div v-if="socials.length" class="scl1 float-right">
            <span>Ikuti kami:</span>
            <a v-for="s in socials" :key="s.label" :href="s.url" :title="s.label" target="_blank"><i :class="s.icon"></i></a>
          </div>
        </div>
      </div>

      <div class="logo-inf-sec">
        <div class="container">
          <div class="logo">
            <RouterLink :to="{ name: 'home' }" title="Logo">
              <img :src="logoUrl" :alt="siteName" />
            </RouterLink>
          </div>
          <div class="float-right cnt-inf-btn">
            <ul class="inf-lst">
              <li v-if="phone"><i class="flaticon-phone-volume theme-clr brd-rd50"></i>Hubungi: <span class="theme-clr">{{ phone }}</span></li>
              <li v-if="email"><i class="fas fa-envelope theme-clr brd-rd50"></i><a :href="`mailto:${email}`">{{ email }}</a></li>
            </ul>
            <RouterLink :to="{ name: 'donasi' }" class="theme-btn theme-bg brd-rd5">DONASI</RouterLink>
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
                  <li v-if="group.routeName && !group.children" :class="{ 'kt-menu__item--active': isActive(group) }">
                    <RouterLink :to="{ name: group.routeName }" :title="group.label">{{ group.label }}</RouterLink>
                  </li>
                  <li v-else class="menu-item-has-children" :class="{ 'kt-menu__item--active': isActive(group) }">
                    <a href="javascript:;" :title="group.label">{{ group.label }}</a>
                    <i class="fas fa-angle-down"></i>
                    <ul>
                      <li v-for="child in group.children" :key="child.routeName">
                        <RouterLink :to="{ name: child.routeName }" :title="child.label">{{ child.label }}</RouterLink>
                      </li>
                    </ul>
                  </li>
                </template>
              </ul>
              <div class="hdr-srch">
                <form @submit.prevent>
                  <input type="text" placeholder="Cari..." />
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
      <form @submit.prevent>
        <input type="text" placeholder="Cari..." />
        <button type="submit"><i class="fas fa-search"></i></button>
      </form>
    </div>

    <!-- Responsive Header -->
    <div class="rspn-hdr">
      <div class="rspn-mdbr">
        <ul v-if="socials.length" class="rspn-scil">
          <li v-for="s in socials" :key="s.label"><a :href="s.url" :title="s.label" target="_blank"><i :class="s.icon"></i></a></li>
        </ul>
        <form class="rspn-srch" @submit.prevent>
          <input type="text" placeholder="Kata kunci..." />
          <button type="submit"><i class="fa fa-search"></i></button>
        </form>
      </div>
      <div class="lg-mn">
        <div class="logo">
          <RouterLink :to="{ name: 'home' }" title="Logo">
            <img :src="logoSmUrl" :alt="siteName" />
          </RouterLink>
        </div>
        <div class="rspn-cnt">
          <span v-if="email"><i class="fas fa-envelope theme-clr"></i><a :href="`mailto:${email}`">{{ email }}</a></span>
          <span v-if="phone"><i class="flaticon-phone-volume theme-clr"></i>{{ phone }}</span>
        </div>
        <span class="rspn-mnu-btn"><i class="fa fa-list-ul"></i></span>
      </div>
      <div class="rsnp-mnu">
        <span class="rspn-mnu-cls"><i class="fa fa-times"></i></span>
        <ul>
          <template v-for="group in siteMenu" :key="group.label">
            <li v-if="group.routeName && !group.children">
              <RouterLink :to="{ name: group.routeName }" :title="group.label">{{ group.label }}</RouterLink>
            </li>
            <li v-else class="menu-item-has-children">
              <a href="javascript:;" :title="group.label">{{ group.label }}</a>
              <ul>
                <li v-for="child in group.children" :key="child.routeName">
                  <RouterLink :to="{ name: child.routeName }" :title="child.label">{{ child.label }}</RouterLink>
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
                      <li><RouterLink :to="{ name: 'jadwal-kajian' }">Jadwal Kajian</RouterLink></li>
                      <li><RouterLink :to="{ name: 'donasi' }">Donasi / Ziswaf</RouterLink></li>
                      <li><RouterLink :to="{ name: 'laporan-keuangan' }">Laporan Keuangan</RouterLink></li>
                      <li><RouterLink :to="{ name: 'kontak' }">Kontak</RouterLink></li>
                      <li><a href="/admin/">Panel CMS</a></li>
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
                      <iframe :src="islamicDaysUrl" scrolling="no"></iframe>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="cpy-rgt text-center">
              <p>&copy; {{ year }} <RouterLink :to="{ name: 'home' }">{{ footerText }}</RouterLink> / HAK CIPTA DILINDUNGI</p>
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
header.style2 .logo-inf-sec .logo img {
  max-height: 65px;
  width: auto;
  object-fit: contain;
}

.rspn-hdr .lg-mn .logo img {
  max-height: 45px;
  width: auto;
  object-fit: contain;
}

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

.site-islamic-days {
  width: 100%;
  max-width: 300px;
  height: 260px;
  overflow: hidden;
  margin-top: 5px;
}

.site-islamic-days iframe {
  width: 100%;
  height: 100%;
  border: 0;
}
</style>
