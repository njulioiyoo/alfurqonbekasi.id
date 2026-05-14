import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import SiteLayout from "./layouts/SiteLayout.vue";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    component: SiteLayout,
    children: [
      { path: "", name: "home", component: () => import("./views/HomeView.vue"), meta: { title: "Beranda" } },

      { path: "jadwal-kajian", name: "jadwal-kajian", component: () => import("./views/ComingSoonView.vue"), meta: { title: "Jadwal Kajian" } },
      { path: "jadwal-petugas", name: "jadwal-petugas", component: () => import("./views/ComingSoonView.vue"), meta: { title: "Jadwal Petugas Ibadah" } },
      { path: "pendaftaran-event", name: "pendaftaran-event", component: () => import("./views/ComingSoonView.vue"), meta: { title: "Pendaftaran Event" } },

      { path: "layanan-jenazah", name: "layanan-jenazah", component: () => import("./views/ComingSoonView.vue"), meta: { title: "Layanan Jenazah" } },
      { path: "program-sosial", name: "program-sosial", component: () => import("./views/ComingSoonView.vue"), meta: { title: "Program Sosial" } },
      { path: "tpq", name: "tpq", component: () => import("./views/ComingSoonView.vue"), meta: { title: "TPQ / Madrasah" } },

      { path: "kas-masjid", name: "kas-masjid", component: () => import("./views/ComingSoonView.vue"), meta: { title: "Kas Masjid" } },
      { path: "donasi", name: "donasi", component: () => import("./views/ComingSoonView.vue"), meta: { title: "Donasi / Ziswaf" } },
      { path: "qurban-zakat", name: "qurban-zakat", component: () => import("./views/ComingSoonView.vue"), meta: { title: "Qurban & Zakat Musiman" } },
      { path: "laporan-keuangan", name: "laporan-keuangan", component: () => import("./views/ComingSoonView.vue"), meta: { title: "Laporan Keuangan" } },

      { path: "kontak", name: "kontak", component: () => import("./views/ContactView.vue"), meta: { title: "Kontak" } },
    ],
  },
];

const router = createRouter({
  history: createWebHistory("/"),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition ?? { top: 0 };
  },
});

router.afterEach((to) => {
  const base = "Masjid Alfurqon Bekasi";
  const pageTitle = to.meta.title as string | undefined;
  document.title = pageTitle && pageTitle !== "Beranda" ? `${pageTitle} | ${base}` : base;
});

export default router;
