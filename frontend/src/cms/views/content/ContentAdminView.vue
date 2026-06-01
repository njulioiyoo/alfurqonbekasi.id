<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import {
  createAdminContent,
  deleteAdminContent,
  getAdminContent,
  patchAdminContent,
  uploadAdminFile,
  uploadAdminImage,
  type ContentRow,
} from "../../api/admin.js";
import KtRemoteDatatable from "../../components/KtRemoteDatatable.vue";
import { useAccessStore } from "../../stores/access.js";
import { alertErrorDialog, confirmDeleteDialog } from "../../utils/sweetalert.js";
import { resolveCmsAssetUrl } from "../../utils/upload-url.js";

type ContentType = "event" | "prayer_staff" | "program" | "gallery";

const props = withDefaults(
  defineProps<{
    fixedType: ContentType;
    listTitle: string;
    searchHintText?: string;
  }>(),
  { searchHintText: "" }
);

interface JQueryLite {
  fn?: {
    modal?: (...args: unknown[]) => unknown;
    datepicker?: (...args: unknown[]) => unknown;
    summernote?: (...args: unknown[]) => unknown;
  };
  modal?: (action?: string) => unknown;
  datepicker?: (...args: unknown[]) => JQueryLite;
  summernote?: (...args: unknown[]) => unknown;
}

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
        modal?: (...args: unknown[]) => unknown;
        datepicker?: (...args: unknown[]) => unknown;
        summernote?: (...args: unknown[]) => unknown;
      };
      (selector: Element | string): JQueryLite;
    };
  }
}

const access = useAccessStore();
const { flags: accessFlags } = storeToRefs(access);

const isScheduleMode = computed(() => props.fixedType === "event");
const isPrayerStaffMode = computed(() => props.fixedType === "prayer_staff");

function prayerSelectOptions(base: readonly string[], current: string): string[] {
  const c = current.trim();
  if (c && !base.includes(c)) return [c, ...base];
  return [...base];
}

const prayerSlotSelectOptions = computed(() =>
  prayerSelectOptions(PRAYER_SLOT_IBADAH_OPTIONS, form.value.attr1),
);
const prayerTaskSelectOptions = computed(() =>
  prayerSelectOptions(PRAYER_JENIS_TUGAS_OPTIONS, form.value.attr2),
);

const isProgramSocialMode = computed(() => props.fixedType === "program");
const isGalleryMode = computed(() => props.fixedType === "gallery");

const GALLERY_IMAGE_WIDTH = 390;
const GALLERY_IMAGE_HEIGHT = 353;
const GALLERY_IMAGE_SIZE_HINT = `Ukuran wajib tepat ${GALLERY_IMAGE_WIDTH}×${GALLERY_IMAGE_HEIGHT} px (JPEG, PNG, atau WebP).`;
const galleryCoverAccept = "image/jpeg,image/png,image/webp";

const EVENT_COVER_WIDTH = 870;
const EVENT_COVER_HEIGHT = 400;
const EVENT_THUMB_WIDTH = 350;
const EVENT_THUMB_HEIGHT = 280;
const EVENT_COVER_SIZE_HINT = `Satu gambar untuk web: minimal ${EVENT_COVER_WIDTH}×${EVENT_COVER_HEIGHT} px (rasio ±15%). Tampil sebagai thumbnail ${EVENT_THUMB_WIDTH}×${EVENT_THUMB_HEIGHT} dan detail ${EVENT_COVER_WIDTH}×${EVENT_COVER_HEIGHT}. Format JPEG, PNG, atau WebP.`;

const PRAYER_STAFF_COVER_WIDTH = 350;
const PRAYER_STAFF_COVER_HEIGHT = 484;
const PRAYER_STAFF_COVER_SIZE_HINT = `Gambar cover wajib tepat ${PRAYER_STAFF_COVER_WIDTH}×${PRAYER_STAFF_COVER_HEIGHT} px (JPEG, PNG, atau WebP).`;

/** Opsi dropdown petugas ibadah (urutan waktu shalat). */
const PRAYER_SLOT_IBADAH_OPTIONS = ["Subuh", "Dzuhur", "Ashar", "Maghrib", "Isya", "Jumat"] as const;
const PRAYER_JENIS_TUGAS_OPTIONS = ["Imam", "Khatib", "Muadzin", "Bilal", "Imam & Khatib"] as const;

const scheduleCoverAccept = "image/jpeg,image/png,image/webp";
const isOperationalScheduleMode = computed(() => isScheduleMode.value || isPrayerStaffMode.value);

const canCreateContent = computed(() =>
  isOperationalScheduleMode.value
    ? accessFlags.value.canCreatePrayerSchedule
    : isProgramSocialMode.value
      ? accessFlags.value.canCreateProgramSocial
      : accessFlags.value.canCreateGallery
);
const canUpdateContent = computed(() =>
  isOperationalScheduleMode.value
    ? accessFlags.value.canUpdatePrayerSchedule
    : isProgramSocialMode.value
      ? accessFlags.value.canUpdateProgramSocial
      : accessFlags.value.canUpdateGallery
);
const canDeleteContent = computed(() =>
  isOperationalScheduleMode.value
    ? accessFlags.value.canDeletePrayerSchedule
    : isProgramSocialMode.value
      ? accessFlags.value.canDeleteProgramSocial
      : accessFlags.value.canDeleteGallery
);
const canAnyMutate = computed(
  () => canCreateContent.value || canUpdateContent.value || canDeleteContent.value
);

const tableRef = ref<InstanceType<typeof KtRemoteDatatable> | null>(null);
const portletTitle = computed(() => props.listTitle);
const datatableSearchHint = computed(() => props.searchHintText);
const datatableSearchPlaceholder = computed(() => {
  if (isScheduleMode.value) return "Cari judul, lokasi, pemateri…";
  if (isPrayerStaffMode.value) return "Cari slot ibadah, petugas, jenis tugas…";
  if (isProgramSocialMode.value) return "Cari judul program, lokasi, slug…";
  return "Cari judul kegiatan, slug…";
});
const datatableMergeBody = computed(() => ({ contentType: props.fixedType }));
const datatableReadPath = computed(
  () => `/admin/content/datatable?contentType=${encodeURIComponent(props.fixedType)}`
);
const datatableTableId = computed(() => `content_datatable_${props.fixedType}`);

const contentColumns = computed((): unknown[] => {
  const statusCol = {
    field: "status",
    title: "Status",
    width: 100,
    template(row: ContentRow) {
      const map: Record<string, string> = {
        draft: "kt-badge--warning",
        published: "kt-badge--success",
        archived: "kt-badge--secondary",
      };
      const cls = map[row.status] ?? "kt-badge--metal";
      return `<span class="kt-badge ${cls} kt-badge--inline">${row.status}</span>`;
    },
  };
  const publishCol = {
    field: "publishedAt",
    title: "Publish",
    width: 150,
    template(row: ContentRow) {
      if (!row.publishedAt) return "<span class='kt-font-muted'>-</span>";
      try {
        return new Date(row.publishedAt).toLocaleString("id-ID");
      } catch {
        return row.publishedAt;
      }
    },
  };
  const actionsCol = {
    field: "Actions",
    title: "Aksi",
    sortable: false,
    width: 100,
    overflow: "visible",
    autoHide: false,
    template(row: ContentRow) {
      if (!canAnyMutate.value) return '<span class="kt-font-muted">—</span>';
      const id = row.RecordID;
      const editBtn = canUpdateContent.value
        ? `<a href="javascript:;" class="btn btn-sm btn-clean btn-icon cms-act-content-edit" data-content-id="${id}" title="Edit"><i class="la la-edit"></i></a>`
        : "";
      const delBtn = canDeleteContent.value
        ? `<a href="javascript:;" class="btn btn-sm btn-clean btn-icon cms-act-content-del" data-content-id="${id}" data-content-title="${escapeHtml(row.title)}" title="Hapus"><i class="la la-trash"></i></a>`
        : "";
      return `${editBtn}${delBtn}` || '<span class="kt-font-muted">—</span>';
    },
  };

  if (isScheduleMode.value) {
    return [
      { field: "title", title: "Nama kegiatan / kajian", width: 200 },
      { field: "attr1", title: "Lokasi", width: 140 },
      { field: "attr2", title: "Pemateri", width: 140 },
      { field: "attr3", title: "Waktu mulai", width: 160 },
      statusCol,
      publishCol,
      actionsCol,
    ];
  }
  if (isPrayerStaffMode.value) {
    return [
      { field: "title", title: "Tanggal", width: 110 },
      { field: "attr1", title: "Slot ibadah", width: 110 },
      { field: "attr2", title: "Jenis tugas", width: 120 },
      { field: "attr3", title: "Petugas utama", width: 150 },
      statusCol,
      publishCol,
      actionsCol,
    ];
  }
  if (isProgramSocialMode.value) {
    return [
      { field: "title", title: "Judul program", width: 220 },
      { field: "slug", title: "Slug", width: 120 },
      { field: "attr1", title: "Lokasi / wilayah", width: 130 },
      { field: "attr2", title: "Periode / tanggal", width: 130 },
      statusCol,
      publishCol,
      actionsCol,
    ];
  }
  if (isGalleryMode.value) {
    return [
      { field: "title", title: "Judul kegiatan", width: 220 },
      { field: "slug", title: "Slug", width: 120 },
      { field: "attr1", title: "Tanggal kegiatan", width: 130 },
      { field: "attr2", title: "Lokasi", width: 130 },
      statusCol,
      publishCol,
      actionsCol,
    ];
  }

  return [];
});

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
}

function jq(): Window["jQuery"] {
  return window.jQuery;
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
  if (!window.toastr) {
    window.alert(message);
    return;
  }
  window.toastr.clear();
  window.toastr.options = { closeButton: true, progressBar: true, timeOut: 2200 };
  window.toastr.success(message, "Sukses");
}

function toastError(message: string): void {
  if (!window.toastr) {
    window.alert(message);
    return;
  }
  window.toastr.clear();
  window.toastr.options = { closeButton: true, progressBar: true, timeOut: 3200 };
  window.toastr.error(message, "Gagal");
}

function plainTextFromHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function formatAdminValidationError(
  message: string,
  details?: { fieldErrors?: Record<string, string[]>; formErrors?: string[] }
): string {
  const excerpt = details?.fieldErrors?.excerpt?.[0];
  if (excerpt) return excerpt;
  const formErr = details?.formErrors?.[0];
  if (formErr) return formErr;
  for (const msgs of Object.values(details?.fieldErrors ?? {})) {
    const m = msgs?.[0];
    if (m) return m;
  }
  return message;
}

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

async function validateGalleryImageFile(file: File): Promise<string | null> {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    return "Gambar galeri hanya mendukung format JPEG, PNG, atau WebP.";
  }
  try {
    const { width, height } = await readImageFileDimensions(file);
    if (width === GALLERY_IMAGE_WIDTH && height === GALLERY_IMAGE_HEIGHT) return null;
    return `Gambar galeri wajib berukuran tepat ${GALLERY_IMAGE_WIDTH}×${GALLERY_IMAGE_HEIGHT} piksel. Ukuran terdeteksi: ${width}×${height}.`;
  } catch {
    return "Tidak dapat membaca ukuran gambar. Pastikan file gambar valid.";
  }
}

async function validatePrayerStaffCoverImageFile(file: File): Promise<string | null> {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    return "Gambar cover hanya mendukung format JPEG, PNG, atau WebP.";
  }
  try {
    const { width, height } = await readImageFileDimensions(file);
    if (width === PRAYER_STAFF_COVER_WIDTH && height === PRAYER_STAFF_COVER_HEIGHT) return null;
    return `Gambar cover wajib berukuran tepat ${PRAYER_STAFF_COVER_WIDTH}×${PRAYER_STAFF_COVER_HEIGHT} piksel. Ukuran terdeteksi: ${width}×${height}.`;
  } catch {
    return "Tidak dapat membaca ukuran gambar. Pastikan file gambar valid.";
  }
}

async function validateEventCoverImageFile(file: File): Promise<string | null> {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    return "Gambar kegiatan hanya mendukung format JPEG, PNG, atau WebP.";
  }
  try {
    const { width, height } = await readImageFileDimensions(file);
    if (width < EVENT_COVER_WIDTH || height < EVENT_COVER_HEIGHT) {
      return `Gambar kegiatan minimal ${EVENT_COVER_WIDTH}×${EVENT_COVER_HEIGHT} piksel. Ukuran terdeteksi: ${width}×${height}.`;
    }
    const ratio = width / height;
    const target = EVENT_COVER_WIDTH / EVENT_COVER_HEIGHT;
    if (Math.abs(ratio - target) > 0.15) {
      return `Rasio gambar disarankan ${EVENT_COVER_WIDTH}:${EVENT_COVER_HEIGHT} (±15%). Ukuran terdeteksi: ${width}×${height}.`;
    }
    return null;
  } catch {
    return "Tidak dapat membaca ukuran gambar. Pastikan file gambar valid.";
  }
}

function destroySummernoteOn(el: HTMLDivElement | null): void {
  const $ = jq();
  if (!$?.fn?.summernote || !el) return;
  try {
    $(el).summernote?.("destroy");
  } catch {
    // ignore
  }
}

function destroyAllSummernotes(): void {
  destroySummernoteOn(excerptEditorRef.value);
  destroySummernoteOn(bodyEditorRef.value);
}

const SUMMERNOTE_TOOLBAR: unknown[] = [
  ["style", ["bold", "italic", "underline", "clear"]],
  ["para", ["ul", "ol", "paragraph"]],
  ["insert", ["link", "picture", "hr"]],
  ["view", ["codeview"]],
];

async function uploadSummernoteImage(file: File, $el: JQueryLite): Promise<void> {
  try {
    const json = await uploadAdminImage(file);
    if (!json.ok || !json.data?.url) {
      toastError(json.error?.message || "Upload gambar gagal");
      return;
    }
    const src = resolveCmsAssetUrl(json.data.url);
    $el.summernote?.("insertImage", src);
  } catch {
    toastError("Tidak dapat menghubungi server");
  }
}

function initSummernoteOn(
  el: HTMLDivElement | null,
  opts: { initialHtml: string; placeholder: string; height: number; onChange: (html: string) => void }
): void {
  const $ = jq();
  if (!el || !$?.fn?.summernote) return;
  const $el = $(el);
  try {
    $el.summernote?.("destroy");
  } catch {
    // ignore
  }
  /** Editor kedua di modal sering “kehilangan” toolbar kalau init bersamaan / scroll modal — pakai opsi modal-safe + toolbar eksplisit. */
  $el.summernote?.({
    airMode: false,
    disableResizeEditor: false,
    dialogsInBody: true,
    placeholder: opts.placeholder,
    height: opts.height,
    toolbar: SUMMERNOTE_TOOLBAR,
    callbacks: {
      onChange: (contents: string) => opts.onChange(contents),
      onImageUpload: (files: File[]) => {
        const list = Array.from(files ?? []);
        void (async () => {
          for (const file of list) {
            await uploadSummernoteImage(file, $el);
          }
        })();
      },
    },
  });
  $el.summernote?.("code", opts.initialHtml || "");
}

/** Tarik HTML terakhir dari Summernote ke `form` (validasi / simpan). */
function syncEditorsFromDom(): void {
  const $ = jq();
  if (!$?.fn?.summernote) return;
  const ex = excerptEditorRef.value;
  const bd = bodyEditorRef.value;
  if (ex) {
    const code = $(ex).summernote?.("code") as unknown;
    if (typeof code === "string") form.value.excerpt = code;
  }
  if (bd) {
    const code = $(bd).summernote?.("code") as unknown;
    if (typeof code === "string") {
      form.value.body = code;
      bodyFallbackText.value = code;
    }
  }
}

/** Setelah modal + field ter-render: datepicker + Summernote ringkasan & body. */
async function initContentEditors(): Promise<void> {
  initDatepicker();
  await nextTick();
  destroyAllSummernotes();
  await nextTick();

  initSummernoteOn(excerptEditorRef.value, {
    initialHtml: form.value.excerpt,
    placeholder: isScheduleMode.value ? "Ringkasan untuk kartu jadwal / daftar…" : "Ringkasan (excerpt)…",
    height: isScheduleMode.value ? 200 : 200,
    onChange: (html) => {
      form.value.excerpt = html;
    },
  });

  await nextTick();
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      initSummernoteOn(bodyEditorRef.value, {
        initialHtml: form.value.body,
        placeholder: isScheduleMode.value ? "Catatan atau materi tambahan…" : "Tulis isi konten…",
        height: isScheduleMode.value ? 260 : 300,
        onChange: (html) => {
          form.value.body = html;
          bodyFallbackText.value = html;
        },
      });
      resolve();
    });
  });
}

function openModal(): void {
  const $ = jq();
  const el = document.getElementById("cms_modal_content_form");
  if (!$?.fn?.modal || !el) return;
  ($(el) as { modal: (a?: string) => void }).modal("show");
  setTimeout(() => {
    void initContentEditors();
  }, 0);
}

function closeModal(): void {
  const $ = jq();
  const el = document.getElementById("cms_modal_content_form");
  if (!$?.fn?.modal || !el) return;
  ($(el) as { modal: (a?: string) => void }).modal("hide");
}

function initDatepicker(): void {
  const $ = jq();
  const el = publishedAtInputRef.value;
  if (!el || !$?.fn?.datepicker) return;
  const $el = $(el);
  try {
    $el.datepicker?.("destroy");
  } catch {
    // ignore
  }
  $el.datepicker?.({
    format: "yyyy-mm-dd",
    autoclose: true,
    todayHighlight: true,
    orientation: "bottom left",
  });
  ( $el as unknown as { on?: (ev: string, cb: () => void) => void } ).on?.("changeDate", () => {
    const v = el.value.trim();
    form.value.publishedAt = v ? `${v}T00:00:00.000Z` : "";
  });
  if (form.value.publishedAt) {
    const d = form.value.publishedAt.slice(0, 10);
    el.value = d;
    $el.datepicker?.("update", d);
  } else {
    el.value = "";
  }
}

function reloadTable(): void {
  tableRef.value?.reload();
}

const loading = ref(false);
const saving = ref(false);
const uploadingImage = ref(false);
const uploadingFile = ref(false);
const err = ref("");
const bodyFallbackText = ref("");
const editId = ref<string | null>(null);
const publishedAtInputRef = ref<HTMLInputElement | null>(null);
const excerptEditorRef = ref<HTMLDivElement | null>(null);
const bodyEditorRef = ref<HTMLDivElement | null>(null);
const defaultContentType = (): ContentType => props.fixedType;

const form = ref({
  type: defaultContentType(),
  title: "",
  slug: "",
  excerpt: "",
  body: "",
  coverImageUrl: "",
  status: "draft" as "draft" | "published" | "archived",
  publishedAt: "",
  sortOrder: 0,
  isFeatured: false,
  attr1: "",
  attr2: "",
  attr3: "",
  attr4: "",
  attr5: "",
});

const modalTitle = computed(() => {
  if (isScheduleMode.value) return editId.value ? "Ubah jadwal" : "Jadwal baru";
  if (isPrayerStaffMode.value) return editId.value ? "Ubah jadwal petugas" : "Jadwal petugas baru";
  if (isProgramSocialMode.value) return editId.value ? "Ubah program sosial" : "Program sosial baru";
  if (isGalleryMode.value) return editId.value ? "Ubah foto galeri" : "Foto galeri baru";
  return editId.value ? "Ubah program sosial" : "Program sosial baru";
});
const hasCoverImage = computed(() => Boolean(form.value.coverImageUrl?.trim()));
const coverPreviewUrl = computed(() =>
  hasCoverImage.value
    ? resolveCmsAssetUrl(form.value.coverImageUrl)
    : "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='320'%3E%3Crect width='100%25' height='100%25' fill='%23f1f3f7'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23979fb8' font-family='Arial' font-size='14'%3EBelum ada gambar%3C/text%3E%3C/svg%3E"
);
/** Harus selaras dengan `minEx` di backend `admin-content.controller.ts` (jadwal/galeri = 20). */
const SCHEDULE_MIN_EXCERPT_LEN = 20;
const minExcerptLen = computed(() =>
  form.value.type === "event" || form.value.type === "prayer_staff" || form.value.type === "gallery"
    ? SCHEDULE_MIN_EXCERPT_LEN
    : 300
);
const minBodyLen = computed(() =>
  form.value.type === "event" || form.value.type === "prayer_staff" || form.value.type === "gallery" ? 0 : 300
);
const excerptLen = computed(() => plainTextFromHtml(form.value.excerpt).length);
const excerptRemaining = computed(() => Math.max(0, minExcerptLen.value - excerptLen.value));
const excerptCounterClass = computed(() =>
  excerptLen.value >= minExcerptLen.value ? "kt-font-success" : "kt-font-danger"
);
const bodyPlainTextLen = computed(() =>
  form.value.body
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim().length
);
const bodyRemaining = computed(() => Math.max(0, minBodyLen.value - bodyPlainTextLen.value));
const bodyCounterClass = computed(() => {
  if (minBodyLen.value <= 0) return "kt-font-success";
  return bodyPlainTextLen.value >= minBodyLen.value ? "kt-font-success" : "kt-font-danger";
});

function resetForm(): void {
  form.value = {
    type: defaultContentType(),
    title: "",
    slug: "",
    excerpt: "",
    body: "",
    coverImageUrl: "",
    status: "draft",
    publishedAt: "",
    sortOrder: 0,
    isFeatured: false,
    attr1: "",
    attr2: "",
    attr3: "",
    attr4: "",
    attr5: "",
  };
  bodyFallbackText.value = "";
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function openCreate(): void {
  if (!canCreateContent.value) return;
  editId.value = null;
  err.value = "";
  resetForm();
  openModal();
}

async function openEdit(id: string): Promise<void> {
  if (!canUpdateContent.value) return;
  editId.value = id;
  err.value = "";
  loading.value = true;
  openModal();
  try {
    const json = await getAdminContent(id);
    if (!json.ok || !json.data) {
      err.value = json.error?.message || "Gagal memuat konten";
      return;
    }
    form.value = {
      type: props.fixedType,
      title: json.data.title,
      slug: json.data.slug,
      excerpt: json.data.excerpt ?? "",
      body: json.data.body ?? "",
      coverImageUrl: json.data.coverImageUrl ?? "",
      status: json.data.status,
      publishedAt: json.data.publishedAt ?? "",
      sortOrder: json.data.sortOrder ?? 0,
      isFeatured: json.data.isFeatured ?? false,
      attr1: json.data.attr1 ?? "",
      attr2: json.data.attr2 ?? "",
      attr3: json.data.attr3 ?? "",
      attr4: json.data.attr4 ?? "",
      attr5: json.data.attr5 ?? "",
    };
    bodyFallbackText.value = form.value.body;
    setTimeout(() => {
      void initContentEditors();
    }, 0);
  } catch {
    err.value = "Tidak dapat menghubungi server";
  } finally {
    loading.value = false;
  }
}

async function onSave(): Promise<void> {
  err.value = "";
  saving.value = true;
  syncEditorsFromDom();
  if (!form.value.title.trim()) {
    err.value = "Judul wajib diisi.";
    toastError(err.value);
    saving.value = false;
    return;
  }
  if (excerptLen.value < minExcerptLen.value) {
    err.value =
      form.value.type === "event" || form.value.type === "prayer_staff"
        ? "Ringkasan wajib minimal 20 karakter."
        : "Excerpt wajib minimal 300 karakter.";
    toastError(err.value);
    saving.value = false;
    return;
  }
  if (minBodyLen.value > 0 && bodyPlainTextLen.value < minBodyLen.value) {
    err.value = "Body wajib minimal 300 karakter (plain text).";
    toastError(err.value);
    saving.value = false;
    return;
  }
  if (isGalleryMode.value && !form.value.coverImageUrl.trim()) {
    err.value = "Foto galeri wajib diupload.";
    toastError(err.value);
    saving.value = false;
    return;
  }
  toastLoading(isOperationalScheduleMode.value ? "Menyimpan jadwal…" : "Menyimpan konten…");
  const payload = {
    type: props.fixedType,
    title: form.value.title.trim(),
    slug: form.value.slug.trim() || slugify(form.value.title),
    excerpt: form.value.excerpt.trim(),
    body: form.value.body.trim(),
    coverImageUrl: form.value.coverImageUrl.trim(),
    status: form.value.status,
    publishedAt: form.value.publishedAt.trim(),
    sortOrder: Number(form.value.sortOrder) || 0,
    isFeatured: Boolean(form.value.isFeatured),
    attr1: form.value.attr1.trim(),
    attr2: form.value.attr2.trim(),
    attr3: form.value.attr3.trim(),
    attr4: form.value.attr4.trim(),
    attr5: form.value.attr5.trim(),
  };
  try {
    if (!editId.value) {
      const json = await createAdminContent(payload);
      if (!json.ok) {
        err.value = formatAdminValidationError(
          json.error?.message || "Gagal menambah konten",
          (json.error as { details?: { fieldErrors?: Record<string, string[]>; formErrors?: string[] } })
            ?.details
        );
        toastError(err.value);
        return;
      }
    } else {
      const json = await patchAdminContent(editId.value, payload);
      if (!json.ok) {
        err.value = formatAdminValidationError(
          json.error?.message || "Gagal menyimpan konten",
          (json.error as { details?: { fieldErrors?: Record<string, string[]>; formErrors?: string[] } })
            ?.details
        );
        toastError(err.value);
        return;
      }
    }
    closeModal();
    reloadTable();
    toastSuccess(
      isOperationalScheduleMode.value
        ? "Jadwal berhasil disimpan."
        : isProgramSocialMode.value
          ? "Program berhasil disimpan."
          : isGalleryMode.value
            ? "Foto galeri berhasil disimpan."
            : "Data berhasil disimpan."
    );
  } catch {
    err.value = "Tidak dapat menghubungi server";
    toastError(err.value);
  } finally {
    saving.value = false;
  }
}

async function onPickCover(ev: Event): Promise<void> {
  const t = ev.target;
  if (!(t instanceof HTMLInputElement) || !t.files || !t.files[0]) return;
  const file = t.files[0];
  t.value = "";
  err.value = "";
  if (isGalleryMode.value) {
    const dimErr = await validateGalleryImageFile(file);
    if (dimErr) {
      err.value = dimErr;
      toastError(dimErr);
      return;
    }
  } else if (isScheduleMode.value) {
    const dimErr = await validateEventCoverImageFile(file);
    if (dimErr) {
      err.value = dimErr;
      toastError(dimErr);
      return;
    }
  } else if (isPrayerStaffMode.value) {
    const dimErr = await validatePrayerStaffCoverImageFile(file);
    if (dimErr) {
      err.value = dimErr;
      toastError(dimErr);
      return;
    }
  }
  uploadingImage.value = true;
  toastLoading("Mengupload gambar…");
  try {
    const uploadContext = isGalleryMode.value
      ? "gallery"
      : isScheduleMode.value
        ? "event_cover"
        : isPrayerStaffMode.value
          ? "prayer_staff_cover"
          : undefined;
    const json = await uploadAdminImage(file, uploadContext ? { context: uploadContext } : undefined);
    if (!json.ok || !json.data?.url) {
      err.value = json.error?.message || "Upload gambar gagal";
      toastError(err.value);
      return;
    }
    form.value.coverImageUrl = json.data.url;
    toastSuccess(isGalleryMode.value ? "Foto galeri berhasil diupload." : "Gambar cover berhasil diupload.");
  } catch {
    err.value = "Tidak dapat menghubungi server";
    toastError(err.value);
  } finally {
    uploadingImage.value = false;
  }
}

async function onPickScheduleFile(ev: Event): Promise<void> {
  const t = ev.target;
  if (!(t instanceof HTMLInputElement) || !t.files || !t.files[0]) return;
  const file = t.files[0];
  t.value = "";
  err.value = "";
  uploadingFile.value = true;
  try {
    const json = await uploadAdminFile(file);
    if (!json.ok || !json.data?.url) {
      err.value = json.error?.message || "Upload dokumen gagal";
      toastError(err.value);
      return;
    }
    form.value.attr5 = json.data.url;
    toastSuccess(
      isPrayerStaffMode.value ? "Lampiran dokumen berhasil diupload." : "Dokumen jadwal berhasil diupload."
    );
  } catch {
    err.value = "Tidak dapat menghubungi server";
    toastError(err.value);
  } finally {
    uploadingFile.value = false;
  }
}

async function onDelete(id: string, title: string): Promise<void> {
  if (!canDeleteContent.value) return;
  const ok = await confirmDeleteDialog({
    title: "Hapus data?",
    html: `Konten <strong>${escapeHtml(title)}</strong> akan dihapus permanen dan tidak dapat dikembalikan.`,
  });
  if (!ok) return;
  toastLoading("Menghapus…");
  try {
    const json = await deleteAdminContent(id);
    if (!json.ok) {
      toastError(json.error?.message || "Gagal menghapus");
      return;
    }
    reloadTable();
    toastSuccess(
      isOperationalScheduleMode.value
        ? "Jadwal berhasil dihapus."
        : isGalleryMode.value
          ? "Foto galeri berhasil dihapus."
          : "Data berhasil dihapus."
    );
  } catch {
    await alertErrorDialog({ text: "Tidak dapat menghubungi server" });
  }
}

function onDocClick(ev: MouseEvent): void {
  const t = ev.target;
  if (!(t instanceof Element)) return;
  const editBtn = t.closest(".cms-act-content-edit");
  const delBtn = t.closest(".cms-act-content-del");
  const btn = editBtn ?? delBtn;
  const root = tableRef.value?.getTableEl();
  if (!btn || !root?.contains(btn)) return;
  ev.preventDefault();
  const id = btn.getAttribute("data-content-id");
  if (!id) return;
  if (editBtn) void openEdit(id);
  else void onDelete(id, btn.getAttribute("data-content-title") || id);
}

onMounted(() => {
  document.addEventListener("click", onDocClick);
  void access.load();
});
onBeforeUnmount(() => {
  destroyAllSummernotes();
  document.removeEventListener("click", onDocClick);
});
</script>

<template>
  <div class="row">
    <div class="col-12">
      <div class="kt-portlet kt-portlet--mobile">
        <div class="kt-portlet__head kt-portlet__head--lg">
          <div class="kt-portlet__head-label">
            <span class="kt-portlet__head-icon"
              ><i
                class="kt-font-brand"
                :class="
                  isOperationalScheduleMode
                    ? 'flaticon2-calendar'
                    : isProgramSocialMode
                      ? 'flaticon2-heart'
                      : 'flaticon2-image-file'
                "
              ></i
            ></span>
            <h3 class="kt-portlet__head-title">{{ portletTitle }}</h3>
          </div>
          <div v-if="canCreateContent" class="kt-portlet__head-toolbar">
            <button type="button" class="btn btn-sm btn-brand" @click="openCreate">
              <i class="la la-plus"></i>
              {{
                isOperationalScheduleMode
                  ? "Tambah jadwal"
                  : isProgramSocialMode
                    ? "Tambah program"
                    : "Tambah foto"
              }}
            </button>
          </div>
        </div>
        <div class="kt-portlet__body kt-portlet__body--fit">
          <KtRemoteDatatable
            :key="props.fixedType"
            ref="tableRef"
            :table-id="datatableTableId"
            :read-path="datatableReadPath"
            :search-placeholder="datatableSearchPlaceholder"
            :search-hint="datatableSearchHint"
            :merge-request-body="datatableMergeBody"
            :columns="contentColumns"
          />
        </div>
      </div>

      <Teleport v-if="canAnyMutate" to="body">
        <div id="cms_modal_content_form" class="modal fade" tabindex="-1" role="dialog" aria-hidden="true">
          <div class="modal-dialog modal-xl modal-dialog-scrollable" role="document">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">{{ modalTitle }}</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Tutup">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div class="modal-body">
                <p v-if="loading" class="kt-font-muted">Memuat…</p>
                <template v-else>
                  <div v-if="err" class="alert alert-outline-danger fade show kt-margin-b-15" role="alert">
                    <div class="alert-text">{{ err }}</div>
                  </div>
                  <!-- Form jadwal: lokasi/waktu + ringkasan/catatan pakai Summernote. -->
                  <div v-if="isOperationalScheduleMode" class="row cms-content-form-grid cms-schedule-form">
                    <div class="col-12">
                      <h6 class="kt-font-bold kt-font-transform-u text-muted">Identitas</h6>
                    </div>
                    <div class="col-12">
                      <div class="form-group"><label>{{ isPrayerStaffMode ? "Nama ibadah / jadwal" : "Nama kegiatan / kajian" }}</label><input v-model="form.title" type="text" class="form-control" /></div>
                    </div>
                    <div class="col-md-6">
                      <div class="form-group"><label>Slug URL</label><input v-model="form.slug" type="text" class="form-control" placeholder="auto dari judul jika kosong" /></div>
                    </div>
                    <div class="col-md-3">
                      <div class="form-group"><label>Status</label><select v-model="form.status" class="form-control"><option value="draft">draft</option><option value="published">published</option><option value="archived">archived</option></select></div>
                    </div>
                    <div class="col-md-3">
                      <div class="form-group"><label>Urutan</label><input v-model.number="form.sortOrder" type="number" class="form-control" /></div>
                    </div>
                    <div class="col-md-6">
                      <div class="form-group">
                        <label>Tanggal tayang (published)</label>
                        <input ref="publishedAtInputRef" type="text" class="form-control" placeholder="yyyy-mm-dd" autocomplete="off" />
                        <span class="form-text text-muted">Opsional; untuk tampil di web.</span>
                      </div>
                    </div>
                    <div class="col-12">
                      <h6 class="kt-font-bold kt-font-transform-u text-muted">Gambar / poster</h6>
                      <div class="form-group cms-cover-field mb-0">
                        <label class="mb-2">{{ isScheduleMode ? "Poster kegiatan (opsional)" : "Cover (opsional)" }}</label>
                        <div class="cms-media-upload">
                          <div class="cms-media-upload__panel">
                            <div class="custom-file">
                              <input
                                id="content_schedule_cover_upload"
                                type="file"
                                class="custom-file-input"
                                :accept="isOperationalScheduleMode ? scheduleCoverAccept : 'image/*'"
                                :disabled="uploadingImage"
                                @change="onPickCover"
                              />
                              <label class="custom-file-label" for="content_schedule_cover_upload">
                                {{ uploadingImage ? "Mengupload gambar…" : "Pilih file gambar" }}
                              </label>
                            </div>
                            <input
                              v-model="form.coverImageUrl"
                              type="text"
                              class="form-control form-control-sm cms-media-upload__url"
                              readonly
                              placeholder="URL muncul setelah upload"
                            />
                            <p v-if="isScheduleMode" class="form-text text-muted mb-0">{{ EVENT_COVER_SIZE_HINT }}</p>
                            <p v-else-if="isPrayerStaffMode" class="form-text text-muted mb-0">{{ PRAYER_STAFF_COVER_SIZE_HINT }}</p>
                          </div>
                          <div class="cms-media-upload__preview-wrap">
                            <template v-if="isScheduleMode">
                              <div class="cms-media-upload__preview-card">
                                <span class="cms-media-upload__preview-title">Thumbnail</span>
                                <div
                                  class="cms-media-upload__preview-frame cms-media-upload__preview-frame--event-thumb"
                                  :class="{ 'cms-media-upload__preview-frame--empty': !hasCoverImage }"
                                >
                                  <img :src="coverPreviewUrl" alt="Pratinjau thumbnail" />
                                </div>
                                <span class="cms-media-upload__preview-caption">{{ EVENT_THUMB_WIDTH }}×{{ EVENT_THUMB_HEIGHT }} px</span>
                              </div>
                              <div class="cms-media-upload__preview-card cms-media-upload__preview-card--wide">
                                <span class="cms-media-upload__preview-title">Detail halaman</span>
                                <div
                                  class="cms-media-upload__preview-frame cms-media-upload__preview-frame--event-detail"
                                  :class="{ 'cms-media-upload__preview-frame--empty': !hasCoverImage }"
                                >
                                  <img :src="coverPreviewUrl" alt="Pratinjau detail" />
                                </div>
                                <span class="cms-media-upload__preview-caption">{{ EVENT_COVER_WIDTH }}×{{ EVENT_COVER_HEIGHT }} px</span>
                              </div>
                            </template>
                            <div
                              v-else-if="isPrayerStaffMode"
                              class="cms-media-upload__preview-card cms-media-upload__preview-card--portrait"
                            >
                              <span class="cms-media-upload__preview-title">Pratinjau cover</span>
                              <div
                                class="cms-media-upload__preview-frame cms-media-upload__preview-frame--prayer-staff"
                                :class="{ 'cms-media-upload__preview-frame--empty': !hasCoverImage }"
                              >
                                <img :src="coverPreviewUrl" alt="Pratinjau cover petugas ibadah" />
                              </div>
                              <span class="cms-media-upload__preview-caption">{{ PRAYER_STAFF_COVER_WIDTH }}×{{ PRAYER_STAFF_COVER_HEIGHT }} px</span>
                            </div>
                            <div v-else class="cms-media-upload__preview-card">
                              <span class="cms-media-upload__preview-title">Pratinjau</span>
                              <div
                                class="cms-media-upload__preview-frame cms-media-upload__preview-frame--generic"
                                :class="{ 'cms-media-upload__preview-frame--empty': !hasCoverImage }"
                              >
                                <img :src="coverPreviewUrl" alt="Pratinjau cover" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="col-12 kt-margin-t-15">
                      <h6 class="kt-font-bold kt-font-transform-u text-muted">Detail jadwal</h6>
                    </div>
                    <div class="col-md-6">
                      <div class="form-group">
                        <label>{{ isPrayerStaffMode ? "Slot ibadah" : "Lokasi" }}</label>
                        <select
                          v-if="isPrayerStaffMode"
                          v-model="form.attr1"
                          class="form-control"
                        >
                          <option value="">— Pilih slot —</option>
                          <option v-for="opt in prayerSlotSelectOptions" :key="opt" :value="opt">{{ opt }}</option>
                        </select>
                        <input
                          v-else
                          v-model="form.attr1"
                          type="text"
                          class="form-control"
                          placeholder="Masjid / aula / online"
                        />
                      </div>
                    </div>
                    <div class="col-md-6">
                      <div class="form-group">
                        <label>{{ isPrayerStaffMode ? "Jenis tugas" : "Pemateri" }}</label>
                        <select
                          v-if="isPrayerStaffMode"
                          v-model="form.attr2"
                          class="form-control"
                        >
                          <option value="">— Pilih jenis tugas —</option>
                          <option v-for="opt in prayerTaskSelectOptions" :key="opt" :value="opt">{{ opt }}</option>
                        </select>
                        <input v-else v-model="form.attr2" type="text" class="form-control" />
                      </div>
                    </div>
                    <div class="col-md-6">
                      <div class="form-group"><label>{{ isPrayerStaffMode ? "Petugas utama" : "Waktu mulai" }}</label><input v-model="form.attr3" type="text" class="form-control" :placeholder="isPrayerStaffMode ? 'nama ustadz / qari' : 'contoh: Jumat 19:30 / 2025-05-15 19:30'" /></div>
                    </div>
                    <div class="col-md-6">
                      <div class="form-group"><label>{{ isPrayerStaffMode ? "Pengganti / backup" : "Selesai / berulang" }}</label><input v-model="form.attr4" type="text" class="form-control" :placeholder="isPrayerStaffMode ? 'opsional' : 'contoh: 21:00 / setiap pekan'" /></div>
                    </div>
                    <div class="col-12">
                      <div class="form-group">
                        <label>{{ isPrayerStaffMode ? "Kontak / catatan singkat" : "Link / kontak PIC" }}</label>
                        <input v-model="form.attr5" type="text" class="form-control" :placeholder="isPrayerStaffMode ? 'nomor WA / info tambahan' : 'URL lampiran dokumen / link info'" />
                        <template v-if="isOperationalScheduleMode">
                          <h6 class="kt-font-bold kt-font-transform-u text-muted kt-margin-t-15">Lampiran dokumen</h6>
                          <div class="custom-file kt-margin-t-10">
                            <input
                              id="content_schedule_file_upload"
                              type="file"
                              class="custom-file-input"
                              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain"
                              :disabled="uploadingFile"
                              @change="onPickScheduleFile"
                            />
                            <label class="custom-file-label" for="content_schedule_file_upload">
                              {{
                                uploadingFile
                                  ? "Mengupload dokumen..."
                                  : isPrayerStaffMode
                                    ? "Upload dokumen (PDF/DOC/XLS/PPT/TXT)"
                                    : "Upload dokumen jadwal (PDF/DOC/XLS/PPT/TXT)"
                              }}
                            </label>
                          </div>
                          <span class="form-text text-muted">
                            URL file tersimpan di field di atas (sama seperti link manual).
                          </span>
                        </template>
                      </div>
                    </div>
                    <div class="col-12 kt-margin-t-15">
                      <h6 class="kt-font-bold kt-font-transform-u text-muted">Teks untuk publikasi</h6>
                      <p class="form-text text-muted mb-0">
                        Ringkasan & catatan memakai editor Summernote. Data tetap <code>type={{ form.type }}</code> di <code>content_items</code>.
                      </p>
                    </div>
                    <div class="col-12">
                      <div class="form-group">
                        <label>Ringkasan singkat</label>
                        <span class="form-text text-muted d-block mb-2">
                          Wajib minimal {{ SCHEDULE_MIN_EXCERPT_LEN }} karakter teks (tanpa tag HTML); tampil di daftar jadwal di web.
                        </span>
                        <div ref="excerptEditorRef" class="cms-summernote-host"></div>
                        <div class="form-text text-right" :class="excerptCounterClass">
                          {{ excerptLen }}/{{ minExcerptLen }} karakter (plain text)
                          <span v-if="excerptRemaining > 0">(kurang {{ excerptRemaining }})</span>
                          <span v-else>(ok)</span>
                        </div>
                      </div>
                    </div>
                    <div class="col-12">
                      <div class="form-group mb-0">
                        <label>Catatan / materi tambahan (opsional)</label>
                        <div ref="bodyEditorRef" class="cms-summernote-host"></div>
                        <div class="form-text text-muted kt-margin-t-5">
                          Opsional — ringkasan materi atau catatan tambahan.
                        </div>
                      </div>
                    </div>
                    <div class="col-12 kt-margin-t-10">
                      <label class="kt-checkbox">
                        <input v-model="form.isFeatured" type="checkbox" />
                        Tandai sebagai jadwal utama / unggulan
                        <span></span>
                      </label>
                    </div>
                  </div>

                  <div v-else class="row cms-content-form-grid">
                    <div class="col-md-12">
                      <div class="form-group"><label>Judul</label><input v-model="form.title" type="text" class="form-control" /></div>
                    </div>
                    <div class="col-md-6"><div class="form-group"><label>Slug</label><input v-model="form.slug" type="text" class="form-control" placeholder="auto dari judul jika kosong" /></div></div>
                    <div class="col-md-3"><div class="form-group"><label>Status</label><select v-model="form.status" class="form-control"><option value="draft">draft</option><option value="published">published</option><option value="archived">archived</option></select></div></div>
                    <div class="col-md-3"><div class="form-group"><label>Sort Order</label><input v-model.number="form.sortOrder" type="number" class="form-control" /></div></div>
                    <div class="col-md-6">
                      <div class="form-group">
                        <label>Published At</label>
                        <input
                          ref="publishedAtInputRef"
                          type="text"
                          class="form-control"
                          placeholder="yyyy-mm-dd"
                          autocomplete="off"
                        />
                        <span class="form-text text-muted">Pilih tanggal lewat datepicker.</span>
                      </div>
                    </div>
                    <div class="col-md-6">
                      <div class="form-group cms-cover-field">
                        <label class="mb-2">{{ isGalleryMode ? "Foto galeri" : "Cover Image" }}</label>
                        <div class="cms-media-upload cms-media-upload--stacked">
                          <div class="cms-media-upload__panel">
                            <div class="custom-file">
                              <input
                                id="content_cover_upload"
                                type="file"
                                class="custom-file-input"
                                :accept="isGalleryMode ? galleryCoverAccept : 'image/*'"
                                :disabled="uploadingImage"
                                @change="onPickCover"
                              />
                              <label class="custom-file-label" for="content_cover_upload">
                                {{ uploadingImage ? "Mengupload…" : isGalleryMode ? "Pilih foto galeri" : "Pilih file cover" }}
                              </label>
                            </div>
                            <input
                              v-model="form.coverImageUrl"
                              type="text"
                              class="form-control form-control-sm cms-media-upload__url"
                              readonly
                              placeholder="URL muncul setelah upload"
                            />
                            <p v-if="isGalleryMode" class="form-text text-muted mb-0">{{ GALLERY_IMAGE_SIZE_HINT }}</p>
                          </div>
                          <div class="cms-media-upload__preview-wrap">
                            <div
                              class="cms-media-upload__preview-card"
                              :class="{ 'cms-media-upload__preview-card--gallery': isGalleryMode }"
                            >
                              <span class="cms-media-upload__preview-title">{{ isGalleryMode ? "Pratinjau galeri" : "Pratinjau cover" }}</span>
                              <div
                                class="cms-media-upload__preview-frame"
                                :class="[
                                  isGalleryMode ? 'cms-media-upload__preview-frame--gallery' : 'cms-media-upload__preview-frame--generic',
                                  { 'cms-media-upload__preview-frame--empty': !hasCoverImage },
                                ]"
                              >
                                <img :src="coverPreviewUrl" alt="Pratinjau gambar" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="col-12">
                      <div class="form-group">
                        <label>Excerpt</label>
                        <div ref="excerptEditorRef" class="cms-summernote-host"></div>
                        <div class="form-text text-right" :class="excerptCounterClass">
                          {{ excerptLen }}/{{ minExcerptLen }} karakter (plain text)
                          <span v-if="excerptRemaining > 0">(kurang {{ excerptRemaining }})</span>
                          <span v-else>(ok)</span>
                        </div>
                      </div>
                    </div>
                    <div class="col-12">
                      <div class="form-group mb-0">
                        <label>Body</label>
                        <div ref="bodyEditorRef" class="cms-summernote-host"></div>
                        <div class="form-text text-right kt-margin-t-5" :class="bodyCounterClass">
                          <template v-if="minBodyLen > 0">
                            {{ bodyPlainTextLen }}/{{ minBodyLen }} karakter (plain text)
                            <span v-if="bodyRemaining > 0">(kurang {{ bodyRemaining }})</span>
                            <span v-else>(ok)</span>
                          </template>
                          <template v-else>Body opsional untuk tipe event.</template>
                        </div>
                      </div>
                    </div>
                    <template v-if="isProgramSocialMode">
                      <div class="col-12">
                        <h6 class="kt-font-bold kt-font-transform-u text-muted">Detail program (opsional)</h6>
                      </div>
                      <div class="col-md-6">
                        <div class="form-group">
                          <label>Lokasi / wilayah kegiatan</label>
                          <input v-model="form.attr1" type="text" class="form-control" placeholder="contoh: RW 3, kecamatan …" />
                        </div>
                      </div>
                      <div class="col-md-6">
                        <div class="form-group">
                          <label>Periode / tanggal pelaksanaan</label>
                          <input v-model="form.attr2" type="text" class="form-control" placeholder="contoh: 10–12 Mei 2026" />
                        </div>
                      </div>
                      <div class="col-md-6">
                        <div class="form-group">
                          <label>Kontak PIC</label>
                          <input v-model="form.attr3" type="text" class="form-control" placeholder="nama / nomor WA" />
                        </div>
                      </div>
                      <div class="col-md-6">
                        <div class="form-group">
                          <label>Sasaran / kuota peserta</label>
                          <input v-model="form.attr4" type="text" class="form-control" placeholder="opsional" />
                        </div>
                      </div>
                      <div class="col-12">
                        <div class="form-group">
                          <label>Link pendaftaran / lampiran</label>
                          <input v-model="form.attr5" type="text" class="form-control" placeholder="URL formulir atau dokumen" />
                        </div>
                      </div>
                    </template>
                    <template v-else-if="isGalleryMode">
                      <div class="col-12">
                        <h6 class="kt-font-bold kt-font-transform-u text-muted">Detail kegiatan (opsional)</h6>
                      </div>
                      <div class="col-md-6">
                        <div class="form-group">
                          <label>Tanggal kegiatan</label>
                          <input v-model="form.attr1" type="text" class="form-control" placeholder="contoh: 12 Mei 2026" />
                        </div>
                      </div>
                      <div class="col-md-6">
                        <div class="form-group">
                          <label>Lokasi</label>
                          <input v-model="form.attr2" type="text" class="form-control" placeholder="contoh: Aula masjid" />
                        </div>
                      </div>
                    </template>

                    <div class="col-12 kt-margin-t-10">
                      <label class="kt-checkbox">
                        <input v-model="form.isFeatured" type="checkbox" />
                        Tampilkan sebagai konten unggulan
                        <span></span>
                      </label>
                    </div>
                  </div>
                </template>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Tutup</button>
                <button type="button" class="btn btn-brand" :disabled="loading || saving" @click="onSave">
                  {{ saving ? "Menyimpan…" : isOperationalScheduleMode ? "Simpan jadwal" : "Simpan" }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Teleport>
    </div>
  </div>
</template>

<style scoped>
.cms-cover-field .custom-file-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cms-media-upload {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
  align-items: flex-start;
  padding: 1rem;
  background: #f9fafb;
  border: 1px solid #ebedf2;
  border-radius: 6px;
}

.cms-media-upload--stacked {
  flex-direction: column;
}

.cms-media-upload__panel {
  flex: 1 1 200px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.cms-media-upload__url {
  font-size: 0.8rem;
  color: #6c7293;
  background: #fff;
}

.cms-media-upload__preview-wrap {
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: flex-start;
  justify-content: center;
}

.cms-media-upload__preview-card {
  background: #fff;
  border: 1px solid #e2e5ec;
  border-radius: 6px;
  padding: 0.65rem 0.75rem 0.75rem;
  box-shadow: 0 1px 4px rgba(70, 78, 95, 0.08);
  text-align: center;
}

.cms-media-upload__preview-card--wide {
  flex: 1 1 280px;
  max-width: 100%;
}

.cms-media-upload__preview-title {
  display: block;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #6c7293;
  margin-bottom: 0.5rem;
}

.cms-media-upload__preview-frame {
  margin: 0 auto;
  background: #f4f5f8;
  border-radius: 4px;
  overflow: hidden;
  line-height: 0;
}

.cms-media-upload__preview-frame img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
}

.cms-media-upload__preview-frame--empty img {
  object-fit: contain;
  object-position: center;
  opacity: 0.85;
}

.cms-media-upload__preview-frame--event-thumb {
  width: 140px;
  aspect-ratio: 350 / 280;
}

.cms-media-upload__preview-frame--event-detail {
  width: 100%;
  max-width: 320px;
  aspect-ratio: 870 / 400;
}

.cms-media-upload__preview-frame--prayer-staff {
  width: 130px;
  aspect-ratio: 350 / 484;
}

.cms-media-upload__preview-frame--gallery {
  width: 160px;
  aspect-ratio: 390 / 353;
}

.cms-media-upload__preview-frame--generic {
  width: 200px;
  aspect-ratio: 16 / 9;
  max-width: 100%;
}

.cms-media-upload__preview-caption {
  display: block;
  margin-top: 0.45rem;
  font-size: 0.7rem;
  color: #a1a8c3;
}

#cms_modal_content_form .modal-body {
  padding: 1.5rem 1.75rem;
}

.cms-content-form-grid {
  margin-left: -0.6rem;
  margin-right: -0.6rem;
}

.cms-content-form-grid > [class*="col-"] {
  padding-left: 0.6rem;
  padding-right: 0.6rem;
}

.cms-content-form-grid .form-group {
  margin-bottom: 1rem;
}

/* Summernote menyuntik DOM toolbar sendiri — pastikan tidak ketutup overflow / flex Metronic. */
#cms_modal_content_form :deep(.note-toolbar) {
  display: flex !important;
  flex-wrap: wrap;
  align-items: center;
  visibility: visible !important;
  opacity: 1 !important;
  position: relative;
  z-index: 2;
}

#cms_modal_content_form :deep(.note-toolbar .note-btn-group) {
  display: inline-flex !important;
}

#cms_modal_content_form :deep(.note-editable) {
  min-height: 6rem;
}
</style>
