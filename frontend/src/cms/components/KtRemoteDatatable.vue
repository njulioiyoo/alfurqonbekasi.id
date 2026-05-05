<script setup lang="ts">
import { inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { apiUrl } from "../api/http.js";
import { ADMIN_SHELL_READY } from "../injectionKeys.js";
import { useAuthStore } from "../stores/auth.js";

declare global {
  interface Window {
    jQuery?: {
      fn: {
        KTDatatable?: (...args: unknown[]) => unknown;
      };
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
    pageSize?: number;
  }>(),
  {
    showSearch: true,
    searchPlaceholder: "Cari…",
    pageSize: 10,
  }
);

const auth = useAuthStore();
const adminShellReady = inject(ADMIN_SHELL_READY) ?? ref(false);

const rootRef = ref<HTMLElement | null>(null);
let ktInitialized = false;

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

  const base: Record<string, unknown> = {
    data: {
      type: "remote",
      source: {
        read: {
          url: apiUrl(props.readPath),
          beforeSend(jqXHR: { setRequestHeader?: (n: string, v: string) => void }) {
            const t = auth.token ?? "";
            if (t) jqXHR.setRequestHeader?.("Authorization", `Bearer ${t}`);
          },
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
    columns: props.columns as never[],
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

watch(adminShellReady, (ready) => {
  if (ready) scheduleMount();
});

onMounted(() => {
  scheduleMount();
});

onBeforeUnmount(() => {
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
  <div>
    <div
      v-if="showSearch"
      class="kt-form kt-form--label-right kt-margin-t-20 kt-margin-b-10"
    >
      <div class="row align-items-center">
        <div class="col-xl-8 order-2 order-xl-1">
          <div class="row align-items-center">
            <div class="col-md-4 kt-margin-b-20-tablet-and-mobile">
              <div class="kt-input-icon kt-input-icon--left">
                <input
                  :id="`${tableId}_generalSearch`"
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
        <div class="col-xl-4 order-1 order-xl-2 kt-align-right kt-margin-b-20-tablet-and-mobile">
          <div class="kt-separator kt-separator--border-dashed kt-separator--space-lg d-xl-none"></div>
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
[data-kt-remote-dt] > .kt-datatable__pager > .kt-datatable__pager-info {
  margin-left: auto;
}

[data-kt-remote-dt] > .kt-datatable__pager > .kt-datatable__pager-nav {
  display: flex !important;
  flex-wrap: wrap;
  align-items: center;
}
</style>
