import { createRouter, createWebHistory } from "vue-router";
import GateLayout from "../layouts/GateLayout.vue";
import EmptyRoute from "../views/auth/EmptyRoute.vue";
import DashboardView from "../views/dashboard/DashboardView.vue";
import UsersAdminView from "../views/master/UsersAdminView.vue";
import RolesAdminView from "../views/master/RolesAdminView.vue";
import PermissionsAdminView from "../views/master/PermissionsAdminView.vue";
import ConfigAdminView from "../views/master/ConfigAdminView.vue";
import ContentAdminView from "../views/content/ContentAdminView.vue";
import ModulePlaceholderView from "../views/common/ModulePlaceholderView.vue";
import TpqStudentsAdminView from "../views/program/TpqStudentsAdminView.vue";
import QurbanZakatAdminView from "../views/program/QurbanZakatAdminView.vue";
import AnnouncementsAdminView from "../views/announcement/AnnouncementsAdminView.vue";
import ContactMessagesAdminView from "../views/operasional/ContactMessagesAdminView.vue";
import JamaahDataAdminView from "../views/jamaah/JamaahDataAdminView.vue";
import FinanceCashAdminView from "../views/finance/FinanceCashAdminView.vue";
import FinanceReportsAdminView from "../views/finance/FinanceReportsAdminView.vue";
import { useAuthStore } from "../stores/auth.js";
import { useAccessStore } from "../stores/access.js";

export const router = createRouter({
  history: createWebHistory("/admin/"),
  routes: [
    {
      path: "/login",
      redirect: "/",
    },
    {
      path: "/",
      component: GateLayout,
      children: [
        {
          path: "",
          name: "login",
          component: EmptyRoute,
          meta: { guestOnly: true, title: "Masuk" },
        },
        {
          path: "dashboard",
          name: "dashboard",
          component: DashboardView,
          meta: { requiresAuth: true, title: "Dashboard", desc: "Ringkasan CMS" },
        },
        {
          path: "master/users",
          name: "master-users",
          component: UsersAdminView,
          meta: {
            requiresAuth: true,
            title: "User",
            desc: "Master — pengguna sistem",
          },
        },
        {
          path: "master/roles",
          name: "master-roles",
          component: RolesAdminView,
          meta: {
            requiresAuth: true,
            title: "Role",
            desc: "Master — role sistem & jumlah pengguna",
          },
        },
        {
          path: "master/permissions",
          name: "master-permissions",
          component: PermissionsAdminView,
          meta: {
            requiresAuth: true,
            title: "Permission",
            desc: "Master — katalog permission & pemakaian per role",
          },
        },
        {
          path: "master/config",
          name: "master-config",
          component: ConfigAdminView,
          meta: {
            requiresAuth: true,
            title: "Config",
            desc: "Master — konfigurasi",
            hint: "Pengaturan umum aplikasi akan diatur di sini.",
          },
        },
        {
          path: "operasional/pengumuman",
          name: "ops-pengumuman",
          component: AnnouncementsAdminView,
          meta: {
            requiresAuth: true,
            title: "Pengumuman",
            desc: "Operasional Harian — masa berlaku & blast WhatsApp (tabel announcements).",
          },
        },
        {
          path: "operasional/jadwal-kajian",
          name: "ops-schedules",
          component: ContentAdminView,
          props: {
            fixedType: "event",
            listTitle: "Jadwal Kegiatan/Kajian",
            searchHintText:
              "Satu tabel content_items dengan type=event. Attr1–5: lokasi, pemateri, waktu, berulang, link/kontak.",
          },
          meta: {
            requiresAuth: true,
            title: "Jadwal Kegiatan/Kajian",
            desc: "Konten type event + kolom attr_1…attr_5.",
          },
        },
        {
          path: "operasional/petugas-ibadah",
          name: "ops-prayer-staff",
          component: ContentAdminView,
          props: {
            fixedType: "prayer_staff",
            listTitle: "Jadwal Petugas Ibadah",
            searchHintText:
              "Satu tabel content_items dengan type=prayer_staff. Attr1–5: slot ibadah, jenis tugas, petugas utama, pengganti, kontak/catatan.",
          },
          meta: {
            requiresAuth: true,
            title: "Jadwal Petugas Ibadah",
            desc: "Imam/khatib/muadzin/petugas lain — khusus 1 masjid (tanpa kolom lokasi).",
          },
        },
        {
          path: "operasional/galeri",
          name: "ops-gallery",
          component: ContentAdminView,
          props: {
            fixedType: "gallery",
            listTitle: "Galeri Kegiatan",
            searchHintText:
              "Foto kegiatan masjid. Upload cover image per item; status published agar tampil di website.",
          },
          meta: {
            requiresAuth: true,
            title: "Galeri Kegiatan",
            desc: "Galeri foto kegiatan (content_items type gallery).",
          },
        },
        {
          path: "operasional/pesan-kontak",
          name: "ops-contact-messages",
          component: ContactMessagesAdminView,
          meta: {
            requiresAuth: true,
            title: "Pesan Kontak",
            desc: "Pesan dari form kontak website — notifikasi email via SMTP Gmail.",
          },
        },
        {
          path: "operasional/broadcast",
          name: "ops-broadcast",
          component: ModulePlaceholderView,
          meta: { requiresAuth: true, title: "Broadcast Notifikasi", desc: "Operasional Harian — WA/email/push." },
        },
        {
          path: "jamaah/data",
          name: "jamaah-data",
          component: JamaahDataAdminView,
          meta: { requiresAuth: true, title: "Data Jamaah", desc: "Jamaah & Layanan — data jamaah." },
        },
        {
          path: "jamaah/event-absensi",
          name: "jamaah-event-attendance",
          component: ModulePlaceholderView,
          meta: { requiresAuth: true, title: "Pendaftaran Event & Absensi", desc: "Jamaah & Layanan — registrasi dan absensi." },
        },
        {
          path: "jamaah/layanan-jenazah",
          name: "jamaah-funeral-service",
          component: ModulePlaceholderView,
          meta: { requiresAuth: true, title: "Layanan Jenazah", desc: "Jamaah & Layanan — layanan jenazah." },
        },
        {
          path: "jamaah/surat-administrasi",
          name: "jamaah-administration",
          component: ModulePlaceholderView,
          meta: { requiresAuth: true, title: "Surat & Administrasi", desc: "Jamaah & Layanan — dokumen administrasi." },
        },
        {
          path: "keuangan/kas",
          name: "finance-cash",
          component: FinanceCashAdminView,
          meta: { requiresAuth: true, title: "Kas Masjid", desc: "Keuangan & Donasi — pemasukan dan pengeluaran kas." },
        },
        {
          path: "keuangan/donasi-ziswaf",
          name: "finance-ziswaf",
          component: ModulePlaceholderView,
          meta: { requiresAuth: true, title: "Donasi & ZISWAF", desc: "Keuangan & Donasi — transaksi donasi dan ziswaf." },
        },
        {
          path: "keuangan/campaign",
          name: "finance-campaigns",
          component: ModulePlaceholderView,
          meta: { requiresAuth: true, title: "Campaign Donasi", desc: "Keuangan & Donasi — kampanye donasi." },
        },
        {
          path: "keuangan/laporan",
          name: "finance-reports",
          component: FinanceReportsAdminView,
          meta: { requiresAuth: true, title: "Laporan Keuangan", desc: "Keuangan & Donasi — laporan periodik." },
        },
        {
          path: "program/sosial",
          name: "program-social",
          component: ContentAdminView,
          props: {
            fixedType: "program",
            listTitle: "Program Sosial",
            searchHintText:
              "Satu tabel content_items dengan type=program. Field tambahan: lokasi/wilayah, periode, kontak PIC, sasaran peserta, link/lampiran.",
          },
          meta: {
            requiresAuth: true,
            title: "Program Sosial",
            desc: "Program & Pendidikan — publikasi program (content_items type program).",
          },
        },
        {
          path: "program/tpq",
          name: "program-tpq",
          component: TpqStudentsAdminView,
          meta: {
            requiresAuth: true,
            title: "TPQ/Madrasah",
            desc: "Program & Pendidikan — data santri (fase 1: master; absensi/nilai menyusul).",
          },
        },
        {
          path: "program/qurban-zakat",
          name: "program-qurban-zakat",
          component: QurbanZakatAdminView,
          meta: {
            requiresAuth: true,
            title: "Qurban & Zakat Musiman",
            desc: "Program & Pendidikan — musim/kampanye & entri pembayaran.",
          },
        },
        {
          path: "aset/data",
          name: "asset-data",
          component: ModulePlaceholderView,
          meta: { requiresAuth: true, title: "Data Aset", desc: "Aset & Inventaris — daftar aset masjid." },
        },
        {
          path: "aset/peminjaman",
          name: "asset-borrows",
          component: ModulePlaceholderView,
          meta: { requiresAuth: true, title: "Peminjaman Barang", desc: "Aset & Inventaris — peminjaman barang." },
        },
        {
          path: "aset/maintenance",
          name: "asset-maintenance",
          component: ModulePlaceholderView,
          meta: { requiresAuth: true, title: "Maintenance", desc: "Aset & Inventaris — perawatan aset." },
        },
      ],
    },
  ],
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  await auth.hydrate();
  const token = auth.token;
  const access = useAccessStore();

  if (to.meta.requiresAuth && !token) {
    return { name: "login", query: { redirect: to.fullPath }, replace: true };
  }

  if (token) {
    if (!access.menu.length && !access.loading) {
      await access.load();
    }

    const allowedRouteNames = new Set(access.menu.map((m) => m.routerName));
    const firstAllowed = access.menu[0]?.routerName || "dashboard";
    const targetName = typeof to.name === "string" ? to.name : "";
    const isAllowedRoute = targetName.length > 0 && allowedRouteNames.has(targetName);

    if (to.name === "login") {
      const redir = typeof to.query.redirect === "string" ? to.query.redirect : "";
      if (redir.startsWith("/")) {
        return { path: redir, replace: true };
      }
      return { name: firstAllowed, replace: true };
    }

    if (to.meta.requiresAuth && !isAllowedRoute) {
      return { name: firstAllowed, replace: true };
    }
  }

  return true;
});
