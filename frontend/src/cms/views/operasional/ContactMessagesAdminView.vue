<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { deleteAdminContactMessage, getAdminContactMessage } from "../../api/admin.js";
import KtRemoteDatatable from "../../components/KtRemoteDatatable.vue";
import { useAccessStore } from "../../stores/access.js";

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
const canRead = computed(() => flags.value.canReadContactMessage);
const canDelete = computed(() => flags.value.canDeleteContactMessage);

const tableRef = ref<InstanceType<typeof KtRemoteDatatable> | null>(null);
const loading = ref(false);
const deleting = ref(false);
const err = ref("");
const pendingDelete = ref<{ id: string; name: string } | null>(null);
const detail = ref<{
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: string;
  emailSent: boolean;
  emailError: string;
  createdAt: string;
  readAt: string;
} | null>(null);

const columns = [
  { field: "name", title: "Nama", width: 160 },
  { field: "email", title: "Email", width: 180 },
  { field: "phone", title: "Telepon", width: 120 },
  { field: "status", title: "Status", width: 90 },
  { field: "emailSent", title: "Email terkirim", width: 110 },
  { field: "createdAt", title: "Diterima", width: 170 },
  {
    field: "actions",
    title: "Aksi",
    width: 120,
    sortable: false,
    template: (row: { RecordID: string; name?: string }) => {
      const viewBtn = canRead.value
        ? `<button type="button" class="btn btn-sm btn-clean btn-icon btn-icon-md cms-contact-view" data-id="${row.RecordID}" title="Lihat"><i class="la la-eye"></i></button>`
        : "";
      const delBtn = canDelete.value
        ? `<button type="button" class="btn btn-sm btn-clean btn-icon btn-icon-md cms-contact-del" data-id="${row.RecordID}" data-name="${String(row.name ?? "").replace(/"/g, "&quot;")}" title="Hapus"><i class="la la-trash"></i></button>`
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

function openDetailModal(): void {
  showModal("cms_modal_contact_detail");
}

function closeDetailModal(): void {
  hideModal("cms_modal_contact_detail");
}

function openDeleteModal(): void {
  showModal("cms_modal_contact_delete");
}

function closeDeleteModal(): void {
  hideModal("cms_modal_contact_delete");
}

async function openDetail(id: string): Promise<void> {
  loading.value = true;
  err.value = "";
  detail.value = null;
  try {
    const json = await getAdminContactMessage(id);
    if (!json.ok || !json.data) {
      toastError(json.error?.message || "Gagal memuat pesan");
      return;
    }
    detail.value = json.data;
    openDetailModal();
    reloadTable();
  } catch {
    toastError("Tidak dapat menghubungi server");
  } finally {
    loading.value = false;
  }
}

function requestDelete(id: string, name: string): void {
  if (!canDelete.value) return;
  pendingDelete.value = { id, name: name || "pesan ini" };
  openDeleteModal();
}

function cancelDelete(): void {
  pendingDelete.value = null;
  closeDeleteModal();
}

async function confirmDelete(): Promise<void> {
  if (!pendingDelete.value || deleting.value) return;
  const { id, name } = pendingDelete.value;
  deleting.value = true;
  closeDeleteModal();
  toastLoading("Menghapus pesan kontak…");
  try {
    const json = await deleteAdminContactMessage(id);
    if (!json.ok) {
      toastError(json.error?.message || "Gagal menghapus pesan");
      return;
    }
    if (detail.value?.id === id) {
      detail.value = null;
      closeDetailModal();
    }
    pendingDelete.value = null;
    reloadTable();
    toastSuccess(`Pesan dari "${name}" berhasil dihapus.`);
  } catch {
    toastError("Tidak dapat menghubungi server");
  } finally {
    deleting.value = false;
  }
}

function onTableClick(e: MouseEvent): void {
  const t = e.target as HTMLElement;
  const btn = t.closest(".cms-contact-view, .cms-contact-del") as HTMLElement | null;
  if (!btn) return;
  const id = btn.getAttribute("data-id");
  if (!id) return;
  if (btn.classList.contains("cms-contact-view")) void openDetail(id);
  else requestDelete(id, btn.getAttribute("data-name") || "");
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
            <span class="kt-portlet__head-icon"><i class="kt-font-brand flaticon2-mail-1"></i></span>
            <h3 class="kt-portlet__head-title">Pesan Kontak</h3>
          </div>
        </div>
        <div class="kt-portlet__body kt-portlet__body--fit">
          <KtRemoteDatatable
            ref="tableRef"
            table-id="contact_messages_datatable"
            read-path="/admin/contact-messages/datatable"
            search-placeholder="Cari nama, email, telepon, isi pesan…"
            search-hint="Pesan dari form kontak website. Email notifikasi dikirim ke alamat di Config → Integrasi → SMTP."
            :columns="columns"
          />
        </div>
      </div>

      <!-- Detail -->
      <div id="cms_modal_contact_detail" class="modal fade" tabindex="-1" role="dialog" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-scrollable" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Detail Pesan Kontak</h5>
              <button type="button" class="close" data-dismiss="modal" aria-label="Tutup" @click="closeDetailModal">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body">
              <p v-if="loading" class="kt-font-muted">Memuat…</p>
              <p v-else-if="err" class="text-danger">{{ err }}</p>
              <template v-else-if="detail">
                <dl class="row mb-0">
                  <dt class="col-sm-3">Nama</dt>
                  <dd class="col-sm-9">{{ detail.name }}</dd>
                  <dt class="col-sm-3">Email</dt>
                  <dd class="col-sm-9"><a :href="`mailto:${detail.email}`">{{ detail.email }}</a></dd>
                  <dt class="col-sm-3">Telepon</dt>
                  <dd class="col-sm-9">{{ detail.phone || "—" }}</dd>
                  <dt class="col-sm-3">Status</dt>
                  <dd class="col-sm-9">{{ detail.status }}</dd>
                  <dt class="col-sm-3">Email notifikasi</dt>
                  <dd class="col-sm-9">{{ detail.emailSent ? "Terkirim" : "Gagal / belum dikonfigurasi" }}</dd>
                  <dt v-if="detail.emailError" class="col-sm-3">Error email</dt>
                  <dd v-if="detail.emailError" class="col-sm-9 text-danger">{{ detail.emailError }}</dd>
                  <dt class="col-sm-3">Diterima</dt>
                  <dd class="col-sm-9">{{ detail.createdAt }}</dd>
                  <dt class="col-sm-3">Pesan</dt>
                  <dd class="col-sm-9"><pre class="cms-contact-message">{{ detail.message }}</pre></dd>
                </dl>
              </template>
            </div>
            <div class="modal-footer">
              <button
                v-if="detail && canDelete"
                type="button"
                class="btn btn-danger"
                :disabled="deleting"
                @click="requestDelete(detail.id, detail.name)"
              >
                <i class="la la-trash"></i> Hapus
              </button>
              <button type="button" class="btn btn-secondary" data-dismiss="modal" @click="closeDetailModal">Tutup</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Konfirmasi hapus -->
      <div id="cms_modal_contact_delete" class="modal fade" tabindex="-1" role="dialog" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered" role="document">
          <div class="modal-content">
            <div class="modal-header border-0 pb-0">
              <h5 class="modal-title">Hapus pesan kontak?</h5>
              <button type="button" class="close" aria-label="Tutup" @click="cancelDelete">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body text-center pt-2 pb-4">
              <div class="cms-delete-icon-wrap kt-margin-b-20">
                <i class="flaticon-warning kt-font-danger"></i>
              </div>
              <p class="mb-1">Anda akan menghapus pesan dari</p>
              <p class="kt-font-bold kt-font-lg mb-2">{{ pendingDelete?.name }}</p>
              <p class="kt-font-muted mb-0">Tindakan ini tidak dapat dibatalkan.</p>
            </div>
            <div class="modal-footer border-0 justify-content-center pt-0">
              <button type="button" class="btn btn-secondary" @click="cancelDelete">Batal</button>
              <button type="button" class="btn btn-danger" :disabled="deleting" @click="confirmDelete">
                <i class="la la-trash"></i> Ya, hapus
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cms-contact-message {
  white-space: pre-wrap;
  font-family: inherit;
  font-size: 14px;
  margin: 0;
  background: #f7f8fa;
  padding: 12px;
  border-radius: 4px;
}

.cms-delete-icon-wrap i {
  font-size: 52px;
  line-height: 1;
}
</style>
