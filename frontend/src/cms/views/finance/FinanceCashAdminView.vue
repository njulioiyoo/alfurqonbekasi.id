<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import {
  createAdminFinanceTransaction,
  deleteAdminFinanceTransaction,
  getAdminFinanceLookups,
  getAdminFinanceTransaction,
  patchAdminFinanceTransaction,
  uploadAdminFile,
  type FinanceTransactionRow,
} from "../../api/admin.js";
import KtRemoteDatatable from "../../components/KtRemoteDatatable.vue";
import { useAccessStore } from "../../stores/access.js";
import { alertErrorDialog, confirmDeleteDialog } from "../../utils/sweetalert.js";

const access = useAccessStore();
const { flags } = storeToRefs(access);
const canCreate = computed(() => flags.value.canCreateFinanceCash);
const canUpdate = computed(() => flags.value.canUpdateFinanceCash);
const canDelete = computed(() => flags.value.canDeleteFinanceCash);
const canMutate = computed(() => canCreate.value || canUpdate.value || canDelete.value);

const tableRef = ref<InstanceType<typeof KtRemoteDatatable> | null>(null);
const saving = ref(false);
const uploadingFile = ref(false);
const loading = ref(false);
const err = ref("");
const editId = ref<string | null>(null);
const accounts = ref<Array<{ id: string; code: string; name: string; type: "income" | "expense" }>>([]);
const wallets = ref<Array<{ id: string; code: string; name: string; kind: "cash" | "bank" }>>([]);
const form = ref({
  txDate: "",
  direction: "in" as "in" | "out",
  amount: 0,
  accountId: "",
  walletId: "",
  description: "",
  referenceNo: "",
  attachmentUrl: "",
  status: "posted" as "draft" | "posted" | "approved",
});

interface JQueryLite {
  fn?: { modal?: (...args: unknown[]) => unknown };
  modal?: (action?: string) => unknown;
}
declare global {
  interface Window {
    jQuery?: { fn: { modal?: (...args: unknown[]) => unknown }; (selector: Element | string): JQueryLite };
    toastr?: {
      clear: () => unknown;
      options: Record<string, unknown>;
      success: (message: string, title?: string) => unknown;
      error: (message: string, title?: string) => unknown;
    };
  }
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
function jq(): Window["jQuery"] {
  return window.jQuery;
}
function openModal(): void {
  const $ = jq();
  const el = document.getElementById("cms_modal_finance_tx_form");
  if (!$?.fn?.modal || !el) return;
  ($(el) as unknown as { modal: (a?: string) => void }).modal("show");
}
function closeModal(): void {
  const $ = jq();
  const el = document.getElementById("cms_modal_finance_tx_form");
  if (!$?.fn?.modal || !el) return;
  ($(el) as unknown as { modal: (a?: string) => void }).modal("hide");
}
function reloadTable(): void {
  tableRef.value?.reload();
}
function resetForm(): void {
  const today = new Date().toISOString().slice(0, 10);
  form.value = {
    txDate: today,
    direction: "in",
    amount: 0,
    accountId: accounts.value[0]?.id ?? "",
    walletId: wallets.value[0]?.id ?? "",
    description: "",
    referenceNo: "",
    attachmentUrl: "",
    status: "posted",
  };
  editId.value = null;
  err.value = "";
}
async function loadLookups(): Promise<void> {
  const json = await getAdminFinanceLookups();
  if (json.ok && json.data) {
    accounts.value = json.data.accounts;
    wallets.value = json.data.wallets;
  }
}
function money(v: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);
}
async function onPickAttachment(ev: Event): Promise<void> {
  const t = ev.target;
  if (!(t instanceof HTMLInputElement) || !t.files?.[0]) return;
  const file = t.files[0];
  t.value = "";
  uploadingFile.value = true;
  try {
    const json = await uploadAdminFile(file);
    if (!json.ok || !json.data?.url) {
      toastError(json.error?.message || "Upload lampiran gagal");
      return;
    }
    form.value.attachmentUrl = json.data.url;
    toastSuccess("Lampiran berhasil diupload.");
  } catch {
    toastError("Tidak dapat menghubungi server");
  } finally {
    uploadingFile.value = false;
  }
}

function openCreate(): void {
  if (!canCreate.value) return;
  resetForm();
  openModal();
}
async function openEdit(id: string): Promise<void> {
  if (!canUpdate.value) return;
  err.value = "";
  loading.value = true;
  try {
    const json = await getAdminFinanceTransaction(id);
    if (!json.ok || !json.data) {
      err.value = json.error?.message || "Gagal memuat transaksi";
      return;
    }
    editId.value = json.data.id;
    form.value = {
      txDate: json.data.txDate,
      direction: json.data.direction,
      amount: json.data.amount,
      accountId: json.data.accountId,
      walletId: json.data.walletId,
      description: json.data.description,
      referenceNo: json.data.referenceNo,
      attachmentUrl: json.data.attachmentUrl,
      status: json.data.status,
    };
    openModal();
  } finally {
    loading.value = false;
  }
}
async function onDelete(id: string): Promise<void> {
  if (!canDelete.value) return;
  const ok = await confirmDeleteDialog({
    title: "Hapus transaksi?",
    html: "Transaksi kas ini akan dihapus permanen.",
  });
  if (!ok) return;
  try {
    const json = await deleteAdminFinanceTransaction(id);
    if (!json.ok) {
      await alertErrorDialog({ text: json.error?.message || "Gagal menghapus transaksi" });
      return;
    }
    reloadTable();
  } catch {
    await alertErrorDialog({ text: "Tidak dapat menghubungi server" });
  }
}
async function onSubmit(): Promise<void> {
  err.value = "";
  if (!form.value.txDate || form.value.amount <= 0 || !form.value.accountId || !form.value.walletId) {
    err.value = "Tanggal, nominal, akun, dan wallet wajib diisi.";
    return;
  }
  saving.value = true;
  const payload = { ...form.value };
  try {
    if (editId.value) {
      const json = await patchAdminFinanceTransaction(editId.value, payload);
      if (!json.ok) {
        err.value = json.error?.message || "Gagal menyimpan perubahan";
        return;
      }
    } else {
      const json = await createAdminFinanceTransaction(payload);
      if (!json.ok) {
        err.value = json.error?.message || "Gagal membuat transaksi";
        return;
      }
    }
    closeModal();
    reloadTable();
  } finally {
    saving.value = false;
  }
}
function onDocClick(ev: MouseEvent): void {
  const t = ev.target;
  if (!(t instanceof Element)) return;
  const editBtn = t.closest(".cms-finance-edit");
  const delBtn = t.closest(".cms-finance-delete");
  const btn = editBtn ?? delBtn;
  const root = tableRef.value?.getTableEl();
  if (!btn || !root?.contains(btn)) return;
  ev.preventDefault();
  const id = btn.getAttribute("data-id");
  if (!id) return;
  if (editBtn) void openEdit(id);
  else void onDelete(id);
}

const columns = computed((): unknown[] => [
  { field: "txDate", title: "Tanggal", width: 110 },
  {
    field: "direction",
    title: "Arah",
    width: 90,
    template(row: FinanceTransactionRow) {
      const cls = row.direction === "in" ? "kt-badge--success" : "kt-badge--danger";
      const label = row.direction === "in" ? "Masuk" : "Keluar";
      return `<span class="kt-badge ${cls} kt-badge--inline">${label}</span>`;
    },
  },
  {
    field: "amount",
    title: "Nominal",
    width: 140,
    template(row: FinanceTransactionRow) {
      return money(row.amount);
    },
  },
  { field: "account", title: "Akun", width: 180 },
  { field: "wallet", title: "Wallet", width: 150 },
  { field: "status", title: "Status", width: 100 },
  {
    field: "Actions",
    title: "Actions",
    sortable: false,
    width: 90,
    template(row: FinanceTransactionRow) {
      const edit = canUpdate.value
        ? `<a href="javascript:;" class="btn btn-sm btn-clean btn-icon cms-finance-edit" data-id="${row.RecordID}"><i class="la la-edit"></i></a>`
        : "";
      const del = canDelete.value
        ? `<a href="javascript:;" class="btn btn-sm btn-clean btn-icon cms-finance-delete" data-id="${row.RecordID}"><i class="la la-trash"></i></a>`
        : "";
      return edit || del || '<span class="kt-font-muted">-</span>';
    },
  },
]);

onMounted(() => {
  document.addEventListener("click", onDocClick);
  void access.load();
  void loadLookups().then(() => resetForm());
});
onBeforeUnmount(() => {
  document.removeEventListener("click", onDocClick);
});
</script>

<template>
  <div class="row">
    <div class="col-12">
      <div class="kt-portlet kt-portlet--mobile">
        <div class="kt-portlet__head kt-portlet__head--lg">
          <div class="kt-portlet__head-label">
            <span class="kt-portlet__head-icon"><i class="kt-font-brand flaticon2-analytics-1"></i></span>
            <h3 class="kt-portlet__head-title">Kas Masjid</h3>
          </div>
          <div v-if="canCreate" class="kt-portlet__head-toolbar">
            <button type="button" class="btn btn-sm btn-brand" @click="openCreate"><i class="la la-plus"></i> Tambah transaksi</button>
          </div>
        </div>
        <div class="kt-portlet__body kt-padding-b-10">
          <details class="cms-finance-help-details border rounded bg-white" open>
            <summary class="cms-finance-help-summary px-3 py-2">
              <span class="kt-font-bolder">Petunjuk singkat</span>
              <span class="kt-font-sm kt-font-muted"> — klik untuk menutup atau membuka</span>
            </summary>
            <div class="border-top px-3 py-3 bg-light">
              <ol class="cms-finance-help-list mb-0 pl-3">
                <li>Klik <span class="text-nowrap"><strong>Tambah transaksi</strong></span> (tombol biru di kanan atas) untuk membuka form.</li>
                <li><strong>Masuk</strong> = pemasukan kas; <strong>Keluar</strong> = pengeluaran kas.</li>
                <li>Isi tanggal, nominal, lalu pilih <strong>Akun</strong> (jenis) dan <strong>Wallet</strong> (kas atau rekening).</li>
                <li>Lampiran nota bersifat opsional — unggah file di form bila perlu.</li>
                <li>
                  Agregasi per tanggal tampil di
                  <router-link :to="{ name: 'finance-reports' }" class="kt-link kt-link--brand kt-font-bolder">Laporan Keuangan</router-link>
                  (menu Keuangan &amp; Donasi).
                </li>
              </ol>
            </div>
          </details>
        </div>
        <div class="kt-portlet__body kt-portlet__body--fit kt-padding-t-0">
          <KtRemoteDatatable
            ref="tableRef"
            table-id="finance_cash_datatable"
            read-path="/admin/finance/transactions/datatable"
            search-placeholder="Cari akun, wallet, deskripsi…"
            search-hint="Pencatatan kas masuk/keluar masjid."
            :columns="columns"
          />
        </div>
      </div>

      <Teleport v-if="canMutate" to="body">
        <div id="cms_modal_finance_tx_form" class="modal fade" tabindex="-1" role="dialog" aria-hidden="true">
          <div class="modal-dialog modal-lg" role="document">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">{{ editId ? "Ubah transaksi kas" : "Tambah transaksi kas" }}</h5>
                <button type="button" class="close" data-dismiss="modal"><span>&times;</span></button>
              </div>
              <div class="modal-body">
                <p v-if="loading" class="kt-font-muted">Memuat…</p>
                <template v-else>
                  <div v-if="err" class="alert alert-outline-danger fade show"><div class="alert-text">{{ err }}</div></div>
                  <form id="cms_form_finance_tx" @submit.prevent="onSubmit">
                    <div class="form-row">
                      <div class="form-group col-md-4"><label>Tanggal</label><input v-model="form.txDate" type="date" class="form-control" required /></div>
                      <div class="form-group col-md-4">
                        <label>Arah transaksi</label>
                        <select v-model="form.direction" class="form-control">
                          <option value="in">Masuk (pemasukan)</option>
                          <option value="out">Keluar (pengeluaran)</option>
                        </select>
                      </div>
                      <div class="form-group col-md-4"><label>Nominal (Rp)</label><input v-model.number="form.amount" type="number" min="1" class="form-control" required /></div>
                    </div>
                    <div class="form-row">
                      <div class="form-group col-md-6">
                        <label>Akun</label>
                        <select v-model="form.accountId" class="form-control" required>
                          <option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.code }} - {{ a.name }}</option>
                        </select>
                      </div>
                      <div class="form-group col-md-6">
                        <label>Wallet</label>
                        <select v-model="form.walletId" class="form-control" required>
                          <option v-for="w in wallets" :key="w.id" :value="w.id">{{ w.code }} - {{ w.name }}</option>
                        </select>
                      </div>
                    </div>
                    <div class="form-group"><label>Deskripsi</label><textarea v-model="form.description" class="form-control" rows="2"></textarea></div>
                    <div class="form-row">
                      <div class="form-group col-md-6"><label>No referensi / kwitansi</label><input v-model="form.referenceNo" type="text" class="form-control" placeholder="Opsional" /></div>
                      <div class="form-group col-md-6">
                        <label>Lampiran (nota / dokumen)</label>
                        <input v-model="form.attachmentUrl" type="text" class="form-control kt-margin-b-5" readonly placeholder="URL setelah upload" />
                        <div class="custom-file">
                          <input
                            id="finance_tx_attachment_upload"
                            type="file"
                            class="custom-file-input"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,image/*,application/pdf"
                            :disabled="uploadingFile"
                            @change="onPickAttachment"
                          />
                          <label class="custom-file-label" for="finance_tx_attachment_upload">
                            {{ uploadingFile ? "Mengupload…" : "Pilih file lampiran" }}
                          </label>
                        </div>
                        <span class="form-text text-muted">PDF, Office, teks, atau gambar (sama seperti upload dokumen di modul lain).</span>
                      </div>
                    </div>
                    <div class="form-group mb-0"><label>Status</label><select v-model="form.status" class="form-control"><option value="draft">draft</option><option value="posted">posted</option><option value="approved">approved</option></select></div>
                  </form>
                </template>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Batal</button>
                <button type="submit" form="cms_form_finance_tx" class="btn btn-brand" :disabled="saving">{{ saving ? "Menyimpan…" : "Simpan" }}</button>
              </div>
            </div>
          </div>
        </div>
      </Teleport>
    </div>
  </div>
</template>

<style scoped>
.cms-finance-help-details > summary {
  list-style: none;
  cursor: pointer;
  user-select: none;
}
.cms-finance-help-details > summary::-webkit-details-marker {
  display: none;
}
.cms-finance-help-list {
  line-height: 1.65;
}
.cms-finance-help-list > li + li {
  margin-top: 0.5rem;
}
</style>
