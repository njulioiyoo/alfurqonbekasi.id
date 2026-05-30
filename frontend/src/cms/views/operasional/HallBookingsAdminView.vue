<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import {
  deleteAdminHallBooking,
  getAdminHallBooking,
  patchAdminHallBooking,
  type HallBookingDetail,
} from "../../api/admin.js";
import KtRemoteDatatable from "../../components/KtRemoteDatatable.vue";
import { useAccessStore } from "../../stores/access.js";
import { confirmDeleteDialog } from "../../utils/sweetalert.js";

const STATUS_OPTIONS = [
  { value: "pending", label: "Menunggu" },
  { value: "reviewed", label: "Ditinjau" },
  { value: "approved", label: "Disetujui" },
  { value: "rejected", label: "Ditolak" },
  { value: "cancelled", label: "Dibatalkan" },
] as const;

const EVENT_TYPE_LABELS: Record<string, string> = {
  pernikahan: "Pernikahan",
  pengajian: "Pengajian",
  rapat: "Rapat",
  pelatihan: "Pelatihan",
  arisan: "Arisan",
  lainnya: "Lainnya",
};

interface JQueryLite {
  fn?: { modal?: (...args: unknown[]) => unknown };
  modal?: (action?: string) => unknown;
}

declare global {
  interface Window {
    toastr?: {
      options: Record<string, unknown>;
      clear: () => unknown;
      info: (message: string, title?: string) => unknown;
      success: (message: string, title?: string) => unknown;
      error: (message: string, title?: string) => unknown;
    };
    jQuery?: {
      fn: { modal?: (...args: unknown[]) => unknown };
      (selector: Element | string): JQueryLite;
    };
  }
}

const access = useAccessStore();
const { flags } = storeToRefs(access);
const canRead = computed(() => flags.value.canReadHallBooking);
const canUpdate = computed(() => flags.value.canUpdateHallBooking);
const canDelete = computed(() => flags.value.canDeleteHallBooking);

const tableRef = ref<InstanceType<typeof KtRemoteDatatable> | null>(null);
const loading = ref(false);
const saving = ref(false);
const detail = ref<HallBookingDetail | null>(null);
const editStatus = ref("pending");
const editAdminNotes = ref("");

const columns = [
  { field: "hallName", title: "Aula", width: 140 },
  { field: "applicantName", title: "Pemohon", width: 140 },
  { field: "applicantPhone", title: "Telepon", width: 120 },
  { field: "eventType", title: "Jenis", width: 100, template: (row: { eventType?: string }) => EVENT_TYPE_LABELS[row.eventType ?? ""] ?? row.eventType },
  { field: "eventTitle", title: "Acara", width: 160 },
  { field: "eventDateStart", title: "Tanggal", width: 110 },
  { field: "status", title: "Status", width: 100 },
  { field: "createdAt", title: "Diajukan", width: 160 },
  {
    field: "actions",
    title: "Aksi",
    width: 100,
    sortable: false,
    template: (row: { RecordID: string }) => {
      const viewBtn = canRead.value
        ? `<button type="button" class="btn btn-sm btn-clean btn-icon btn-icon-md cms-hall-view" data-id="${row.RecordID}" title="Lihat"><i class="la la-eye"></i></button>`
        : "";
      const delBtn = canDelete.value
        ? `<button type="button" class="btn btn-sm btn-clean btn-icon btn-icon-md cms-hall-del" data-id="${row.RecordID}" title="Hapus"><i class="la la-trash"></i></button>`
        : "";
      return viewBtn + delBtn;
    },
  },
];

function jq(): Window["jQuery"] {
  return window.jQuery;
}

function toastLoading(message: string): void {
  if (!window.toastr) return;
  window.toastr.clear();
  window.toastr.options = { closeButton: true, progressBar: true, timeOut: 0, tapToDismiss: false };
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

function reloadTable(): void {
  tableRef.value?.reload();
}

function showModal(id: string): void {
  const $ = jq();
  const el = document.getElementById(id);
  if (!$?.fn?.modal || !el) return;
  ($(el) as unknown as { modal: (a?: string) => void }).modal("show");
}

function hideModal(id: string): void {
  const $ = jq();
  const el = document.getElementById(id);
  if (!$?.fn?.modal || !el) return;
  ($(el) as unknown as { modal: (a?: string) => void }).modal("hide");
}

function eventTypeLabel(t: string): string {
  return EVENT_TYPE_LABELS[t] ?? t;
}

async function openDetail(id: string): Promise<void> {
  loading.value = true;
  detail.value = null;
  try {
    const json = await getAdminHallBooking(id);
    if (!json.ok || !json.data) {
      toastError(json.error?.message || "Gagal memuat pengajuan");
      return;
    }
    detail.value = json.data;
    editStatus.value = json.data.status;
    editAdminNotes.value = json.data.adminNotes;
    showModal("cms_modal_hall_detail");
    reloadTable();
  } catch {
    toastError("Tidak dapat menghubungi server");
  } finally {
    loading.value = false;
  }
}

async function onSave(): Promise<void> {
  if (!detail.value || !canUpdate.value) return;
  saving.value = true;
  toastLoading("Menyimpan…");
  try {
    const json = await patchAdminHallBooking(detail.value.id, {
      status: editStatus.value,
      adminNotes: editAdminNotes.value,
    });
    if (!json.ok || !json.data) {
      toastError(json.error?.message || "Gagal menyimpan");
      return;
    }
    detail.value = json.data;
    editStatus.value = json.data.status;
    editAdminNotes.value = json.data.adminNotes;
    reloadTable();
    toastSuccess("Pengajuan berhasil diperbarui.");
  } catch {
    toastError("Tidak dapat menghubungi server");
  } finally {
    saving.value = false;
  }
}

async function onDelete(id: string): Promise<void> {
  if (!canDelete.value) return;
  const ok = await confirmDeleteDialog({
    title: "Hapus pengajuan?",
    html: "Pengajuan penyewaan aula ini akan dihapus permanen.",
  });
  if (!ok) return;
  toastLoading("Menghapus…");
  try {
    const json = await deleteAdminHallBooking(id);
    if (!json.ok) {
      toastError(json.error?.message || "Gagal menghapus");
      return;
    }
    if (detail.value?.id === id) {
      detail.value = null;
      hideModal("cms_modal_hall_detail");
    }
    reloadTable();
    toastSuccess("Pengajuan dihapus.");
  } catch {
    toastError("Tidak dapat menghubungi server");
  }
}

function onTableClick(e: MouseEvent): void {
  const t = e.target as HTMLElement;
  const btn = t.closest(".cms-hall-view, .cms-hall-del") as HTMLElement | null;
  if (!btn) return;
  const id = btn.getAttribute("data-id");
  if (!id) return;
  if (btn.classList.contains("cms-hall-view")) void openDetail(id);
  else void onDelete(id);
}

onMounted(() => {
  document.addEventListener("click", onTableClick);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", onTableClick);
});
</script>

<template>
  <div class="row">
    <div class="col-12">
      <div class="kt-portlet kt-portlet--mobile">
        <div class="kt-portlet__head kt-portlet__head--lg">
          <div class="kt-portlet__head-label">
            <span class="kt-portlet__head-icon"><i class="kt-font-brand flaticon2-building"></i></span>
            <h3 class="kt-portlet__head-title">Penyewaan Aula</h3>
          </div>
        </div>
        <div class="kt-portlet__body kt-portlet__body--fit">
          <KtRemoteDatatable
            ref="tableRef"
            table-id="hall_bookings_datatable"
            read-path="/admin/hall-bookings/datatable"
            search-placeholder="Cari pemohon, aula, judul acara, status…"
            search-hint="Pengajuan dari form penyewaan aula di website. Setujui hanya jika tanggal tidak bentrok dengan booking lain."
            :columns="columns"
          />
        </div>
      </div>

      <div id="cms_modal_hall_detail" class="modal fade" tabindex="-1" role="dialog" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-scrollable" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Detail Pengajuan Sewa Aula</h5>
              <button type="button" class="close" data-dismiss="modal" aria-label="Tutup" @click="hideModal('cms_modal_hall_detail')">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body">
              <p v-if="loading" class="kt-font-muted">Memuat…</p>
              <template v-else-if="detail">
                <dl class="row mb-3">
                  <dt class="col-sm-4">Aula</dt>
                  <dd class="col-sm-8">{{ detail.hallName }}</dd>
                  <dt class="col-sm-4">Judul acara</dt>
                  <dd class="col-sm-8">{{ detail.eventTitle }}</dd>
                  <dt class="col-sm-4">Jenis acara</dt>
                  <dd class="col-sm-8">{{ eventTypeLabel(detail.eventType) }}</dd>
                  <dt class="col-sm-4">Tanggal</dt>
                  <dd class="col-sm-8">
                    {{ detail.eventDateStart }}
                    <template v-if="detail.eventDateEnd !== detail.eventDateStart"> — {{ detail.eventDateEnd }}</template>
                  </dd>
                  <dt class="col-sm-4">Jam</dt>
                  <dd class="col-sm-8">
                    <template v-if="detail.timeStart">{{ detail.timeStart }}<template v-if="detail.timeEnd"> – {{ detail.timeEnd }}</template></template>
                    <template v-else>—</template>
                  </dd>
                  <dt class="col-sm-4">Perkiraan tamu</dt>
                  <dd class="col-sm-8">{{ detail.expectedAttendees ?? "—" }}</dd>
                  <dt class="col-sm-4">Pemohon</dt>
                  <dd class="col-sm-8">{{ detail.applicantName }}</dd>
                  <dt class="col-sm-4">Telepon</dt>
                  <dd class="col-sm-8"><a :href="`tel:${detail.applicantPhone}`">{{ detail.applicantPhone }}</a></dd>
                  <dt class="col-sm-4">Email</dt>
                  <dd class="col-sm-8">
                    <a v-if="detail.applicantEmail" :href="`mailto:${detail.applicantEmail}`">{{ detail.applicantEmail }}</a>
                    <span v-else>—</span>
                  </dd>
                  <dt class="col-sm-4">Organisasi</dt>
                  <dd class="col-sm-8">{{ detail.organization || "—" }}</dd>
                  <dt class="col-sm-4">Catatan pemohon</dt>
                  <dd class="col-sm-8"><pre class="cms-pre-block">{{ detail.notes || "—" }}</pre></dd>
                  <dt class="col-sm-4">Diajukan</dt>
                  <dd class="col-sm-8">{{ detail.createdAt }}</dd>
                </dl>
                <hr />
                <div v-if="canUpdate" class="form-group">
                  <label>Status pengajuan</label>
                  <select v-model="editStatus" class="form-control">
                    <option v-for="opt in STATUS_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>
                </div>
                <div v-if="canUpdate" class="form-group mb-0">
                  <label>Catatan admin (internal)</label>
                  <textarea v-model="editAdminNotes" class="form-control" rows="3" placeholder="Catatan untuk pengurus masjid…" />
                </div>
                <p v-else class="kt-font-muted mb-0">Status: <strong>{{ detail.status }}</strong></p>
              </template>
            </div>
            <div class="modal-footer">
              <button
                v-if="detail && canDelete"
                type="button"
                class="btn btn-danger"
                @click="onDelete(detail.id)"
              >
                <i class="la la-trash"></i> Hapus
              </button>
              <button type="button" class="btn btn-secondary" data-dismiss="modal" @click="hideModal('cms_modal_hall_detail')">Tutup</button>
              <button v-if="detail && canUpdate" type="button" class="btn btn-brand" :disabled="saving" @click="onSave">
                Simpan
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cms-pre-block {
  white-space: pre-wrap;
  font-family: inherit;
  font-size: 14px;
  margin: 0;
  background: #f7f8fa;
  padding: 10px;
  border-radius: 4px;
}
</style>
