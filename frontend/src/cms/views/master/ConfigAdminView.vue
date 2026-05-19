<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { getAdminConfig, putAdminConfig, uploadAdminImage } from "../../api/admin.js";
import { useAccessStore } from "../../stores/access.js";

interface JQueryLite {
  fn?: {
    summernote?: (...args: unknown[]) => unknown;
  };
  summernote?: (...args: unknown[]) => unknown;
}

function jq(): Window["jQuery"] {
  return window.jQuery;
}

type ConfigTab = "website" | "home" | "branding" | "visimisi" | "seo" | "social" | "integrations" | "advanced";

const activeTab = ref<ConfigTab>("website");
const saving = ref(false);
const loadError = ref("");
const loading = ref(false);

const access = useAccessStore();
const { flags: accessFlags } = storeToRefs(access);
const canUpdateSetting = computed(() => accessFlags.value.canUpdateSetting);

const form = ref({
  websiteName: "Masjid Alfurqon Bekasi",
  websiteTagline: "Pusat Informasi & Kegiatan Masjid",
  websiteUrl: "https://alfurqonbekasi.or.id",
  adminEmail: "admin@alfurqonbekasi.or.id",
  adminPhone: "+62 812-0000-0000",
  address: "",
  city: "",
  province: "",
  postalCode: "",
  timezone: "Asia/Jakarta",
  locale: "id-ID",
  titleTemplate: "%PAGE_TITLE% | %SITE_NAME%",
  siteTitle: "Masjid Alfurqon Bekasi",
  logoUrl: "/uploads/branding/logo-main.png",
  logoLightUrl: "/uploads/branding/logo-light.png",
  faviconUrl: "/uploads/branding/favicon.ico",
  footerText: "© Masjid Alfurqon Bekasi",
  seoIndexing: true,
  seoMetaTitle: "Masjid Alfurqon Bekasi - Informasi Kegiatan, Kajian, Donasi",
  seoMetaDescription:
    "Website resmi Masjid Alfurqon Bekasi. Jadwal kajian, artikel islami, pengumuman, donasi, dan informasi kegiatan jamaah.",
  seoMetaKeywords: "masjid, bekasi, kajian, donasi, alfurqon",
  seoOgImage: "/uploads/seo/og-default.jpg",
  seoTwitterCard: "summary_large_image",
  seoCanonical: "https://alfurqonbekasi.or.id",
  igUrl: "https://instagram.com/alfurqonbekasi",
  ytUrl: "https://youtube.com/@alfurqonbekasi",
  fbUrl: "",
  xUrl: "",
  tiktokUrl: "",
  waChannelUrl: "",
  gaMeasurementId: "",
  gtmContainerId: "",
  recaptchaSiteKey: "",
  mapsEmbedUrl: "",
  islamicDaysUrl: "https://www.islamicfinder.org/specialislamicdays/",
  smtpHost: "smtp.gmail.com",
  smtpPort: "587",
  smtpUser: "",
  smtpPass: "",
  smtpFrom: "",
  contactNotifyEmail: "",
  visi: "",
  misi: "",
  maintenanceMode: false,
  cacheTtlSeconds: 300,
  rateLimitPerMinute: 120,
});

const tabs: { id: ConfigTab; label: string; icon: string }[] = [
  { id: "website", label: "Website", icon: "flaticon2-architecture-and-city" },
  { id: "home", label: "Banner beranda", icon: "flaticon2-photo-camera" },
  { id: "branding", label: "Branding", icon: "flaticon2-graphic" },
  { id: "visimisi", label: "Visi & Misi", icon: "flaticon2-rocket-1" },
  { id: "seo", label: "SEO", icon: "flaticon2-search-1" },
  { id: "social", label: "Sosial", icon: "flaticon2-share" },
  { id: "integrations", label: "Integrasi", icon: "flaticon2-layers-1" },
  { id: "advanced", label: "Advanced", icon: "flaticon2-settings" },
];

type ImageField = "logoUrl" | "logoLightUrl" | "faviconUrl" | "seoOgImage";

type CmsHomeBannerSlide = {
  imageUrl: string;
  title: string;
  subtitle: string;
  linkUrl: string;
  linkLabel: string;
};

function emptyBannerSlide(): CmsHomeBannerSlide {
  return { imageUrl: "", title: "", subtitle: "", linkUrl: "", linkLabel: "Selengkapnya" };
}

function parseBannerSlidesFromJson(raw: string | undefined): CmsHomeBannerSlide[] {
  if (!raw?.trim()) return [emptyBannerSlide()];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data) || data.length === 0) return [emptyBannerSlide()];
    const out: CmsHomeBannerSlide[] = [];
    for (const row of data) {
      if (!row || typeof row !== "object") continue;
      const o = row as Record<string, unknown>;
      out.push({
        imageUrl: typeof o.imageUrl === "string" ? o.imageUrl : "",
        title: typeof o.title === "string" ? o.title : "",
        subtitle: typeof o.subtitle === "string" ? o.subtitle : "",
        linkUrl: typeof o.linkUrl === "string" ? o.linkUrl : "",
        linkLabel: typeof o.linkLabel === "string" && o.linkLabel.trim() ? o.linkLabel : "Selengkapnya",
      });
    }
    return out.length ? out : [emptyBannerSlide()];
  } catch {
    return [emptyBannerSlide()];
  }
}

const bannerSlides = ref<CmsHomeBannerSlide[]>([emptyBannerSlide()]);

const BANNER_W = 1920;
const BANNER_H = 990;
const bannerAccept = "image/jpeg,image/png,image/webp";
const bannerSizeHint = `Gambar wajib tepat ${BANNER_W}×${BANNER_H} px (JPEG, PNG, atau WebP).`;

function readImageFileDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("INVALID_IMAGE"));
    };
    img.src = url;
  });
}

async function validateBannerFile(file: File): Promise<string | null> {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) return "Banner hanya JPEG, PNG, atau WebP.";
  try {
    const { width, height } = await readImageFileDimensions(file);
    if (width === BANNER_W && height === BANNER_H) return null;
    return `Banner wajib ${BANNER_W}×${BANNER_H} px. Terdeteksi: ${width}×${height}.`;
  } catch {
    return "Tidak dapat membaca ukuran gambar.";
  }
}

function addBannerSlide(): void {
  bannerSlides.value.push(emptyBannerSlide());
}

function removeBannerSlide(index: number): void {
  if (bannerSlides.value.length <= 1) {
    bannerSlides.value = [emptyBannerSlide()];
    return;
  }
  bannerSlides.value.splice(index, 1);
}

async function onBannerImagePick(index: number, ev: Event): Promise<void> {
  const t = ev.target;
  if (!(t instanceof HTMLInputElement) || !t.files?.[0]) return;
  const file = t.files[0];
  t.value = "";
  const err = await validateBannerFile(file);
  if (err) {
    toastError(err);
    return;
  }
  toastLoading("Mengupload banner…");
  try {
    const json = await uploadAdminImage(file, { context: "banner" });
    if (!json.ok || !json.data?.url) {
      toastError(json.error?.message || "Upload gagal");
      return;
    }
    bannerSlides.value[index] = { ...bannerSlides.value[index]!, imageUrl: json.data.url };
    toastSuccess("Gambar banner berhasil diupload.");
  } catch {
    toastError("Tidak dapat menghubungi server saat upload");
  }
}

const activeTabLabel = computed(() => tabs.find((t) => t.id === activeTab.value)?.label ?? "Website");

const configKeys = [
  "websiteName",
  "websiteTagline",
  "websiteUrl",
  "adminEmail",
  "adminPhone",
  "address",
  "city",
  "province",
  "postalCode",
  "timezone",
  "locale",
  "titleTemplate",
  "siteTitle",
  "logoUrl",
  "logoLightUrl",
  "faviconUrl",
  "footerText",
  "seoIndexing",
  "seoMetaTitle",
  "seoMetaDescription",
  "seoMetaKeywords",
  "seoOgImage",
  "seoTwitterCard",
  "seoCanonical",
  "igUrl",
  "ytUrl",
  "fbUrl",
  "xUrl",
  "tiktokUrl",
  "waChannelUrl",
  "gaMeasurementId",
  "gtmContainerId",
  "recaptchaSiteKey",
  "mapsEmbedUrl",
  "islamicDaysUrl",
  "smtpHost",
  "smtpPort",
  "smtpUser",
  "smtpPass",
  "smtpFrom",
  "contactNotifyEmail",
  "visi",
  "misi",
  "maintenanceMode",
  "cacheTtlSeconds",
  "rateLimitPerMinute",
] as const;

type ConfigKey = (typeof configKeys)[number];

declare global {
  interface Window {
    toastr?: {
      options: Record<string, unknown>;
      info: (message: string, title?: string) => unknown;
      success: (message: string, title?: string) => unknown;
      error: (message: string, title?: string) => unknown;
      clear: () => unknown;
    };
    jQuery?: {
      fn: {
        summernote?: (...args: unknown[]) => unknown;
      };
      (selector: Element | string): JQueryLite;
    };
  }
}

function toastLoading(message: string): void {
  if (!window.toastr) return;
  window.toastr.clear();
  window.toastr.options = {
    closeButton: true,
    progressBar: true,
    timeOut: 0,
    extendedTimeOut: 0,
    tapToDismiss: false,
  };
  window.toastr.info(message, "Proses");
}

function toastSuccess(message: string): void {
  if (!window.toastr) return;
  window.toastr.clear();
  window.toastr.options = { closeButton: true, progressBar: true, timeOut: 2200 };
  window.toastr.success(message, "Sukses");
}

function toastError(message: string): void {
  if (!window.toastr) return;
  window.toastr.clear();
  window.toastr.options = { closeButton: true, progressBar: true, timeOut: 3200 };
  window.toastr.error(message, "Gagal");
}

function readBool(v: string | undefined, fallback: boolean): boolean {
  if (v === undefined) return fallback;
  return v === "true" || v === "1";
}

function readNumber(v: string | undefined, fallback: number): number {
  if (v === undefined) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

const visiEditorRef = ref<HTMLDivElement | null>(null);
const misiEditorRef = ref<HTMLDivElement | null>(null);

const SUMMERNOTE_TOOLBAR: unknown[] = [
  ["style", ["bold", "italic", "underline", "clear"]],
  ["para", ["ul", "ol", "paragraph"]],
  ["insert", ["link", "hr"]],
  ["view", ["codeview"]],
];

function destroySummernoteOn(el: HTMLDivElement | null): void {
  const $ = jq();
  if (!$?.fn?.summernote || !el) return;
  try {
    $(el).summernote?.("destroy");
  } catch { /* ignore */ }
}

function initSummernoteOn(
  el: HTMLDivElement | null,
  opts: { initialHtml: string; placeholder: string; height: number; onChange: (html: string) => void }
): void {
  const $ = jq();
  if (!el || !$?.fn?.summernote) return;
  const $el = $(el);
  try { $el.summernote?.("destroy"); } catch { /* ignore */ }
  $el.summernote?.({
    airMode: false,
    disableResizeEditor: false,
    dialogsInBody: true,
    placeholder: opts.placeholder,
    height: opts.height,
    toolbar: SUMMERNOTE_TOOLBAR,
    callbacks: {
      onChange: (contents: string) => opts.onChange(contents),
    },
  });
  $el.summernote?.("code", opts.initialHtml || "");
}

function syncVisiMisiFromDom(): void {
  const $ = jq();
  if (!$?.fn?.summernote) return;
  if (visiEditorRef.value) {
    const code = $(visiEditorRef.value).summernote?.("code") as unknown;
    if (typeof code === "string") form.value.visi = code;
  }
  if (misiEditorRef.value) {
    const code = $(misiEditorRef.value).summernote?.("code") as unknown;
    if (typeof code === "string") form.value.misi = code;
  }
}

async function initVisiMisiEditors(): Promise<void> {
  await nextTick();
  initSummernoteOn(visiEditorRef.value, {
    initialHtml: form.value.visi,
    placeholder: "Tuliskan visi masjid…",
    height: 160,
    onChange: (html) => { form.value.visi = html; },
  });
  await nextTick();
  initSummernoteOn(misiEditorRef.value, {
    initialHtml: form.value.misi,
    placeholder: "Tuliskan misi masjid…",
    height: 220,
    onChange: (html) => { form.value.misi = html; },
  });
}

function destroyVisiMisiEditors(): void {
  destroySummernoteOn(visiEditorRef.value);
  destroySummernoteOn(misiEditorRef.value);
}

watch(activeTab, async (newTab, oldTab) => {
  if (oldTab === "visimisi") {
    syncVisiMisiFromDom();
    destroyVisiMisiEditors();
  }
  if (newTab === "visimisi") {
    await nextTick();
    void initVisiMisiEditors();
  }
});

async function loadConfig(): Promise<void> {
  loading.value = true;
  loadError.value = "";
  try {
    const json = await getAdminConfig();
    if (!json.ok || !json.data?.values) {
      loadError.value = json.error?.message || "Gagal memuat konfigurasi";
      return;
    }
    const values = json.data.values;
    for (const key of configKeys) {
      const raw = values[key];
      if (raw === undefined) continue;
      if (key === "seoIndexing" || key === "maintenanceMode") {
        (form.value[key] as boolean) = readBool(raw, form.value[key] as boolean);
        continue;
      }
      if (key === "cacheTtlSeconds" || key === "rateLimitPerMinute") {
        (form.value[key] as number) = readNumber(raw, form.value[key] as number);
        continue;
      }
      (form.value[key] as string) = raw;
    }
    bannerSlides.value = parseBannerSlidesFromJson(values.homeBannersJson);
  } catch {
    loadError.value = "Tidak dapat menghubungi server";
  } finally {
    loading.value = false;
  }
}

function formToMap(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of configKeys) {
    const val = form.value[key];
    out[key] = String(val);
  }
  const slides = bannerSlides.value.map((s) => ({
    imageUrl: s.imageUrl.trim(),
    title: s.title.trim(),
    subtitle: s.subtitle.trim(),
    linkUrl: s.linkUrl.trim(),
    linkLabel: s.linkLabel.trim() || "Selengkapnya",
  }));
  out.homeBannersJson = JSON.stringify(slides.filter((s) => s.imageUrl.length > 0));
  return out;
}

function previewUrl(field: ImageField): string {
  const v = String(form.value[field] ?? "").trim();
  return v.length > 0 ? v : "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='360'%3E%3Crect width='100%25' height='100%25' fill='%23f1f3f7'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23979fb8' font-family='Arial' font-size='20'%3ENo image%3C/text%3E%3C/svg%3E";
}

async function onImagePicked(field: ImageField, ev: Event): Promise<void> {
  const t = ev.target;
  if (!(t instanceof HTMLInputElement) || !t.files || !t.files[0]) return;
  const file = t.files[0];
  toastLoading("Mengupload gambar…");
  try {
    const json = await uploadAdminImage(file);
    if (!json.ok || !json.data?.url) {
      toastError(json.error?.message || "Upload gambar gagal");
      return;
    }
    form.value[field] = json.data.url;
    toastSuccess("Gambar berhasil diupload.");
  } catch {
    toastError("Tidak dapat menghubungi server saat upload");
  }
  t.value = "";
}

async function onSaveDraft(): Promise<void> {
  if (!canUpdateSetting.value) {
    toastError("Anda tidak punya izin update:Setting");
    return;
  }
  syncVisiMisiFromDom();
  saving.value = true;
  toastLoading("Menyimpan konfigurasi…");
  try {
    const json = await putAdminConfig(formToMap());
    if (!json.ok) {
      toastError(json.error?.message || "Gagal menyimpan draft");
      return;
    }
    window.dispatchEvent(new Event("cms-config-updated"));
    toastSuccess("Draft konfigurasi tersimpan.");
  } catch {
    toastError("Tidak dapat menghubungi server");
  } finally {
    saving.value = false;
  }
}

async function onPublish(): Promise<void> {
  if (!canUpdateSetting.value) {
    toastError("Anda tidak punya izin update:Setting");
    return;
  }
  syncVisiMisiFromDom();
  saving.value = true;
  toastLoading("Publish konfigurasi…");
  try {
    const payload = formToMap();
    payload.configPublishedAt = new Date().toISOString();
    const json = await putAdminConfig(payload);
    if (!json.ok) {
      toastError(json.error?.message || "Gagal publish");
      return;
    }
    window.dispatchEvent(new Event("cms-config-updated"));
    toastSuccess("Konfigurasi dipublish.");
  } catch {
    toastError("Tidak dapat menghubungi server");
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  void access.load();
  void loadConfig();
});

onUnmounted(() => {
  destroyVisiMisiEditors();
});
</script>

<template>
  <div class="row">
    <div class="col-12">
      <div class="kt-portlet kt-portlet--mobile">
        <div class="kt-portlet__head kt-portlet__head--lg kt-portlet__head--noborder">
          <div class="kt-portlet__head-label">
            <span class="kt-portlet__head-icon"><i class="kt-font-brand flaticon2-settings"></i></span>
            <h3 class="kt-portlet__head-title">Config</h3>
          </div>
          <div class="kt-portlet__head-toolbar">
            <button type="button" class="btn btn-sm btn-secondary kt-margin-r-10" :disabled="saving || !canUpdateSetting" @click="onSaveDraft">
              {{ saving ? "Menyimpan..." : "Simpan Draft" }}
            </button>
            <button type="button" class="btn btn-sm btn-brand" :disabled="saving || !canUpdateSetting" @click="onPublish">Publish</button>
          </div>
        </div>

        <div class="kt-portlet__head kt-portlet__head--fit">
          <div class="kt-portlet__head-toolbar w-100">
            <ul class="nav nav-tabs nav-tabs-line nav-tabs-line-brand nav-tabs-bold cms-config-tabs" role="tablist">
              <li v-for="tab in tabs" :key="tab.id" class="nav-item">
                <a
                  href="javascript:;"
                  class="nav-link"
                  :class="{ active: activeTab === tab.id }"
                  role="tab"
                  @click.prevent="activeTab = tab.id"
                >
                  <i :class="tab.icon"></i>
                  {{ tab.label }}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div class="kt-portlet__body">
          <div v-if="loading" class="kt-font-muted kt-margin-b-15">Memuat konfigurasi...</div>
          <div v-if="loadError" class="alert alert-outline-danger fade show" role="alert">
            <div class="alert-text">{{ loadError }}</div>
          </div>
          <div class="kt-heading kt-heading--sm kt-margin-b-20">
            <h4 class="kt-heading__title">Pengaturan {{ activeTabLabel }}</h4>
          </div>

          <div v-if="activeTab === 'website'" class="row">
            <div class="col-lg-6">
              <div class="form-group">
                <label>Nama Website</label>
                <input v-model="form.websiteName" type="text" class="form-control" />
              </div>
            </div>
            <div class="col-lg-6">
              <div class="form-group">
                <label>Tagline</label>
                <input v-model="form.websiteTagline" type="text" class="form-control" />
              </div>
            </div>
            <div class="col-lg-6">
              <div class="form-group">
                <label>URL Website</label>
                <input v-model="form.websiteUrl" type="url" class="form-control" />
              </div>
            </div>
            <div class="col-lg-6">
              <div class="form-group">
                <label>Email Admin</label>
                <input v-model="form.adminEmail" type="email" class="form-control" />
              </div>
            </div>
            <div class="col-lg-4">
              <div class="form-group">
                <label>Telepon Admin</label>
                <input v-model="form.adminPhone" type="text" class="form-control" />
              </div>
            </div>
            <div class="col-12"><hr class="kt-margin-t-0 kt-margin-b-15" /></div>
            <div class="col-lg-6">
              <div class="form-group">
                <label>Alamat Masjid</label>
                <textarea v-model="form.address" rows="2" class="form-control" placeholder="Jl. Contoh No. 123, Kel. ..."></textarea>
              </div>
            </div>
            <div class="col-lg-2">
              <div class="form-group">
                <label>Kota / Kabupaten</label>
                <input v-model="form.city" type="text" class="form-control" placeholder="Bekasi" />
              </div>
            </div>
            <div class="col-lg-2">
              <div class="form-group">
                <label>Provinsi</label>
                <input v-model="form.province" type="text" class="form-control" placeholder="Jawa Barat" />
              </div>
            </div>
            <div class="col-lg-2">
              <div class="form-group">
                <label>Kode Pos</label>
                <input v-model="form.postalCode" type="text" class="form-control" placeholder="17114" />
              </div>
            </div>
            <div class="col-12"><hr class="kt-margin-t-0 kt-margin-b-15" /></div>
            <div class="col-lg-4">
              <div class="form-group">
                <label>Timezone</label>
                <select v-model="form.timezone" class="form-control">
                  <option value="Asia/Jakarta">Asia/Jakarta</option>
                  <option value="Asia/Makassar">Asia/Makassar</option>
                  <option value="Asia/Jayapura">Asia/Jayapura</option>
                </select>
              </div>
            </div>
            <div class="col-lg-4">
              <div class="form-group">
                <label>Locale</label>
                <select v-model="form.locale" class="form-control">
                  <option value="id-ID">Indonesia (id-ID)</option>
                  <option value="en-US">English (en-US)</option>
                </select>
              </div>
            </div>
          </div>

          <div v-else-if="activeTab === 'home'" class="row">
            <div class="col-12">
              <p class="text-muted kt-margin-b-15">
                Atur slide hero beranda (seperti demo template). Tiap slide: gambar latar, judul, subjudul, dan tombol tautan.
              </p>
            </div>
            <div
              v-for="(slide, idx) in bannerSlides"
              :key="idx"
              class="col-12 kt-margin-b-20 cms-banner-slide-card"
            >
              <div class="kt-portlet kt-portlet--bordered kt-portlet--height-fluid">
                <div class="kt-portlet__head kt-portlet__head--noborder kt-padding-b-0">
                  <div class="kt-portlet__head-label">
                    <span class="kt-portlet__head-icon"><i class="la la-image"></i></span>
                    <h3 class="kt-portlet__head-title">Slide {{ idx + 1 }}</h3>
                  </div>
                  <div class="kt-portlet__head-toolbar">
                    <button type="button" class="btn btn-sm btn-label-danger" @click="removeBannerSlide(idx)">
                      <i class="la la-trash"></i> Hapus slide
                    </button>
                  </div>
                </div>
                <div class="kt-portlet__body">
                  <div class="row">
                    <div class="col-lg-5">
                      <div class="form-group">
                        <label>Gambar latar ({{ BANNER_W }}×{{ BANNER_H }} px)</label>
                        <input v-model="slide.imageUrl" type="text" class="form-control" readonly placeholder="URL setelah upload" />
                        <div class="custom-file kt-margin-t-10">
                          <input
                            :id="'cfg_banner_img_' + idx"
                            type="file"
                            class="custom-file-input"
                            :accept="bannerAccept"
                            @change="onBannerImagePick(idx, $event)"
                          />
                          <label class="custom-file-label" :for="'cfg_banner_img_' + idx">Upload gambar</label>
                        </div>
                        <span class="form-text text-muted">{{ bannerSizeHint }}</span>
                        <div v-if="slide.imageUrl" class="cms-banner-preview kt-margin-t-10">
                          <img :src="slide.imageUrl" alt="" />
                        </div>
                      </div>
                    </div>
                    <div class="col-lg-7">
                      <div class="form-group">
                        <label>Judul</label>
                        <input v-model="slide.title" type="text" class="form-control" placeholder="Judul utama di atas slide" />
                      </div>
                      <div class="form-group">
                        <label>Subjudul / deskripsi singkat</label>
                        <input v-model="slide.subtitle" type="text" class="form-control" placeholder="Teks di bawah judul" />
                      </div>
                      <div class="form-group">
                        <label>URL tombol (Selengkapnya / Read more)</label>
                        <input v-model="slide.linkUrl" type="text" class="form-control" placeholder="/donasi atau https://…" />
                      </div>
                      <div class="form-group mb-0">
                        <label>Teks tombol</label>
                        <input v-model="slide.linkLabel" type="text" class="form-control" placeholder="Selengkapnya" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-12">
              <button type="button" class="btn btn-sm btn-brand" @click="addBannerSlide">
                <i class="la la-plus"></i> Tambah slide
              </button>
            </div>
          </div>

          <div v-else-if="activeTab === 'branding'" class="row">
            <div class="col-lg-6">
              <div class="form-group">
                <label>Title Utama</label>
                <input v-model="form.siteTitle" type="text" class="form-control" />
              </div>
            </div>
            <div class="col-lg-6">
              <div class="form-group">
                <label>Template Title</label>
                <input v-model="form.titleTemplate" type="text" class="form-control" />
              </div>
            </div>
            <div class="col-lg-4">
              <div class="form-group">
                <label>Logo Utama (URL)</label>
                <input v-model="form.logoUrl" type="text" class="form-control" />
                <div class="custom-file kt-margin-t-10">
                  <input id="cfg_logo_main" type="file" class="custom-file-input" accept="image/*" @change="onImagePicked('logoUrl', $event)" />
                  <label class="custom-file-label" for="cfg_logo_main">Pilih gambar logo utama</label>
                </div>
                <div class="cms-image-preview kt-margin-t-10">
                  <img :src="previewUrl('logoUrl')" alt="Preview logo utama" />
                </div>
              </div>
            </div>
            <div class="col-lg-4">
              <div class="form-group">
                <label>Logo Light (URL)</label>
                <input v-model="form.logoLightUrl" type="text" class="form-control" />
                <div class="custom-file kt-margin-t-10">
                  <input id="cfg_logo_light" type="file" class="custom-file-input" accept="image/*" @change="onImagePicked('logoLightUrl', $event)" />
                  <label class="custom-file-label" for="cfg_logo_light">Pilih gambar logo light</label>
                </div>
                <div class="cms-image-preview kt-margin-t-10">
                  <img :src="previewUrl('logoLightUrl')" alt="Preview logo light" />
                </div>
              </div>
            </div>
            <div class="col-lg-4">
              <div class="form-group">
                <label>Favicon (URL)</label>
                <input v-model="form.faviconUrl" type="text" class="form-control" />
                <div class="custom-file kt-margin-t-10">
                  <input id="cfg_favicon" type="file" class="custom-file-input" accept="image/*" @change="onImagePicked('faviconUrl', $event)" />
                  <label class="custom-file-label" for="cfg_favicon">Pilih favicon</label>
                </div>
                <div class="cms-favicon-preview kt-margin-t-10">
                  <img :src="previewUrl('faviconUrl')" alt="Preview favicon" />
                </div>
              </div>
            </div>
            <div class="col-12">
              <div class="form-group mb-0">
                <label>Teks Footer</label>
                <input v-model="form.footerText" type="text" class="form-control" />
              </div>
            </div>
          </div>

          <div v-else-if="activeTab === 'visimisi'" class="row">
            <div class="col-12">
              <div class="form-group">
                <label>Visi</label>
                <div ref="visiEditorRef" class="cms-summernote-host"></div>
                <span class="form-text text-muted">Visi utama masjid yang ditampilkan di website.</span>
              </div>
            </div>
            <div class="col-12">
              <div class="form-group mb-0">
                <label>Misi</label>
                <div ref="misiEditorRef" class="cms-summernote-host"></div>
                <span class="form-text text-muted">Gunakan bullet list untuk misi yang rapi.</span>
              </div>
            </div>
          </div>

          <div v-else-if="activeTab === 'seo'" class="row">
            <div class="col-12">
              <div class="kt-checkbox-inline kt-margin-b-15">
                <label class="kt-checkbox">
                  <input v-model="form.seoIndexing" type="checkbox" />
                  Izinkan indexing mesin pencari
                  <span></span>
                </label>
              </div>
            </div>
            <div class="col-lg-6">
              <div class="form-group">
                <label>Meta Title</label>
                <input v-model="form.seoMetaTitle" type="text" class="form-control" />
              </div>
            </div>
            <div class="col-lg-6">
              <div class="form-group">
                <label>Canonical URL</label>
                <input v-model="form.seoCanonical" type="url" class="form-control" />
              </div>
            </div>
            <div class="col-12">
              <div class="form-group">
                <label>Meta Description</label>
                <textarea v-model="form.seoMetaDescription" rows="3" class="form-control"></textarea>
              </div>
            </div>
            <div class="col-lg-6">
              <div class="form-group">
                <label>Meta Keywords</label>
                <input v-model="form.seoMetaKeywords" type="text" class="form-control" />
              </div>
            </div>
            <div class="col-lg-3">
              <div class="form-group">
                <label>Twitter Card</label>
                <select v-model="form.seoTwitterCard" class="form-control">
                  <option value="summary_large_image">summary_large_image</option>
                  <option value="summary">summary</option>
                </select>
              </div>
            </div>
            <div class="col-lg-3">
              <div class="form-group">
                <label>OG Image (URL)</label>
                <input v-model="form.seoOgImage" type="text" class="form-control" />
                <div class="custom-file kt-margin-t-10">
                  <input id="cfg_og_image" type="file" class="custom-file-input" accept="image/*" @change="onImagePicked('seoOgImage', $event)" />
                  <label class="custom-file-label" for="cfg_og_image">Pilih OG image</label>
                </div>
                <div class="cms-image-preview kt-margin-t-10">
                  <img :src="previewUrl('seoOgImage')" alt="Preview OG image" />
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="activeTab === 'social'" class="row">
            <div class="col-lg-6"><div class="form-group"><label>Instagram</label><input v-model="form.igUrl" type="url" class="form-control" /></div></div>
            <div class="col-lg-6"><div class="form-group"><label>YouTube</label><input v-model="form.ytUrl" type="url" class="form-control" /></div></div>
            <div class="col-lg-6"><div class="form-group"><label>Facebook</label><input v-model="form.fbUrl" type="url" class="form-control" /></div></div>
            <div class="col-lg-6"><div class="form-group"><label>X / Twitter</label><input v-model="form.xUrl" type="url" class="form-control" /></div></div>
            <div class="col-lg-6"><div class="form-group"><label>TikTok</label><input v-model="form.tiktokUrl" type="url" class="form-control" /></div></div>
            <div class="col-lg-6"><div class="form-group"><label>WhatsApp Channel</label><input v-model="form.waChannelUrl" type="url" class="form-control" /></div></div>
          </div>

          <div v-else-if="activeTab === 'integrations'" class="row">
            <div class="col-lg-6">
              <div class="form-group">
                <label>Google Analytics Measurement ID</label>
                <input v-model="form.gaMeasurementId" type="text" class="form-control" placeholder="G-XXXXXXXXXX" />
              </div>
            </div>
            <div class="col-lg-6">
              <div class="form-group">
                <label>Google Tag Manager Container</label>
                <input v-model="form.gtmContainerId" type="text" class="form-control" placeholder="GTM-XXXXXXX" />
              </div>
            </div>
            <div class="col-lg-6">
              <div class="form-group">
                <label>reCAPTCHA Site Key</label>
                <input v-model="form.recaptchaSiteKey" type="text" class="form-control" />
              </div>
            </div>
            <div class="col-lg-6">
              <div class="form-group">
                <label>Google Maps Embed URL</label>
                <input v-model="form.mapsEmbedUrl" type="text" class="form-control" />
              </div>
            </div>
            <div class="col-lg-6">
              <div class="form-group">
                <label>Kalender Hari Besar Islam (URL)</label>
                <input v-model="form.islamicDaysUrl" type="text" class="form-control" placeholder="https://www.islamicfinder.org/specialislamicdays/" />
                <span class="form-text text-muted">URL iframe untuk widget hari besar Islam di footer. Default: IslamicFinder.</span>
              </div>
            </div>
            <div class="col-12"><hr /><h6 class="text-muted">Email / SMTP (Gmail)</h6></div>
            <div class="col-lg-6">
              <div class="form-group">
                <label>SMTP Host</label>
                <input v-model="form.smtpHost" type="text" class="form-control" placeholder="smtp.gmail.com" />
              </div>
            </div>
            <div class="col-lg-6">
              <div class="form-group">
                <label>SMTP Port</label>
                <input v-model="form.smtpPort" type="text" class="form-control" placeholder="587" />
                <span class="form-text text-muted">Gmail: 587 (TLS) atau 465 (SSL).</span>
              </div>
            </div>
            <div class="col-lg-6">
              <div class="form-group">
                <label>SMTP User (Gmail)</label>
                <input v-model="form.smtpUser" type="email" class="form-control" placeholder="email@gmail.com" />
              </div>
            </div>
            <div class="col-lg-6">
              <div class="form-group">
                <label>SMTP Password (App Password)</label>
                <input v-model="form.smtpPass" type="password" class="form-control" autocomplete="new-password" placeholder="16 karakter dari Google App Password" />
                <span class="form-text text-muted">
                  Gmail <strong>tidak</strong> menerima password login biasa. Aktifkan 2-Step Verification, lalu buat App Password di
                  <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer">myaccount.google.com/apppasswords</a>
                  dan paste di sini (tanpa spasi).
                </span>
              </div>
            </div>
            <div class="col-lg-6">
              <div class="form-group">
                <label>From Address</label>
                <input v-model="form.smtpFrom" type="email" class="form-control" placeholder="Kosongkan = sama dengan SMTP user" />
              </div>
            </div>
            <div class="col-lg-6">
              <div class="form-group">
                <label>Email Tujuan Notifikasi Kontak</label>
                <input v-model="form.contactNotifyEmail" type="email" class="form-control" placeholder="Kosongkan = Admin Email di tab Website" />
              </div>
            </div>
          </div>

          <div v-else class="row">
            <div class="col-lg-12">
              <div class="kt-checkbox-inline kt-margin-b-15">
                <label class="kt-checkbox">
                  <input v-model="form.maintenanceMode" type="checkbox" />
                  Maintenance Mode
                  <span></span>
                </label>
                <span class="form-text text-muted d-block kt-margin-t-5">
                  Jika aktif, website utama menampilkan halaman pemeliharaan dan formulir kontak dinonaktifkan.
                </span>
              </div>
            </div>
            <div class="col-lg-6">
              <div class="form-group">
                <label>Cache TTL (detik)</label>
                <input v-model.number="form.cacheTtlSeconds" type="number" min="0" class="form-control" />
                <span class="form-text text-muted">Header cache untuk <code>GET /public/config</code>. 0 = tanpa cache.</span>
              </div>
            </div>
            <div class="col-lg-6">
              <div class="form-group">
                <label>Rate Limit / Menit</label>
                <input v-model.number="form.rateLimitPerMinute" type="number" min="1" class="form-control" />
                <span class="form-text text-muted">Maks. request per IP per menit (kecuali health &amp; upload statis).</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cms-config-tabs {
  width: 100%;
  padding: 0 1.25rem;
  flex-wrap: wrap;
}

.cms-config-tabs .nav-link {
  white-space: nowrap;
  font-size: 0.9rem;
  padding: 0.65rem 0.85rem;
}

.cms-image-preview {
  width: 100%;
  min-height: 110px;
  max-height: 190px;
  border: 1px solid #e2e5ec;
  border-radius: 4px;
  background: #f7f8fa;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.cms-image-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.cms-favicon-preview {
  width: 72px;
  height: 72px;
  border: 1px solid #e2e5ec;
  border-radius: 4px;
  background: #f7f8fa;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.cms-favicon-preview img {
  width: 42px;
  height: 42px;
  object-fit: contain;
}

.cms-summernote-host {
  border: 1px solid #e2e5ec;
  border-radius: 4px;
  min-height: 120px;
}

.cms-banner-slide-card .cms-banner-preview {
  width: 100%;
  max-width: 480px;
  aspect-ratio: 1920 / 990;
  border: 1px solid #e2e5ec;
  border-radius: 4px;
  background: #f7f8fa;
  overflow: hidden;
}

.cms-banner-slide-card .cms-banner-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
