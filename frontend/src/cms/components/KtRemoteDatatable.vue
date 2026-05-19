<script setup lang="ts">
import { inject, nextTick, onBeforeMount, onBeforeUnmount, onMounted, ref, toRaw, watch } from "vue";
import { apiUrl } from "../api/http.js";
import { ADMIN_SHELL_READY } from "../injectionKeys.js";
import {
  getKtdatatableBodyExtraForAjaxUrl,
  registerKtdatatableBodyExtra,
} from "../utils/ktdatatableBodyExtras.js";

/** Satu kali: KTDatatable mengirim `data` sebagai object; stringify ke JSON agar `express.json()` selalu dapat body utuh. */
let adminDatatableJsonPrefilterInstalled = false;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof FormData);
}

function ensureAdminDatatableJsonPrefilter(jquery: {
  ajaxPrefilter?: (fn: (options: Record<string, unknown>) => void) => void;
}): void {
  if (adminDatatableJsonPrefilterInstalled || typeof jquery.ajaxPrefilter !== "function") return;
  adminDatatableJsonPrefilterInstalled = true;
  jquery.ajaxPrefilter((options: Record<string, unknown>) => {
    const url = typeof options.url === "string" ? options.url : "";
    const path = url.split("?")[0] ?? "";
    /* Semua endpoint `.../datatable` di bawah `/admin/` (termasuk nested, mis. jamaah/members/datatable). */
    if (!/\/admin\/.+\/datatable$/.test(path)) return;
    if (typeof options.data === "string") return;
    if (!isPlainObject(options.data)) return;
    const merge = getKtdatatableBodyExtraForAjaxUrl(url);
    if (merge) Object.assign(options.data as Record<string, unknown>, merge);
    options.contentType = "application/json; charset=UTF-8";
    options.data = JSON.stringify(options.data);
    options.processData = false;
  });
}

/**
 * Respons Metronic: `{ meta, data: Row[] }`. Jika error JSON tanpa `data`, kembalikan [] supaya plugin tidak mengiterasi object.
 */
function mapRemoteDatatableRows(raw: unknown): unknown[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  if (!isPlainObject(raw)) return [];
  const rows = raw.data;
  if (Array.isArray(rows)) return rows;
  if (raw.ok === false) return [];
  return [];
}

declare global {
  interface Window {
    jQuery?: {
      fn: {
        KTDatatable?: (...args: unknown[]) => unknown;
      };
      ajaxPrefilter?: (fn: (options: Record<string, unknown>) => void) => void;
      (selector: Element | string): JQueryLite;
    };
  }
}

/** Minimal typing untuk plugin Metronic. */
interface JQueryLite {
  fn?: unknown;
  length?: number;
  KTDatatable(action?: string): JQueryLite;
}

const props = withDefaults(
  defineProps<{
    /** Elemen root `id` + target CSS pager (unik per halaman). */
    tableId: string;
    /** Path API relatif ke `apiUrl`, mis. `/admin/users/datatable`. */
    readPath: string;
    /** Definisi kolom KTDatatable (objek seperti demo Metronic). */
    columns: unknown[];
    showSearch?: boolean;
    searchPlaceholder?: string;
    /** Teks penjelas singkat di atas kolom pencarian (opsional). */
    searchHint?: string;
    pageSize?: number;
    /** Digabung ke body POST datatable (mis. `{ contentType: "event" }`). */
    mergeRequestBody?: Record<string, unknown>;
  }>(),
  {
    showSearch: true,
    searchPlaceholder: "Cari…",
    pageSize: 10,
    mergeRequestBody: undefined,
  }
);

const adminShellReady = inject(ADMIN_SHELL_READY) ?? ref(false);

const rootRef = ref<HTMLElement | null>(null);
let ktInitialized = false;
/** Cleanup registrasi merge body untuk `readPath` ini (hindari leak antar halaman). */
let unregisterExtras: (() => void) | null = null;

function jq(): Window["jQuery"] {
  return window.jQuery;
}

function searchInputSelector(): string {
  return `#${props.tableId}_generalSearch`;
}

function mountKt(): boolean {
  const $ = jq();
  const el = rootRef.value;
  if (!$?.fn?.KTDatatable || !el) return false;

  syncMergeExtras();

  ensureAdminDatatableJsonPrefilter($ as { ajaxPrefilter?: (fn: (o: Record<string, unknown>) => void) => void });

  const base: Record<string, unknown> = {
    data: {
      type: "remote",
      source: {
        read: {
          url: apiUrl(props.readPath),
          map: mapRemoteDatatableRows,
          xhrFields: { withCredentials: true },
        },
      },
      pageSize: props.pageSize,
      saveState: false,
      serverPaging: true,
      serverFiltering: true,
      serverSorting: true,
    },
    layout: {
      scroll: false,
      footer: false,
      theme: "default",
      class: "",
      minHeight: null,
    },
    toolbar: {
      layout: ["pagination", "info"],
      placement: ["bottom"],
      items: {
        pagination: {
          type: "default",
          pages: {
            desktop: { layout: "default", pagesNumber: 5 },
            tablet: { layout: "default", pagesNumber: 3 },
            mobile: { layout: "compact" },
          },
          navigation: {
            prev: true,
            next: true,
            first: true,
            last: true,
            more: false,
          },
          pageSizeSelect: [10, 20, 30, 50, 100],
        },
        info: true,
      },
    },
    sortable: true,
    pagination: true,
    translate: {
      records: {
        processing: "Memuat data…",
        noRecords: "Tidak ada data",
      },
      toolbar: {
        pagination: {
          items: {
            default: {
              first: "Pertama",
              prev: "Sebelumnya",
              next: "Berikutnya",
              last: "Terakhir",
              more: "Halaman lain",
              input: "Nomor halaman",
              select: "Baris per halaman",
              all: "semua",
            },
            info: "Menampilkan {{start}} - {{end}} dari {{total}}",
          },
        },
      },
    },
    columns: toRaw(props.columns) as never[],
  };

  if (props.showSearch) {
    const searchInput = $(searchInputSelector());
    base.search = { input: searchInput, delay: 400 };
  }

  ($(el) as JQueryLite).KTDatatable(base as never);
  return true;
}

function scheduleMount(): void {
  if (!adminShellReady.value || ktInitialized) return;
  void nextTick().then(() => {
    requestAnimationFrame(() => {
      if (ktInitialized) return;
      if (mountKt()) ktInitialized = true;
    });
  });
}

function reload(): void {
  const $ = jq();
  const el = rootRef.value;
  if (!$?.fn?.KTDatatable || !el) return;
  ($(el) as JQueryLite).KTDatatable("reload");
}

/** Merge statis + dinamis (mis. `campaignId`) — daftar ulang ke map body AJAX tiap perubahan. */
function syncMergeExtras(): void {
  unregisterExtras?.();
  unregisterExtras = null;
  const ex = props.mergeRequestBody;
  if (ex && Object.keys(ex).length > 0) {
    unregisterExtras = registerKtdatatableBodyExtra(props.readPath, { ...ex });
  }
}

watch(adminShellReady, (ready) => {
  if (ready) scheduleMount();
});

watch(
  () => props.mergeRequestBody,
  () => {
    syncMergeExtras();
    if (ktInitialized) reload();
  },
  { deep: true }
);

/** Ganti halaman/route dengan `tableId` atau kolom berbeda — init ulang KTDatatable. */
watch(
  () => [props.tableId, props.columns] as const,
  () => {
    const $ = jq();
    const el = rootRef.value;
    if (ktInitialized && $?.fn?.KTDatatable && el) {
      try {
        ($(el) as JQueryLite).KTDatatable("destroy");
      } catch {
        /* ignore */
      }
      ktInitialized = false;
    }
    scheduleMount();
  },
  { deep: true }
);

onBeforeMount(() => {
  syncMergeExtras();
});

onMounted(() => {
  syncMergeExtras();
  scheduleMount();
});

watch(
  () => props.readPath,
  () => {
    syncMergeExtras();
    if (ktInitialized) reload();
  }
);

onBeforeUnmount(() => {
  unregisterExtras?.();
  unregisterExtras = null;
  ktInitialized = false;
  const $ = jq();
  const el = rootRef.value;
  if ($?.fn?.KTDatatable && el) {
    try {
      ($(el) as JQueryLite).KTDatatable("destroy");
    } catch {
      /* plugin mungkin sudah membuang node */
    }
  }
});

function getTableEl(): HTMLElement | null {
  return rootRef.value;
}

defineExpose({
  reload,
  getTableEl,
});
</script>

<template>
  <div class="kt-remote-datatable">
    <!-- `kt-portlet__body--fit` membuat padding body 0; beri inset agar search tidak menempel ke tepi kartu. -->
    <div
      v-if="showSearch"
      class="kt-remote-datatable__search kt-padding-25 kt-padding-b-15"
    >
      <p v-if="searchHint" class="kt-font-muted kt-font-sm kt-margin-b-15">{{ searchHint }}</p>
      <div class="kt-form kt-form--label-right kt-margin-b-0">
        <div class="row align-items-center">
          <div class="col-xl-8 order-2 order-xl-1">
            <div class="row align-items-center">
              <div class="col-md-6 col-lg-5 kt-margin-b-15-tablet-and-mobile">
                <div class="kt-input-icon kt-input-icon--left">
                  <input
                    :id="`${tableId}_generalSearch`"
                    name="generalSearch"
                    type="text"
                    class="form-control"
                    :placeholder="searchPlaceholder"
                    autocomplete="off"
                  />
                  <span class="kt-input-icon__icon kt-input-icon__icon--left">
                    <span><i class="la la-search"></i></span>
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div class="col-xl-4 order-1 order-xl-2 kt-align-right kt-margin-b-15-tablet-and-mobile">
            <div class="kt-separator kt-separator--border-dashed kt-separator--space-lg d-xl-none"></div>
          </div>
        </div>
      </div>
    </div>
    <div
      :id="tableId"
      ref="rootRef"
      class="kt-datatable"
      :data-kt-remote-dt="tableId"
    ></div>
  </div>
</template>

<style>
/* Pemisah tipis antara blok search (berpadding) dan tabel full-bleed di bawahnya */
.kt-remote-datatable__search + .kt-datatable {
  border-top: 1px solid #f0f0f0;
}

[data-kt-remote-dt] > .kt-datatable__pager > .kt-datatable__pager-info {
  margin-left: auto;
}

[data-kt-remote-dt] > .kt-datatable__pager > .kt-datatable__pager-nav {
  display: flex !important;
  flex-wrap: wrap;
  align-items: center;
}

/* Hilangkan checkbox bulk/pager yang tidak dipakai (tanpa kolom selector). */
[data-kt-remote-dt] .kt-datatable__pager .kt-checkbox,
[data-kt-remote-dt] .kt-datatable__pager input[type="checkbox"],
[data-kt-remote-dt] thead .kt-checkbox,
[data-kt-remote-dt] tbody .kt-checkbox {
  display: none !important;
}

[data-kt-remote-dt] thead th.kt-datatable__cell--check,
[data-kt-remote-dt] tbody td.kt-datatable__cell--check {
  display: none !important;
  width: 0 !important;
  min-width: 0 !important;
  padding: 0 !important;
  border: none !important;
}
</style>
