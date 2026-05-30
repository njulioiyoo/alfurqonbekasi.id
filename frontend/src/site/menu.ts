export interface MenuItem {
  label: string;
  routeName: string;
  icon?: string;
}

export interface MenuGroup {
  label: string;
  /** Jika ada routeName, item ini jadi link tunggal (tanpa dropdown). */
  routeName?: string;
  children?: MenuItem[];
}

export const siteMenu: MenuGroup[] = [
  {
    label: "Beranda",
    routeName: "home",
  },
  {
    label: "Jadwal & Kegiatan",
    children: [
      { label: "Jadwal Kajian", routeName: "jadwal-kajian", icon: "flaticon-open-book" },
      { label: "Jadwal Petugas Ibadah", routeName: "jadwal-petugas", icon: "flaticon-mosque" },
      { label: "Pendaftaran Event", routeName: "pendaftaran-event", icon: "far fa-calendar-alt" },
    ],
  },
  {
    label: "Layanan & Program",
    children: [
      { label: "Penyewaan Aula", routeName: "penyewaan-aula", icon: "flaticon-mosque" },
      { label: "Layanan Jenazah", routeName: "layanan-jenazah", icon: "flaticon-grave" },
      { label: "Program Sosial", routeName: "program-sosial", icon: "flaticon-begging" },
      { label: "TPQ / Madrasah", routeName: "tpq", icon: "flaticon-open-book" },
    ],
  },
  {
    label: "Keuangan & Donasi",
    children: [
      { label: "Kas Masjid", routeName: "kas-masjid", icon: "fas fa-money-bill-wave" },
      { label: "Donasi / Ziswaf", routeName: "donasi", icon: "fas fa-hand-holding-heart" },
      { label: "Qurban & Zakat Musiman", routeName: "qurban-zakat", icon: "fas fa-donate" },
      { label: "Laporan Keuangan", routeName: "laporan-keuangan", icon: "fas fa-chart-bar" },
    ],
  },
  {
    label: "Kontak",
    routeName: "kontak",
  },
];
