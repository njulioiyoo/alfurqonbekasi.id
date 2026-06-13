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

/** Hanya halaman yang sudah berisi konten nyata — hindari menu ke Coming Soon. */
export const siteMenu: MenuGroup[] = [
  {
    label: "Beranda",
    routeName: "home",
  },
  {
    label: "Tentang Masjid",
    routeName: "tentang-masjid",
  },
  {
    label: "Jadwal & Kegiatan",
    children: [
      { label: "Jadwal Kajian", routeName: "jadwal-kajian", icon: "flaticon-open-book" },
      { label: "Jadwal Petugas Ibadah", routeName: "jadwal-petugas", icon: "flaticon-mosque" },
      { label: "Galeri Kegiatan", routeName: "galeri-kegiatan", icon: "flaticon2-image-file" },
    ],
  },
  {
    label: "Penyewaan Aula",
    routeName: "penyewaan-aula",
  },
  {
    label: "Kontak",
    routeName: "kontak",
  },
];
