import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import SiteLayout from "./layouts/SiteLayout.vue";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    component: SiteLayout,
    children: [
      { path: "", name: "home", component: () => import("./views/HomeView.vue"), meta: { title: "Beranda" } },
      {
        path: "tentang-masjid",
        name: "tentang-masjid",
        component: () => import("./views/TentangMasjidView.vue"),
        meta: { title: "Tentang Masjid" },
      },
      {
        path: "kebijakan-privasi",
        name: "kebijakan-privasi",
        component: () => import("./views/KebijakanPrivasiView.vue"),
        meta: { title: "Kebijakan Privasi" },
      },
      {
        path: "jadwal-kajian",
        name: "jadwal-kajian",
        component: () => import("./views/JadwalKajianView.vue"),
        meta: { title: "Jadwal Kajian" },
      },
      {
        path: "jadwal-petugas",
        name: "jadwal-petugas",
        component: () => import("./views/JadwalPetugasView.vue"),
        meta: { title: "Jadwal Petugas Ibadah" },
      },
      { path: "kontak", name: "kontak", component: () => import("./views/ContactView.vue"), meta: { title: "Kontak" } },
      {
        path: "penyewaan-aula",
        name: "penyewaan-aula",
        component: () => import("./views/PenyewaanAulaView.vue"),
        meta: { title: "Penyewaan Aula" },
      },
      {
        path: ":pathMatch(.*)*",
        name: "not-found",
        component: () => import("./views/NotFoundView.vue"),
        meta: { title: "Halaman Tidak Ditemukan" },
      },
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

import { trackSitePageView } from "./utils/site-integrations.js";

router.afterEach((to) => {
  const base = "Masjid Alfurqon Bekasi";
  const pageTitle = to.meta.title as string | undefined;
  document.title = pageTitle && pageTitle !== "Beranda" ? `${pageTitle} | ${base}` : base;
  trackSitePageView(to.fullPath, document.title);
});

export default router;
