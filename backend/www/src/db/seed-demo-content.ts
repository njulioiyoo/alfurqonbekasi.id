import { copyFileSync, existsSync, mkdirSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./pool.js";
import { uploadsRootDir } from "../utils/uploads-path.js";

/**
 * Skema attr (sesuai router CMS & form operasional):
 * - event:         attr1=lokasi, attr2=pemateri, attr3=waktu mulai, attr4=selesai/berulang, attr5=link/kontak
 * - prayer_staff:  attr1=slot ibadah, attr2=jenis tugas, attr3=petugas utama, attr4=pengganti, attr5=kontak
 * - gallery:       attr1=tanggal kegiatan, attr2=lokasi (attr3–5 tidak dipakai)
 */

type EventSeed = {
  title: string;
  slug: string;
  excerpt: string;
  lokasi: string;
  pemateri: string;
  waktuMulai: string;
  selesaiBerulang: string;
  linkKontak: string;
  publishedAt: string;
  sortOrder: number;
  isFeatured: boolean;
};

type PrayerStaffSeed = {
  title: string;
  slug: string;
  excerpt: string;
  slotIbadah: string;
  jenisTugas: string;
  petugasUtama: string;
  pengganti: string;
  kontak: string;
  publishedAt: string;
  sortOrder: number;
  isFeatured: boolean;
};

type GallerySeed = {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  tanggalKegiatan: string;
  lokasi: string;
  publishedAt: string;
  sortOrder: number;
  isFeatured: boolean;
};

const EVENTS: EventSeed[] = [
  {
    title: "Kajian Ahad Pagi: Sirah Nabawiyah",
    slug: "kajian-ahad-sirah-nabawiyah",
    excerpt: "Kajian rutin setiap Ahad pagi membahas sirah Rasulullah SAW untuk jamaah umum.",
    lokasi: "Aula Utama Masjid Alfurqon",
    pemateri: "Ustadz Ahmad Fauzi, Lc.",
    waktuMulai: "17 Mei 2026 · 08:00 WIB",
    selesaiBerulang: "s/d 10:00 WIB · setiap Ahad",
    linkKontak: "https://alfurqonbekasi.id/kajian",
    publishedAt: "2026-05-17T00:00:00+07:00",
    sortOrder: 10,
    isFeatured: true,
  },
  {
    title: "Tahsin Al-Qur'an Perempuan",
    slug: "tahsin-quran-perempuan",
    excerpt: "Program perbaikan bacaan Al-Qur'an khusus jamaah perempuan, kelas pemula–menengah.",
    lokasi: "Ruang Ta'lim Lt. 2",
    pemateri: "Ustadzah Siti Maryam",
    waktuMulai: "19 Mei 2026 · 09:30 WIB",
    selesaiBerulang: "s/d 11:00 WIB · setiap Selasa",
    linkKontak: "",
    publishedAt: "2026-05-19T00:00:00+07:00",
    sortOrder: 20,
    isFeatured: false,
  },
  {
    title: "Kajian Ba'da Maghrib: Fiqih Ibadah",
    slug: "kajian-bada-maghrib-fiqih",
    excerpt: "Kajian ringkas setelah Maghrib membahas fiqih ibadah sehari-hari.",
    lokasi: "Serambi Masjid",
    pemateri: "Ustadz H. Ridwan",
    waktuMulai: "20 Mei 2026 · 18:30 WIB",
    selesaiBerulang: "s/d 19:45 WIB · setiap Rabu",
    linkKontak: "",
    publishedAt: "2026-05-20T00:00:00+07:00",
    sortOrder: 30,
    isFeatured: false,
  },
  {
    title: "Tabligh Akbar Ramadhan 1447 H",
    slug: "tabligh-akbar-ramadhan-1447",
    excerpt: "Tabligh akbar menjelang Ramadhan dengan tema mempersiapkan hati dan rumah tangga.",
    lokasi: "Lapangan Parkir Utara Masjid",
    pemateri: "Ustadz Dr. Yusuf Mansur",
    waktuMulai: "14 Februari 2026 · 19:00 WIB",
    selesaiBerulang: "s/d 22:00 WIB · sekali",
    linkKontak: "https://alfurqonbekasi.id/tabligh",
    publishedAt: "2026-02-14T00:00:00+07:00",
    sortOrder: 40,
    isFeatured: true,
  },
  {
    title: "Workshop Parenting Islami",
    slug: "workshop-parenting-islami",
    excerpt: "Pelatihan orang tua tentang mendidik anak dengan nilai-nilai Islam di era digital.",
    lokasi: "Aula Serbaguna",
    pemateri: "Kak Seto & Ustadzah Dewi",
    waktuMulai: "7 Juni 2026 · 13:00 WIB",
    selesaiBerulang: "s/d 16:30 WIB · sekali",
    linkKontak: "",
    publishedAt: "2026-06-07T00:00:00+07:00",
    sortOrder: 50,
    isFeatured: false,
  },
  {
    title: "Kajian Pemuda: Karakter Generasi Qur'ani",
    slug: "kajian-pemuda-karakter-qurani",
    excerpt: "Forum pemuda masjid dengan pembahasan karakter dan kontribusi sosial umat.",
    lokasi: "Ruang Pemuda Alfurqon",
    pemateri: "Ustadz Fadli Rahman",
    waktuMulai: "24 Mei 2026 · 16:00 WIB",
    selesaiBerulang: "s/d 18:00 WIB · sekali",
    linkKontak: "",
    publishedAt: "2026-05-24T00:00:00+07:00",
    sortOrder: 60,
    isFeatured: false,
  },
  {
    title: "Pengajian Rutin RT 05 RW 12",
    slug: "pengajian-rt-05-rw-12",
    excerpt: "Pengajian lingkungan setiap Kamis malam untuk warga sekitar masjid.",
    lokasi: "Musholla Al-Ikhlas, Perum Bekasi Timur",
    pemateri: "Ustadz H. Maman",
    waktuMulai: "21 Mei 2026 · 20:00 WIB",
    selesaiBerulang: "s/d 21:30 WIB · setiap Kamis",
    linkKontak: "",
    publishedAt: "2026-05-21T00:00:00+07:00",
    sortOrder: 70,
    isFeatured: false,
  },
  {
    title: "Kelas Bahasa Arab Dasar",
    slug: "kelas-bahasa-arab-dasar",
    excerpt: "Pembelajaran nahwu-shorof tingkat dasar untuk jamaah yang ingin memahami kitab.",
    lokasi: "Ruang Perpustakaan Masjid",
    pemateri: "Ustadz Abdullah Al-Haraki",
    waktuMulai: "22 Mei 2026 · 15:00 WIB",
    selesaiBerulang: "s/d 17:00 WIB · 2× seminggu",
    linkKontak: "",
    publishedAt: "2026-05-22T00:00:00+07:00",
    sortOrder: 80,
    isFeatured: false,
  },
  {
    title: "Bakti Sosial Bantuan Sembako",
    slug: "bakti-sosial-sembako",
    excerpt: "Kegiatan penyaluran sembako untuk warga kurang mampu di sekitar masjid.",
    lokasi: "Halaman Depan Masjid",
    pemateri: "Tim DKM & Relawan Alfurqon",
    waktuMulai: "25 Mei 2026 · 08:00 WIB",
    selesaiBerulang: "s/d 12:00 WIB · sekali",
    linkKontak: "",
    publishedAt: "2026-05-25T00:00:00+07:00",
    sortOrder: 90,
    isFeatured: true,
  },
  {
    title: "Kajian Lansia: Akhirat & Persiapan",
    slug: "kajian-lansia-akhirat",
    excerpt: "Kajian khusus jamaah lansia tentang persiapan menghadapi akhirat.",
    lokasi: "Aula Utama Masjid Alfurqon",
    pemateri: "Ustadz H. Aminuddin",
    waktuMulai: "23 Mei 2026 · 09:00 WIB",
    selesaiBerulang: "s/d 10:30 WIB · 2 minggu sekali",
    linkKontak: "",
    publishedAt: "2026-05-23T00:00:00+07:00",
    sortOrder: 100,
    isFeatured: false,
  },
  {
    title: "Pelatihan Imam & Muadzin",
    slug: "pelatihan-imam-muadzin",
    excerpt: "Pelatihan teknik membaca iqra dan tata laksana imamah untuk calon imam masjid.",
    lokasi: "Masjid Alfurqon – Ruang Imam",
    pemateri: "Ustadz Qari H. Saiful",
    waktuMulai: "1 Juni 2026 · 13:00 WIB",
    selesaiBerulang: "s/d 16:00 WIB · sekali",
    linkKontak: "",
    publishedAt: "2026-06-01T00:00:00+07:00",
    sortOrder: 110,
    isFeatured: false,
  },
  {
    title: "Mabit Remaja: Menjaga Shalat Malam",
    slug: "mabit-remaja-shalat-malam",
    excerpt: "Program menginap remaja masjid dengan pembinaan shalat malam dan dzikir.",
    lokasi: "Asrama Remaja Masjid",
    pemateri: "Pembina Remaja Masjid",
    waktuMulai: "30 Mei 2026 · 20:00 WIB",
    selesaiBerulang: "s/d 31 Mei 04:30 WIB · sekali",
    linkKontak: "081234567890",
    publishedAt: "2026-05-30T00:00:00+07:00",
    sortOrder: 120,
    isFeatured: false,
  },
];

const PRAYER_STAFF: PrayerStaffSeed[] = [
  {
    title: "16 Mei 2026",
    slug: "petugas-jumat-2026-05-16",
    excerpt: "Penugasan imam, khatib, dan muadzin untuk Shalat Jumat pekan ini.",
    slotIbadah: "Jumat",
    jenisTugas: "Imam & Khatib",
    petugasUtama: "Ustadz H. Ridwan",
    pengganti: "Ustadz Ahmad",
    kontak: "0812-1111-2222",
    publishedAt: "2026-05-16T00:00:00+07:00",
    sortOrder: 10,
    isFeatured: false,
  },
  {
    title: "17 Mei 2026",
    slug: "petugas-subuh-2026-05-17",
    excerpt: "Jadwal petugas imam dan muadzin Shalat Subuh berjamaah di masjid.",
    slotIbadah: "Subuh",
    jenisTugas: "Imam",
    petugasUtama: "Ustadz Fadli Rahman",
    pengganti: "Ustadz Dani",
    kontak: "0812-3333-4444",
    publishedAt: "2026-05-17T00:00:00+07:00",
    sortOrder: 20,
    isFeatured: false,
  },
  {
    title: "17 Mei 2026",
    slug: "petugas-dzuhur-2026-05-17",
    excerpt: "Penugasan imam Dzuhur dan petugas adzan untuk hari Minggu.",
    slotIbadah: "Dzuhur",
    jenisTugas: "Imam",
    petugasUtama: "Ustadz H. Maman",
    pengganti: "",
    kontak: "0812-5555-6666",
    publishedAt: "2026-05-17T00:00:00+07:00",
    sortOrder: 30,
    isFeatured: false,
  },
  {
    title: "17 Mei 2026",
    slug: "petugas-ashar-2026-05-17",
    excerpt: "Daftar petugas Ashar berjamaah termasuk muadzin dan imam.",
    slotIbadah: "Ashar",
    jenisTugas: "Imam",
    petugasUtama: "Ustadz Abdullah",
    pengganti: "Ustadz Qori H. Saiful",
    kontak: "",
    publishedAt: "2026-05-17T00:00:00+07:00",
    sortOrder: 40,
    isFeatured: false,
  },
  {
    title: "17 Mei 2026",
    slug: "petugas-maghrib-2026-05-17",
    excerpt: "Petugas Maghrib dan kajian singkat setelah shalat bila ada.",
    slotIbadah: "Maghrib",
    jenisTugas: "Imam",
    petugasUtama: "Ustadz Ahmad Fauzi",
    pengganti: "",
    kontak: "0812-7777-8888",
    publishedAt: "2026-05-17T00:00:00+07:00",
    sortOrder: 50,
    isFeatured: false,
  },
  {
    title: "17 Mei 2026",
    slug: "petugas-isya-2026-05-17",
    excerpt: "Jadwal imam dan muadzin Isya berjamaah.",
    slotIbadah: "Isya",
    jenisTugas: "Imam",
    petugasUtama: "Ustadz H. Aminuddin",
    pengganti: "Ustadz Fadli Rahman",
    kontak: "",
    publishedAt: "2026-05-17T00:00:00+07:00",
    sortOrder: 60,
    isFeatured: false,
  },
  {
    title: "1 Ramadhan 1447 H",
    slug: "petugas-tarawih-malam-1",
    excerpt: "Penugasan imam tarawih dan petugas pengatur jamaah malam pertama.",
    slotIbadah: "Tarawih",
    jenisTugas: "Imam",
    petugasUtama: "Qari H. Saiful",
    pengganti: "Tim pengatur jamaah DKM",
    kontak: "Koordinator: 0812-9999-0000",
    publishedAt: "2026-02-28T00:00:00+07:00",
    sortOrder: 70,
    isFeatured: true,
  },
  {
    title: "23 Mei 2026",
    slug: "petugas-jumat-2026-05-23",
    excerpt: "Penugasan pekan depan untuk Shalat Jumat dan khutbah.",
    slotIbadah: "Jumat",
    jenisTugas: "Khatib",
    petugasUtama: "Ustadz Dr. Yusuf Mansur",
    pengganti: "Ustadz H. Ridwan (imam)",
    kontak: "",
    publishedAt: "2026-05-23T00:00:00+07:00",
    sortOrder: 80,
    isFeatured: false,
  },
  {
    title: "18 Mei 2026",
    slug: "petugas-subuh-2026-05-18",
    excerpt: "Rotasi petugas Subuh hari Senin untuk jamaah pekerja.",
    slotIbadah: "Subuh",
    jenisTugas: "Imam",
    petugasUtama: "Ustadz Dani",
    pengganti: "",
    kontak: "",
    publishedAt: "2026-05-18T00:00:00+07:00",
    sortOrder: 90,
    isFeatured: false,
  },
  {
    title: "18 Mei 2026",
    slug: "petugas-dzuhur-2026-05-18",
    excerpt: "Jadwal Dzuhur Senin termasuk petugas kebersihan musholla.",
    slotIbadah: "Dzuhur",
    jenisTugas: "Imam",
    petugasUtama: "Ustadz Fadli Rahman",
    pengganti: "Pak Budi (kebersihan musholla)",
    kontak: "0812-1212-3434",
    publishedAt: "2026-05-18T00:00:00+07:00",
    sortOrder: 100,
    isFeatured: false,
  },
  {
    title: "18 Mei 2026",
    slug: "petugas-isya-kajian-2026-05-18",
    excerpt: "Imam Isya diikuti kajian ringkas setelah shalat.",
    slotIbadah: "Isya",
    jenisTugas: "Imam & pembimbing kajian",
    petugasUtama: "Ustadz H. Ridwan",
    pengganti: "",
    kontak: "",
    publishedAt: "2026-05-18T00:00:00+07:00",
    sortOrder: 110,
    isFeatured: false,
  },
  {
    title: "Idul Fitri 1447 H",
    slug: "petugas-idul-fitri-1447",
    excerpt: "Susunan petugas Shalat Id lapangan utara masjid (rencana).",
    slotIbadah: "Id",
    jenisTugas: "Imam",
    petugasUtama: "Ustadz H. Aminuddin",
    pengganti: "Tim muadzin DKM",
    kontak: "Sekretariat DKM",
    publishedAt: "2026-04-10T00:00:00+07:00",
    sortOrder: 120,
    isFeatured: true,
  },
];

const GALLERY_ITEMS: GallerySeed[] = [
  {
    title: "Bakti Sosial Sembako Ramadhan",
    slug: "galeri-bakti-sosial-sembako",
    excerpt: "Dokumentasi penyaluran paket sembako kepada 150 keluarga sekitar masjid.",
    body: "<p>Alhamdulillah kegiatan berjalan lancar dengan dukungan jamaah dan donatur.</p>",
    tanggalKegiatan: "15 Maret 2026",
    lokasi: "Halaman Masjid Alfurqon",
    publishedAt: "2026-03-15T00:00:00+07:00",
    sortOrder: 10,
    isFeatured: true,
  },
  {
    title: "Kajian Akbar Maulid Nabi",
    slug: "galeri-kajian-maulid-nabi",
    excerpt: "Ribuan jamaah hadir dalam kajian akbar peringatan Maulid Nabi Muhammad SAW.",
    body: "<p>Kajian dimeriahkan qasidah dan tausiyah dari ulama tamu.</p>",
    tanggalKegiatan: "5 September 2026",
    lokasi: "Aula Utama",
    publishedAt: "2026-09-05T00:00:00+07:00",
    sortOrder: 20,
    isFeatured: true,
  },
  {
    title: "Pengajian Ibu-Ibu Rutin",
    slug: "galeri-pengajian-ibu-ibu",
    excerpt: "Kelas pengajian mingguan untuk jamaah perempuan di ruang ta'lim.",
    body: "<p>Materi membahas tafsir surat-surat pendek dan adab keluarga.</p>",
    tanggalKegiatan: "20 April 2026",
    lokasi: "Ruang Ta'lim Lt. 2",
    publishedAt: "2026-04-20T00:00:00+07:00",
    sortOrder: 30,
    isFeatured: false,
  },
  {
    title: "Pembersihan Masjid Jumat Bersih",
    slug: "galeri-jumat-bersih",
    excerpt: "Gotong royong membersihkan area masjid setiap minggu sebelum Jumat.",
    body: "<p>Relawan dari berbagai RW berpartisipasi aktif.</p>",
    tanggalKegiatan: "9 Mei 2026",
    lokasi: "Seluruh Area Masjid",
    publishedAt: "2026-05-09T00:00:00+07:00",
    sortOrder: 40,
    isFeatured: false,
  },
  {
    title: "Santunan Anak Yatim",
    slug: "galeri-santunan-anak-yatim",
    excerpt: "Program santunan dan pembagian tas sekolah untuk anak yatim mitra masjid.",
    body: "<p>Kerjasama dengan Lembaga Amil Zakat setempat.</p>",
    tanggalKegiatan: "12 Januari 2026",
    lokasi: "Aula Serbaguna",
    publishedAt: "2026-01-12T00:00:00+07:00",
    sortOrder: 50,
    isFeatured: false,
  },
  {
    title: "Pelatihan PMR Masjid",
    slug: "galeri-pelatihan-pmr",
    excerpt: "Pelatihan pertolongan pertama bagi remaja masjid dan relawan.",
    body: "<p>Instruktur dari PMI Kota Bekasi.</p>",
    tanggalKegiatan: "28 Februari 2026",
    lokasi: "Ruang Pemuda",
    publishedAt: "2026-02-28T00:00:00+07:00",
    sortOrder: 60,
    isFeatured: false,
  },
  {
    title: "Penggalangan Dana Renovasi",
    slug: "galeri-dana-renovasi",
    excerpt: "Launching program renovasi atap masjid dan penyerahan donasi awal.",
    body: "<p>Target renovasi tahap satu: atap dan drainase.</p>",
    tanggalKegiatan: "1 Maret 2026",
    lokasi: "Serambi Depan",
    publishedAt: "2026-03-01T00:00:00+07:00",
    sortOrder: 70,
    isFeatured: true,
  },
  {
    title: "Mabit Remaja Masjid",
    slug: "galeri-mabit-remaja",
    excerpt: "Dokumentasi kegiatan mabit remaja dengan shalat malam dan muhasabah.",
    body: "<p>Peserta 45 remaja dari lingkungan sekitar.</p>",
    tanggalKegiatan: "5 April 2026",
    lokasi: "Asrama Remaja",
    publishedAt: "2026-04-05T00:00:00+07:00",
    sortOrder: 80,
    isFeatured: false,
  },
  {
    title: "Buka Bersama Jamaah",
    slug: "galeri-buka-bersama",
    excerpt: "Buka puasa bersama 500 porsi untuk jamaah dan tamu masjid.",
    body: "<p>Menu disponsori warung jamaah dan donatur.</p>",
    tanggalKegiatan: "22 Maret 2026",
    lokasi: "Halaman Utara",
    publishedAt: "2026-03-22T00:00:00+07:00",
    sortOrder: 90,
    isFeatured: false,
  },
  {
    title: "Kunjungan Sekolah Islam",
    slug: "galeri-kunjungan-sekolah",
    excerpt: "Studi banding siswa MI se-Bekasi Timur mengenal fasilitas masjid.",
    body: "<p>Tur musholla, perpustakaan, dan museum mini sejarah masjid.</p>",
    tanggalKegiatan: "2 Mei 2026",
    lokasi: "Masjid Alfurqon",
    publishedAt: "2026-05-02T00:00:00+07:00",
    sortOrder: 100,
    isFeatured: false,
  },
  {
    title: "Penyaluran Zakat Fitrah",
    slug: "galeri-zakat-fitrah",
    excerpt: "Distribusi zakat fitrah kepada mustahik di wilayah kelurahan setempat.",
    body: "<p>Total 320 paket beras 5 kg per mustahik.</p>",
    tanggalKegiatan: "10 April 2026",
    lokasi: "Kantor Sekretariat DKM",
    publishedAt: "2026-04-10T00:00:00+07:00",
    sortOrder: 110,
    isFeatured: false,
  },
  {
    title: "Tabligh Akbar Akhir Tahun",
    slug: "galeri-tabligh-akhir-tahun",
    excerpt: "Tabligh akhir tahun dengan tema muhasabah diri dan persiapan hijrah.",
    body: "<p>Hadir ulama tamu dan tampil seni islami anak-anak TPQ.</p>",
    tanggalKegiatan: "28 Desember 2025",
    lokasi: "Lapangan Parkir Utara",
    publishedAt: "2025-12-28T00:00:00+07:00",
    sortOrder: 120,
    isFeatured: true,
  },
];

function emptyToNull(v: string): string | null {
  const s = v.trim();
  return s === "" ? null : s;
}

/** Baris insert — nama kolom DB persis, hindari salah urutan attr. */
type ContentItemInsert = {
  type: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string | null;
  cover_image_url: string | null;
  published_at: string;
  sort_order: number;
  is_featured: boolean;
  attr_1: string | null;
  attr_2: string | null;
  attr_3: string | null;
  attr_4: string | null;
  attr_5: string | null;
};

function eventRow(e: EventSeed): ContentItemInsert {
  return {
    type: "event",
    title: e.title,
    slug: e.slug,
    excerpt: e.excerpt,
    body: null,
    cover_image_url: null,
    published_at: e.publishedAt,
    sort_order: e.sortOrder,
    is_featured: e.isFeatured,
    attr_1: e.lokasi,
    attr_2: e.pemateri,
    attr_3: e.waktuMulai,
    attr_4: e.selesaiBerulang,
    attr_5: emptyToNull(e.linkKontak),
  };
}

function prayerRow(p: PrayerStaffSeed): ContentItemInsert {
  return {
    type: "prayer_staff",
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    body: null,
    cover_image_url: null,
    published_at: p.publishedAt,
    sort_order: p.sortOrder,
    is_featured: p.isFeatured,
    attr_1: p.slotIbadah,
    attr_2: p.jenisTugas,
    attr_3: p.petugasUtama,
    attr_4: emptyToNull(p.pengganti),
    attr_5: emptyToNull(p.kontak),
  };
}

function galleryRow(g: GallerySeed, cover_image_url: string | null): ContentItemInsert {
  return {
    type: "gallery",
    title: g.title,
    slug: g.slug,
    excerpt: g.excerpt,
    body: g.body,
    cover_image_url,
    published_at: g.publishedAt,
    sort_order: g.sortOrder,
    is_featured: g.isFeatured,
    attr_1: g.tanggalKegiatan,
    attr_2: g.lokasi,
    attr_3: null,
    attr_4: null,
    attr_5: null,
  };
}

function resolveTemplateAssetsDir(): string | null {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "../../../../frontend/public/bismillah/assets/images/resources"),
    join(process.cwd(), "frontend/public/bismillah/assets/images/resources"),
    join(process.cwd(), "../../frontend/public/bismillah/assets/images/resources"),
  ];
  for (const dir of candidates) {
    if (existsSync(join(dir, "gallery-img2-1.jpg"))) return dir;
  }
  return null;
}

function ensureGalleryUploads(count: number): string[] {
  const assetsDir = resolveTemplateAssetsDir();
  const contentDir = join(uploadsRootDir(), "content");
  mkdirSync(contentDir, { recursive: true });

  const urls: string[] = [];
  for (let i = 0; i < count; i++) {
    const n = (i % 6) + 1;
    const filename = `demo-gallery-${String(i + 1).padStart(2, "0")}.jpg`;
    const dest = join(contentDir, filename);
    if (assetsDir) {
      const src = join(assetsDir, `gallery-img2-${n}.jpg`);
      if (existsSync(src)) copyFileSync(src, dest);
    }
    urls.push(`/api/uploads/content/${filename}`);
  }
  return urls;
}

async function upsertContentItem(row: ContentItemInsert): Promise<void> {
  await pool.query(
    `INSERT INTO content_items (
       type, title, slug, excerpt, body, cover_image_url, status, published_at,
       sort_order, is_featured, meta_json, attr_1, attr_2, attr_3, attr_4, attr_5
     ) VALUES (
       $1, $2, $3, $4, $5, $6, 'published', $7::timestamptz,
       $8, $9, '{}'::jsonb, $10, $11, $12, $13, $14
     )
     ON CONFLICT (type, slug) DO UPDATE SET
       title = EXCLUDED.title,
       excerpt = EXCLUDED.excerpt,
       body = EXCLUDED.body,
       cover_image_url = EXCLUDED.cover_image_url,
       status = 'published',
       published_at = EXCLUDED.published_at,
       sort_order = EXCLUDED.sort_order,
       is_featured = EXCLUDED.is_featured,
       attr_1 = EXCLUDED.attr_1,
       attr_2 = EXCLUDED.attr_2,
       attr_3 = EXCLUDED.attr_3,
       attr_4 = EXCLUDED.attr_4,
       attr_5 = EXCLUDED.attr_5`,
    [
      row.type,
      row.title,
      row.slug,
      row.excerpt,
      row.body,
      row.cover_image_url,
      row.published_at,
      row.sort_order,
      row.is_featured,
      row.attr_1,
      row.attr_2,
      row.attr_3,
      row.attr_4,
      row.attr_5,
    ]
  );
}

/** Pastikan baris di DB cocok dengan skema faker setelah seed. */
async function verifyDemoContent(): Promise<void> {
  const sample = await pool.query<{
    type: string;
    slug: string;
    attr_1: string | null;
    attr_2: string | null;
    attr_3: string | null;
  }>(
    `SELECT type, slug, attr_1, attr_2, attr_3 FROM content_items
     WHERE (type = 'event' AND slug = $1)
        OR (type = 'prayer_staff' AND slug = $2)
        OR (type = 'gallery' AND slug = $3)`,
    ["kajian-ahad-sirah-nabawiyah", "petugas-jumat-2026-05-16", "galeri-bakti-sosial-sembako"]
  );
  const bySlug = new Map(sample.rows.map((r) => [`${r.type}:${r.slug}`, r]));
  const ev = EVENTS[0]!;
  const pr = PRAYER_STAFF[0]!;
  const gal = GALLERY_ITEMS[0]!;
  const evDb = bySlug.get(`event:${ev.slug}`);
  const prDb = bySlug.get(`prayer_staff:${pr.slug}`);
  const galDb = bySlug.get(`gallery:${gal.slug}`);
  if (!evDb || evDb.attr_1 !== ev.lokasi || evDb.attr_2 !== ev.pemateri || evDb.attr_3 !== ev.waktuMulai) {
    throw new Error("Verifikasi gagal: kolom event tidak sesuai (attr_1=lokasi, attr_2=pemateri, attr_3=waktu)");
  }
  if (
    !prDb ||
    prDb.attr_1 !== pr.slotIbadah ||
    prDb.attr_2 !== pr.jenisTugas ||
    prDb.attr_3 !== pr.petugasUtama
  ) {
    throw new Error(
      "Verifikasi gagal: kolom prayer_staff tidak sesuai (attr_1=slot, attr_2=jenis tugas, attr_3=petugas)"
    );
  }
  if (!galDb || galDb.attr_1 !== gal.tanggalKegiatan || galDb.attr_2 !== gal.lokasi) {
    throw new Error("Verifikasi gagal: kolom gallery tidak sesuai (attr_1=tanggal, attr_2=lokasi)");
  }
}

const DEMO_CONTENT_TYPES = ["event", "prayer_staff", "gallery"] as const;

/** Hapus semua konten demo operasional + file galeri seed. */
export async function clearDemoContent(): Promise<{ deletedRows: number; removedFiles: number }> {
  const del = await pool.query<{ count: string }>(
    `WITH deleted AS (
       DELETE FROM content_items
       WHERE type = ANY($1::text[])
       RETURNING id
     )
     SELECT COUNT(*)::text AS count FROM deleted`,
    [DEMO_CONTENT_TYPES]
  );
  const deletedRows = Number(del.rows[0]?.count ?? 0);

  const contentDir = join(uploadsRootDir(), "content");
  let removedFiles = 0;
  for (let i = 1; i <= GALLERY_ITEMS.length; i++) {
    const file = join(contentDir, `demo-gallery-${String(i).padStart(2, "0")}.jpg`);
    if (existsSync(file)) {
      unlinkSync(file);
      removedFiles += 1;
    }
  }

  console.log(`Demo content dihapus: ${deletedRows} baris DB, ${removedFiles} file galeri.`);
  return { deletedRows, removedFiles };
}

/** Seed demo: jadwal kegiatan, petugas ibadah, galeri (masing-masing 12 item). */
export async function seedDemoContent(): Promise<void> {
  const galleryCovers = ensureGalleryUploads(GALLERY_ITEMS.length);

  for (const e of EVENTS) {
    await upsertContentItem(eventRow(e));
  }

  for (const p of PRAYER_STAFF) {
    await upsertContentItem(prayerRow(p));
  }

  for (let i = 0; i < GALLERY_ITEMS.length; i++) {
    await upsertContentItem(galleryRow(GALLERY_ITEMS[i]!, galleryCovers[i] ?? null));
  }

  await verifyDemoContent();

  const assetsDir = resolveTemplateAssetsDir();
  console.log(
    `Demo content: ${EVENTS.length} event, ${PRAYER_STAFF.length} prayer_staff, ${GALLERY_ITEMS.length} gallery (verifikasi kolom OK)` +
      (assetsDir ? ` — gambar dari ${assetsDir}` : "")
  );
}
