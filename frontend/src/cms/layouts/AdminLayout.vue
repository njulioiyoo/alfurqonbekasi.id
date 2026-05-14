<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, provide, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import {
  ADMIN_STYLESHEETS,
  ADMIN_SCRIPT_CHAIN,
  KT_APP_OPTIONS_DEMO2,
} from "../metronic/adminAssets.js";
import {
  injectInlineScript,
  injectStylesheet,
  removeByMetronicAttr,
  loadScriptChain,
} from "../metronic/inject.js";
import { metronicAsset } from "../metronic/urls.js";
import { useAuthStore } from "../stores/auth.js";
import { useAccessStore, menuRouteTarget } from "../stores/access.js";
import type { MenuItem } from "../stores/access.js";
import { ADMIN_SHELL_READY } from "../injectionKeys.js";
import { getAdminConfig } from "../api/admin.js";

const SCRIPT_ATTR_PREFIX = "admin-js";

/** Overlay sampai CSS + bundle Metronic siap — hindari “setengah render” setelah login. */
const shellReady = ref(false);
provide(ADMIN_SHELL_READY, shellReady);

/** Dropdown user: dikontrol Vue (demo2 pakai div + Bootstrap data-toggle; di SPA sering bentrok dengan double-load Bootstrap). */
const userMenuOpen = ref(false);
const userDropdownEl = ref<HTMLElement | null>(null);

function closeUserMenuIfOutside(ev: MouseEvent): void {
  if (!userMenuOpen.value || !userDropdownEl.value) return;
  const t = ev.target;
  if (t instanceof Node && !userDropdownEl.value.contains(t)) {
    userMenuOpen.value = false;
  }
}

/** Bundle Metronic global — hanya sekali per full page load (hindari dobel init jQuery). */
let metronicScriptsBooted = false;

const router = useRouter();
const route = useRoute();

watch(
  () => route.fullPath,
  () => {
    userMenuOpen.value = false;
  }
);

const auth = useAuthStore();
const { user } = storeToRefs(auth);

const access = useAccessStore();
const { menu } = storeToRefs(access);

const primaryMenuDisplay = computed((): MenuItem[] => {
  const p = menu.value.filter((m) => m.menuGroup === "primary").sort((a, b) => a.sortOrder - b.sortOrder);
  if (p.length > 0) return p;
  return [
    {
      id: "dashboard",
      label: "Dashboard",
      path: "/admin/dashboard",
      permissionName: "read:Dashboard",
      routerName: "dashboard",
      menuGroup: "primary",
      sortOrder: 0,
    },
  ];
});

const MENU_GROUP_META: Record<string, { label: string; sort: number }> = {
  operasional: { label: "Operasional Harian", sort: 20 },
  jamaah: { label: "Jamaah & Layanan", sort: 30 },
  keuangan: { label: "Keuangan & Donasi", sort: 40 },
  program: { label: "Program & Pendidikan", sort: 50 },
  aset: { label: "Aset & Inventaris", sort: 60 },
  master: { label: "Master", sort: 90 },
};

type GroupMenuView = { key: string; label: string; sort: number; items: MenuItem[] };

const groupedMenuDisplay = computed((): GroupMenuView[] =>
  Object.entries(
    menu.value
      .filter((m) => m.menuGroup !== "primary")
      .reduce<Record<string, MenuItem[]>>((acc, item) => {
        const key = (item.menuGroup || "lainnya").toLowerCase();
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      }, {})
  )
    .map(([key, items]) => ({
      key,
      label: MENU_GROUP_META[key]?.label || key,
      sort: MENU_GROUP_META[key]?.sort ?? 999,
      items: [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label)),
    }))
    .sort((a, b) => a.sort - b.sort || a.label.localeCompare(b.label))
);

function isGroupActive(g: GroupMenuView): boolean {
  return g.items.some((m) => m.routerName === String(route.name));
}

const displayName = computed(() => {
  if (!user.value) return "";
  return user.value.fullName || user.value.email;
});

const userBadgeLetter = computed(() => {
  const n = displayName.value.trim();
  return n ? n.charAt(0).toUpperCase() : "?";
});

const pageTitle = computed(() => (route.meta.title as string) || "Dashboard");
const pageDesc = computed(() => (route.meta.desc as string) || "CMS Masjid Alfurqon Bekasi");

const branding = ref<{ logoUrl: string; logoLightUrl: string }>({
  logoUrl: "",
  logoLightUrl: "",
});
const logoVersion = ref(0);

function normalizeLogoUrl(v: string): string {
  const s = v.trim();
  if (!s) return "";
  if (s.startsWith("data:") || s.startsWith("http://") || s.startsWith("https://") || s.startsWith("/")) return s;
  return `/${s}`;
}

async function loadBrandingConfig(): Promise<void> {
  try {
    const json = await getAdminConfig();
    if (!json.ok || !json.data?.values) return;
    branding.value.logoUrl = normalizeLogoUrl(json.data.values.logoUrl ?? "");
    branding.value.logoLightUrl = normalizeLogoUrl(json.data.values.logoLightUrl ?? "");
    logoVersion.value += 1;
  } catch {
    /* fallback pakai logo default theme */
  }
}

function resolveLogoUrl(v: string): string {
  if (!v) return "";
  return `${v}${v.includes("?") ? "&" : "?"}v=${logoVersion.value}`;
}

const logoSm = computed(() =>
  resolveLogoUrl(branding.value.logoLightUrl || branding.value.logoUrl) || metronicAsset("media/logos/logo-2-sm.png")
);
const logoDefault = computed(() =>
  resolveLogoUrl(branding.value.logoUrl) || metronicAsset("media/logos/logo-2.png")
);
const headerBgUrl = computed(() => metronicAsset("media/misc/bg-1.jpg"));

const shortDate = computed(() =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(new Date())
);

function mountMetronicCss(): void {
  injectInlineScript(KT_APP_OPTIONS_DEMO2, "admin-kt-options");
  ADMIN_STYLESHEETS.forEach((href, i) => {
    injectStylesheet(href, `admin-css-${i}`);
  });
}

async function mountMetronicScripts(): Promise<void> {
  if (metronicScriptsBooted) return;
  await loadScriptChain(ADMIN_SCRIPT_CHAIN, SCRIPT_ATTR_PREFIX);
  metronicScriptsBooted = true;
}

function unmountMetronic(): void {
  removeByMetronicAttr("admin-kt-options");
  document.querySelectorAll('[data-metronic^="admin-css-"]').forEach((el) => el.remove());
  /* Script vendor + scripts.bundle tidak dihapus — konsisten dengan perilaku plugin global Metronic */
}

/** Body class setelah loader selesai — tanpa `kt-page--loading` (hindari layar putih/ganda). */
const BODY_CLASS_READY =
  "kt-page--fixed kt-quick-panel--right kt-demo-panel--right kt-offcanvas-panel--right kt-header--fixed kt-header--minimize-topbar kt-header-mobile--fixed kt-subheader--enabled kt-subheader--transparent";

function waitFrames(count: number): Promise<void> {
  return new Promise((resolve) => {
    let n = 0;
    function tick(): void {
      n += 1;
      if (n >= count) {
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

onMounted(async () => {
  document.addEventListener("click", closeUserMenuIfOutside);
  window.addEventListener("cms-config-updated", loadBrandingConfig);
  void access.load();
  void loadBrandingConfig();
  shellReady.value = false;
  mountMetronicCss();
  try {
    await mountMetronicScripts();
  } catch {
    /* layout tetap dipakai walau bundle gagal */
  }
  await nextTick();
  await waitFrames(2);
  try {
    const w = window as unknown as { KTUtil?: { init?: () => void } };
    w.KTUtil?.init?.();
  } catch {
    /* Metronic tidak wajib */
  }
  document.body.className = BODY_CLASS_READY;
  shellReady.value = true;
});

onUnmounted(() => {
  document.removeEventListener("click", closeUserMenuIfOutside);
  window.removeEventListener("cms-config-updated", loadBrandingConfig);
  document.body.className = "";
  unmountMetronic();
});

function logout(): void {
  userMenuOpen.value = false;
  auth.logout();
  void router.replace({ name: "login" });
}
</script>

<template>
  <div class="kt-grid kt-grid--hor kt-grid--root">
    <!-- begin:: Header Mobile (demo2/index.html) -->
    <div id="kt_header_mobile" class="kt-header-mobile kt-header-mobile--fixed">
      <div class="kt-header-mobile__logo">
        <RouterLink :to="{ name: 'dashboard' }">
          <img alt="Logo" :src="logoSm" class="cms-logo-mobile" />
        </RouterLink>
      </div>
      <div class="kt-header-mobile__toolbar">
        <button id="kt_header_mobile_toggler" class="kt-header-mobile__toolbar-toggler" type="button">
          <span></span>
        </button>
        <button id="kt_header_mobile_topbar_toggler" class="kt-header-mobile__toolbar-topbar-toggler" type="button">
          <i class="flaticon-more-1"></i>
        </button>
      </div>
    </div>
    <!-- end:: Header Mobile -->

    <div class="kt-grid__item kt-grid__item--fluid kt-grid kt-grid--ver kt-page">
      <div id="kt_wrapper" class="kt-grid__item kt-grid__item--fluid kt-grid kt-grid--hor kt-wrapper">
        <!-- begin:: Header -->
        <div id="kt_header" class="kt-header kt-grid__item kt-header--fixed" data-ktheader-minimize="on">
          <div class="kt-header__top">
            <div class="kt-container">
              <div id="kt_header_brand" class="kt-header__brand kt-grid__item">
                <div class="kt-header__brand-logo">
                  <RouterLink :to="{ name: 'dashboard' }">
                    <img alt="Logo" :src="logoDefault" class="kt-header__brand-logo-default cms-logo-default" />
                    <img alt="Logo" :src="logoSm" class="kt-header__brand-logo-sticky cms-logo-sticky" />
                  </RouterLink>
                </div>
                <div class="kt-header__brand-nav">
                  <div class="dropdown">
                    <button
                      type="button"
                      class="btn btn-default dropdown-toggle"
                      data-toggle="dropdown"
                      aria-haspopup="true"
                      aria-expanded="false"
                    >
                      Alfurqon CMS
                    </button>
                    <div class="dropdown-menu dropdown-menu-md">
                      <ul class="kt-nav kt-nav--bold kt-nav--md-space">
                        <li class="kt-nav__item">
                          <span class="kt-nav__link"><span class="kt-nav__link-text kt-font-muted">Masjid Alfurqon Bekasi</span></span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div class="kt-header__topbar">
                <!-- Mobile search toggle (demo2) -->
                <div id="kt_quick_search_toggle" class="kt-header__topbar-item kt-header__topbar-item--search dropdown kt-hidden-desktop">
                  <div class="kt-header__topbar-wrapper" data-toggle="dropdown" data-offset="10px,10px">
                    <span class="kt-header__topbar-icon">
                      <i class="flaticon2-search-1"></i>
                    </span>
                  </div>
                  <div class="dropdown-menu dropdown-menu-fit dropdown-menu-right dropdown-menu-anim dropdown-menu-lg">
                    <div class="kt-quick-search kt-quick-search--inline">
                      <form method="get" class="kt-quick-search__form" @submit.prevent>
                        <div class="input-group">
                          <div class="input-group-prepend">
                            <span class="input-group-text"><i class="flaticon2-search-1"></i></span>
                          </div>
                          <input type="text" class="form-control kt-quick-search__input" placeholder="Cari…" />
                        </div>
                      </form>
                    </div>
                  </div>
                </div>

                <!-- Notifications -->
                <div class="kt-header__topbar-item dropdown">
                  <div class="kt-header__topbar-wrapper" data-toggle="dropdown" data-offset="10px,10px">
                    <span class="kt-header__topbar-icon kt-pulse kt-pulse--brand">
                      <i class="flaticon2-bell-alarm-symbol"></i>
                      <span class="kt-pulse__ring"></span>
                    </span>
                  </div>
                  <div class="dropdown-menu dropdown-menu-fit dropdown-menu-right dropdown-menu-anim dropdown-menu-lg">
                    <div
                      class="kt-head kt-head--skin-dark kt-padding-20"
                      :style="{ backgroundImage: `url(${headerBgUrl})` }"
                    >
                      <h4 class="kt-head__title kt-font-inverse mb-0">Notifikasi</h4>
                    </div>
                    <div class="kt-notification kt-margin-t-15 kt-margin-b-15 kt-padding-x-15">
                      <span class="kt-font-muted kt-font-sm">Belum ada notifikasi.</span>
                    </div>
                  </div>
                </div>

                <!-- Quick panel toggler -->
                <div class="kt-header__topbar-item kt-header__topbar-item--quick-panel" data-toggle="kt-tooltip" title="Panel" data-placement="left">
                  <div class="kt-header__topbar-wrapper">
                    <span id="kt_quick_panel_toggler_btn" class="kt-header__topbar-icon">
                      <i class="flaticon2-cube-1"></i>
                    </span>
                  </div>
                </div>

                <!-- User — struktur seperti demo2/index.html “begin: User bar”; toggle pakai Vue agar tidak bergantung pada satu instance Bootstrap -->
                <div
                  ref="userDropdownEl"
                  class="kt-header__topbar-item kt-header__topbar-item--user dropdown"
                  :class="{ show: userMenuOpen }"
                >
                  <div
                    class="kt-header__topbar-wrapper"
                    data-offset="10px,10px"
                    role="button"
                    tabindex="0"
                    aria-haspopup="true"
                    :aria-expanded="userMenuOpen"
                    @click.stop="userMenuOpen = !userMenuOpen"
                    @keydown.enter.prevent="userMenuOpen = !userMenuOpen"
                    @keydown.space.prevent="userMenuOpen = !userMenuOpen"
                  >
                    <span class="kt-header__topbar-welcome">Halo,</span>
                    <span class="kt-header__topbar-username">{{ displayName }}</span>
                    <span class="kt-badge kt-badge--username kt-badge--unified-success kt-badge--lg kt-badge--rounded kt-badge--bold">{{
                      userBadgeLetter
                    }}</span>
                  </div>
                  <div
                    class="dropdown-menu dropdown-menu-fit dropdown-menu-right dropdown-menu-anim dropdown-menu-xl"
                    :class="{ show: userMenuOpen }"
                    @click.stop
                  >
                    <div
                      class="kt-user-card kt-user-card--skin-dark kt-notification-item-padding-x"
                      :style="{ backgroundImage: `url(${headerBgUrl})` }"
                    >
                      <div class="kt-user-card__avatar">
                        <span class="kt-badge kt-badge--lg kt-badge--rounded kt-badge--bold kt-font-success">{{ userBadgeLetter }}</span>
                      </div>
                      <div class="kt-user-card__name">{{ displayName }}</div>
                      <div class="kt-user-card__badge">
                        <span class="btn btn-success btn-sm btn-bold btn-font-md">{{ user?.role }}</span>
                      </div>
                    </div>
                    <div class="kt-notification">
                      <div class="kt-notification__custom kt-space-between kt-padding-x-15 kt-padding-y-15">
                        <span class="kt-font-muted kt-font-sm">{{ user?.email }}</span>
                      </div>
                      <div class="kt-notification__custom kt-space-between kt-padding-x-15 kt-padding-b-15">
                        <a href="#" class="btn btn-label btn-label-brand btn-sm btn-bold" @click.prevent="logout">Keluar</a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Horizontal menu bar (demo2): navigasi utama -->
          <div class="kt-header__bottom">
            <div class="kt-container">
              <button id="kt_header_menu_mobile_close_btn" type="button" class="kt-header-menu-wrapper-close">
                <i class="la la-close"></i>
              </button>
              <div id="kt_header_menu_wrapper" class="kt-header-menu-wrapper">
                <div id="kt_header_menu" class="kt-header-menu kt-header-menu-mobile">
                  <ul class="kt-menu__nav">
                    <li
                      v-for="item in primaryMenuDisplay"
                      :key="item.id"
                      class="kt-menu__item kt-menu__item--rel"
                      :class="{ 'kt-menu__item--active kt-menu__item--here': route.name === item.routerName }"
                    >
                      <RouterLink v-slot="{ href, navigate }" :to="menuRouteTarget(item)" custom>
                        <a :href="href" class="kt-menu__link" @click="navigate">
                          <span class="kt-menu__link-text">{{ item.label }}</span>
                        </a>
                      </RouterLink>
                    </li>
                    <li
                      v-for="group in groupedMenuDisplay"
                      :key="group.key"
                      class="kt-menu__item kt-menu__item--submenu kt-menu__item--rel"
                      :class="{
                        'kt-menu__item--active kt-menu__item--here kt-menu__item--open': isGroupActive(group),
                      }"
                      data-ktmenu-submenu-toggle="click"
                      aria-haspopup="true"
                    >
                      <a href="javascript:;" class="kt-menu__link kt-menu__toggle">
                        <span class="kt-menu__link-text">{{ group.label }}</span>
                        <i class="kt-menu__ver-arrow la la-angle-right"></i>
                      </a>
                      <div class="kt-menu__submenu kt-menu__submenu--classic kt-menu__submenu--left">
                        <ul class="kt-menu__subnav">
                          <li
                            v-for="item in group.items"
                            :key="item.id"
                            class="kt-menu__item"
                            :class="{ 'kt-menu__item--active': route.name === item.routerName }"
                            aria-haspopup="true"
                          >
                            <RouterLink v-slot="{ href, navigate }" :to="menuRouteTarget(item)" custom>
                              <a :href="href" class="kt-menu__link" @click="navigate">
                                <i class="kt-menu__link-bullet kt-menu__link-bullet--dot"><span></span></i>
                                <span class="kt-menu__link-text">{{ item.label }}</span>
                              </a>
                            </RouterLink>
                          </li>
                        </ul>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
              <div class="kt-header-toolbar kt-hidden-mobile">
                <div id="kt_quick_search_default" class="kt-quick-search">
                  <form method="get" class="kt-quick-search__form" @submit.prevent>
                    <div class="input-group">
                      <div class="input-group-prepend">
                        <span class="input-group-text"><i class="flaticon2-search-1"></i></span>
                      </div>
                      <input type="text" class="form-control kt-quick-search__input" placeholder="Cari…" />
                      <div class="input-group-append">
                        <span class="input-group-text"><i class="la la-close kt-quick-search__close"></i></span>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- end:: Header -->

        <div class="kt-grid__item kt-grid__item--fluid kt-grid kt-grid--ver kt-grid--stretch">
          <div id="kt_body" class="kt-container kt-body kt-grid kt-grid--ver">
            <div class="kt-grid__item kt-grid__item--fluid kt-grid kt-grid--hor">
              <div id="kt_subheader" class="kt-subheader kt-grid__item">
                <div class="kt-subheader__main">
                  <h3 class="kt-subheader__title">{{ pageTitle }}</h3>
                  <span class="kt-subheader__separator kt-subheader__separator--v"></span>
                  <span class="kt-subheader__desc">{{ pageDesc }}</span>
                </div>
                <div class="kt-subheader__toolbar">
                  <div class="kt-subheader__wrapper">
                    <a href="#" class="btn kt-subheader__btn-daterange" data-toggle="kt-tooltip" title="Periode" data-placement="left" @click.prevent>
                      <span class="kt-subheader__btn-daterange-title">Hari ini</span>&nbsp;
                      <span class="kt-subheader__btn-daterange-date">{{ shortDate }}</span>
                      <i class="flaticon2-calendar-1"></i>
                    </a>
                    <a href="#" class="btn kt-subheader__btn-primary btn-icon" @click.prevent><i class="flaticon2-file"></i></a>
                    <a href="#" class="btn kt-subheader__btn-primary btn-icon" @click.prevent><i class="flaticon-download-1"></i></a>
                    <a href="#" class="btn kt-subheader__btn-primary btn-icon" @click.prevent><i class="flaticon2-fax"></i></a>
                    <a href="#" class="btn kt-subheader__btn-primary btn-icon" @click.prevent><i class="flaticon2-settings"></i></a>
                  </div>
                </div>
              </div>

              <div class="kt-content kt-grid__item kt-grid__item--fluid">
                <slot />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <Transition name="cms-shell-fade">
    <div v-if="!shellReady" class="cms-shell-overlay" aria-busy="true" role="status">
      <div class="cms-shell-overlay__box">
        <div class="cms-shell-overlay__spinner" aria-hidden="true" />
        <p class="cms-shell-overlay__text">Memuat panel…</p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Backdrop tidak menangkap pointer — hindari “layar hantu” setelah fade / race transisi Vue.
   Hanya kotak konten yang boleh menerima klik (mis. fokus keyboard). */
.cms-shell-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f4f5f8;
  pointer-events: none;
}

.cms-shell-overlay__box {
  text-align: center;
  padding: 1.5rem 2rem;
  pointer-events: auto;
}

.cms-shell-overlay__spinner {
  width: 2.75rem;
  height: 2.75rem;
  margin: 0 auto 1rem;
  border: 3px solid #e2e5ec;
  border-top-color: #5867dd;
  border-radius: 50%;
  animation: cms-shell-spin 0.75s linear infinite;
}

.cms-shell-overlay__text {
  margin: 0;
  font-size: 0.95rem;
  color: #6c7293;
}

@keyframes cms-shell-spin {
  to {
    transform: rotate(360deg);
  }
}

.cms-logo-mobile {
  max-height: 30px;
  width: auto;
  object-fit: contain;
}

.cms-logo-default {
  max-height: 45px;
  width: auto;
  object-fit: contain;
}

.cms-logo-sticky {
  max-height: 30px;
  width: auto;
  object-fit: contain;
}
</style>

<style>
.cms-shell-fade-enter-active,
.cms-shell-fade-leave-active {
  transition: opacity 0.28s ease;
}

.cms-shell-fade-enter-from,
.cms-shell-fade-leave-to {
  opacity: 0;
}
</style>
