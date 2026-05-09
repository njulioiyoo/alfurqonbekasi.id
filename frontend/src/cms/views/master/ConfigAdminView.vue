<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { getAdminConfig, putAdminConfig, uploadAdminImage } from "../../api/admin.js";
import { useAccessStore } from "../../stores/access.js";

type ConfigTab = "website" | "branding" | "seo" | "social" | "integrations" | "advanced";

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
  maintenanceMode: false,
  allowPublicRegistration: false,
  cacheTtlSeconds: 300,
  rateLimitPerMinute: 120,
});

const tabs: { id: ConfigTab; label: string; icon: string }[] = [
  { id: "website", label: "Website", icon: "flaticon2-architecture-and-city" },
  { id: "branding", label: "Branding", icon: "flaticon2-graphic" },
  { id: "seo", label: "SEO", icon: "flaticon2-search-1" },
  { id: "social", label: "Sosial", icon: "flaticon2-share" },
  { id: "integrations", label: "Integrasi", icon: "flaticon2-layers-1" },
  { id: "advanced", label: "Advanced", icon: "flaticon2-settings" },
];

type ImageField = "logoUrl" | "logoLightUrl" | "faviconUrl" | "seoOgImage";

const activeTabLabel = computed(() => tabs.find((t) => t.id === activeTab.value)?.label ?? "Website");

const configKeys = [
  "websiteName",
  "websiteTagline",
  "websiteUrl",
  "adminEmail",
  "adminPhone",
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
  "maintenanceMode",
  "allowPublicRegistration",
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
      if (key === "seoIndexing" || key === "maintenanceMode" || key === "allowPublicRegistration") {
        (form.value[key] as boolean) = readBool(raw, form.value[key] as boolean);
        continue;
      }
      if (key === "cacheTtlSeconds" || key === "rateLimitPerMinute") {
        (form.value[key] as number) = readNumber(raw, form.value[key] as number);
        continue;
      }
      (form.value[key] as string) = raw;
    }
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
          </div>

          <div v-else class="row">
            <div class="col-lg-6">
              <div class="kt-checkbox-inline kt-margin-b-15">
                <label class="kt-checkbox">
                  <input v-model="form.maintenanceMode" type="checkbox" />
                  Maintenance Mode
                  <span></span>
                </label>
              </div>
            </div>
            <div class="col-lg-6">
              <div class="kt-checkbox-inline kt-margin-b-15">
                <label class="kt-checkbox">
                  <input v-model="form.allowPublicRegistration" type="checkbox" />
                  Izinkan Registrasi Publik
                  <span></span>
                </label>
              </div>
            </div>
            <div class="col-lg-6">
              <div class="form-group">
                <label>Cache TTL (detik)</label>
                <input v-model.number="form.cacheTtlSeconds" type="number" min="0" class="form-control" />
              </div>
            </div>
            <div class="col-lg-6">
              <div class="form-group">
                <label>Rate Limit / Menit</label>
                <input v-model.number="form.rateLimitPerMinute" type="number" min="1" class="form-control" />
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
</style>
