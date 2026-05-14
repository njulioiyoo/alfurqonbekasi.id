<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { storeToRefs } from "pinia";
import {
  createAdminQzCampaign,
  createAdminQzEntry,
  deleteAdminQzCampaign,
  deleteAdminQzEntry,
  getAdminQzCampaign,
  getAdminQzCampaignsBrief,
  getAdminQzEntry,
  patchAdminQzCampaign,
  patchAdminQzEntry,
  uploadAdminFile,
  type QzCampaignBriefItem,
  type QzEntryRow,
  type QzEntryKind,
  type QzPaymentStatus,
} from "../../api/admin.js";
import KtRemoteDatatable from "../../components/KtRemoteDatatable.vue";
import { useAccessStore } from "../../stores/access.js";

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

interface JQueryLite {
  fn?: { modal?: (...args: unknown[]) => unknown };
  modal?: (action?: string) => unknown;
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

const access = useAccessStore();
const { flags } = storeToRefs(access);

const canCreate = computed(() => flags.value.canCreateProgramQurbanZakat);
const canUpdate = computed(() => flags.value.canUpdateProgramQurbanZakat);
const canDelete = computed(() => flags.value.canDeleteProgramQurbanZakat);
const canMutateCampaign = computed(() => canCreate.value || canUpdate.value || canDelete.value);
const canMutateEntry = computed(() => canCreate.value || canUpdate.value || canDelete.value);

const campaignsTableRef = ref<InstanceType<typeof KtRemoteDatatable> | null>(null);
const entriesTableRef = ref<InstanceType<typeof KtRemoteDatatable> | null>(null);

const campaignBriefList = ref<QzCampaignBriefItem[]>([]);
const selectedCampaignId = ref("");

const entriesMergeBody = computed(() =>
  selectedCampaignId.value ? { campaignId: selectedCampaignId.value } : ({} as Record<string, unknown>)
);

const loadingCampaign = ref(false);
const savingCampaign = ref(false);
const campaignErr = ref("");
const editCampaignId = ref<string | null>(null);

const campaignForm = ref({
  title: "",
  seasonTag: "general" as "general" | "ramadan" | "idul_adha",
  hijriYear: "" as string,
  dateStart: "",
  dateEnd: "",
  status: "draft" as "draft" | "open" | "closed",
  description: "",
});

const loadingEntry = ref(false);
const savingEntry = ref(false);
const uploadingFile = ref(false);
const entryErr = ref("");
const editEntryId = ref<string | null>(null);

/** Ditampilkan saat edit jika sudah ada pemasukan kas otomatis. */
const financeTxDisplay = ref("");

const entryForm = ref({
  entryKind: "other" as QzEntryKind,
  donorName: "",
  donorPhone: "",
  donorAddress: "",
  detailNote: "",
  amount: 0,
  paymentStatus: "pending" as QzPaymentStatus,
  paidAt: "",
  attachmentUrl: "",
  notes: "",
});

function jq(): Window["jQuery"] {
  return window.jQuery;
}

function reloadCampaigns(): void {
  campaignsTableRef.value?.reload();
}

function money(v: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);
}

const ENTRY_KIND_LABEL: Record<QzEntryKind, string> = {
  qurban_adha: "Qurban Idul Adha",
  zakat_fitrah: "Zakat fitrah",
  zakat_mal: "Zakat mal",
  fidyah: "Fidyah",
  other: "Lainnya",
};

async function refreshCampaignBrief(): Promise<void> {
  if (!canRead.value) return;
  try {
    const json = await getAdminQzCampaignsBrief();
    if (json.ok && json.data?.items) {
      campaignBriefList.value = json.data.items;
      if (selectedCampaignId.value && !json.data.items.some((x) => x.id === selectedCampaignId.value)) {
        selectedCampaignId.value = "";
      }
    }
  } catch {
    /* ignore */
  }
}

function openCampaignModal(): void {
  const $ = jq();
  const el = document.getElementById("cms_modal_qz_campaign");
  if (!$?.fn?.modal || !el) return;
  ($(el) as unknown as { modal: (a?: string) => void }).modal("show");
}

function closeCampaignModal(): void {
  const $ = jq();
  const el = document.getElementById("cms_modal_qz_campaign");
  if (!$?.fn?.modal || !el) return;
  ($(el) as unknown as { modal: (a?: string) => void }).modal("hide");
}

function openEntryModal(): void {
  const $ = jq();
  const el = document.getElementById("cms_modal_qz_entry");
  if (!$?.fn?.modal || !el) return;
  ($(el) as unknown as { modal: (a?: string) => void }).modal("show");
}

function closeEntryModal(): void {
  const $ = jq();
  const el = document.getElementById("cms_modal_qz_entry");
  if (!$?.fn?.modal || !el) return;
  ($(el) as unknown as { modal: (a?: string) => void }).modal("hide");
}

function resetCampaignForm(): void {
  campaignForm.value = {
    title: "",
    seasonTag: "general",
    hijriYear: "",
    dateStart: "",
    dateEnd: "",
    status: "draft",
    description: "",
  };
  editCampaignId.value = null;
  campaignErr.value = "";
}

function resetEntryForm(): void {
  financeTxDisplay.value = "";
  entryForm.value = {
    entryKind: "other",
    donorName: "",
    donorPhone: "",
    donorAddress: "",
    detailNote: "",
    amount: 0,
    paymentStatus: "pending",
    paidAt: "",
    attachmentUrl: "",
    notes: "",
  };
  editEntryId.value = null;
  entryErr.value = "";
}

function openCreateCampaign(): void {
  if (!canCreate.value) return;
  resetCampaignForm();
  openCampaignModal();
}

async function openEditCampaign(id: string): Promise<void> {
  if (!canUpdate.value) return;
  campaignErr.value = "";
  loadingCampaign.value = true;
  try {
    const json = await getAdminQzCampaign(id);
    if (!json.ok || !json.data) {
      toastError(json.error?.message || "Gagal memuat kampanye");
      return;
    }
    editCampaignId.value = json.data.id;
    campaignForm.value = {
      title: json.data.title,
      seasonTag: json.data.seasonTag as typeof campaignForm.value.seasonTag,
      hijriYear: json.data.hijriYear != null ? String(json.data.hijriYear) : "",
      dateStart: json.data.dateStart || "",
      dateEnd: json.data.dateEnd || "",
      status: json.data.status,
      description: json.data.description || "",
    };
    openCampaignModal();
  } catch {
    toastError("Tidak dapat menghubungi server");
  } finally {
    loadingCampaign.value = false;
  }
}

async function onSaveCampaign(): Promise<void> {
  campaignErr.value = "";
  if (campaignForm.value.title.trim().length < 2) {
    campaignErr.value = "Judul kampanye minimal 2 karakter.";
    return;
  }
  const hy = campaignForm.value.hijriYear.trim();
  let hijriYear: number | null | undefined = undefined;
  if (hy !== "") {
    const n = Number(hy);
    if (!Number.isFinite(n)) {
      campaignErr.value = "Tahun hijriah harus angka atau dikosongkan.";
      return;
    }
    hijriYear = n;
  } else {
    hijriYear = null;
  }

  savingCampaign.value = true;
  const body = {
    title: campaignForm.value.title.trim(),
    seasonTag: campaignForm.value.seasonTag,
    hijriYear,
    dateStart: campaignForm.value.dateStart || undefined,
    dateEnd: campaignForm.value.dateEnd || undefined,
    status: campaignForm.value.status,
    description: campaignForm.value.description.trim() || undefined,
  };
  try {
    if (editCampaignId.value) {
      const json = await patchAdminQzCampaign(editCampaignId.value, body);
      if (!json.ok) {
        campaignErr.value = json.error?.message || "Gagal menyimpan";
        return;
      }
      toastSuccess("Kampanye diperbarui.");
    } else {
      const json = await createAdminQzCampaign(body);
      if (!json.ok) {
        campaignErr.value = json.error?.message || "Gagal menambah kampanye";
        return;
      }
      toastSuccess("Kampanye ditambahkan.");
    }
    closeCampaignModal();
    reloadCampaigns();
    await refreshCampaignBrief();
  } catch {
    campaignErr.value = "Tidak dapat menghubungi server";
  } finally {
    savingCampaign.value = false;
  }
}

async function onDeleteCampaign(id: string): Promise<void> {
  if (!canDelete.value) return;
  if (!window.confirm("Hapus kampanye ini? Semua entri pembayaran di dalamnya ikut terhapus.")) return;
  try {
    const json = await deleteAdminQzCampaign(id);
    if (!json.ok) {
      toastError(json.error?.message || "Gagal menghapus");
      return;
    }
    toastSuccess("Kampanye dihapus.");
    reloadCampaigns();
    await refreshCampaignBrief();
    if (selectedCampaignId.value === id) selectedCampaignId.value = "";
  } catch {
    toastError("Tidak dapat menghubungi server");
  }
}

function openCreateEntry(): void {
  if (!canCreate.value || !selectedCampaignId.value) {
    toastError("Pilih musim/kampanye terlebih dahulu.");
    return;
  }
  resetEntryForm();
  openEntryModal();
}

async function openEditEntry(id: string): Promise<void> {
  if (!canUpdate.value) return;
  entryErr.value = "";
  loadingEntry.value = true;
  try {
    const json = await getAdminQzEntry(id);
    if (!json.ok || !json.data) {
      toastError(json.error?.message || "Gagal memuat entri");
      return;
    }
    editEntryId.value = json.data.id;
    financeTxDisplay.value = json.data.financeTransactionId?.trim() ?? "";
    entryForm.value = {
      entryKind: json.data.entryKind,
      donorName: json.data.donorName,
      donorPhone: json.data.donorPhone,
      donorAddress: json.data.donorAddress,
      detailNote: json.data.detailNote,
      amount: json.data.amount,
      paymentStatus: json.data.paymentStatus,
      paidAt: json.data.paidAt || "",
      attachmentUrl: json.data.attachmentUrl || "",
      notes: json.data.notes || "",
    };
    openEntryModal();
  } catch {
    toastError("Tidak dapat menghubungi server");
  } finally {
    loadingEntry.value = false;
  }
}

async function onPickEntryAttachment(ev: Event): Promise<void> {
  const t = ev.target;
  if (!(t instanceof HTMLInputElement) || !t.files?.[0]) return;
  const file = t.files[0];
  t.value = "";
  uploadingFile.value = true;
  try {
    const json = await uploadAdminFile(file);
    if (!json.ok || !json.data?.url) {
      toastError(json.error?.message || "Upload gagal");
      return;
    }
    entryForm.value.attachmentUrl = json.data.url;
    toastSuccess("Bukti berhasil diupload.");
  } catch {
    toastError("Tidak dapat menghubungi server");
  } finally {
    uploadingFile.value = false;
  }
}

async function onSaveEntry(): Promise<void> {
  entryErr.value = "";
  if (!selectedCampaignId.value && !editEntryId.value) {
    entryErr.value = "Pilih kampanye.";
    return;
  }
  if (entryForm.value.donorName.trim().length < 2) {
    entryErr.value = "Nama pewakaf/pembayar minimal 2 karakter.";
    return;
  }
  if (entryForm.value.amount < 0) {
    entryErr.value = "Nominal tidak valid.";
    return;
  }

  savingEntry.value = true;
  const payload = {
    campaignId: selectedCampaignId.value,
    entryKind: entryForm.value.entryKind,
    donorName: entryForm.value.donorName.trim(),
    donorPhone: entryForm.value.donorPhone.trim(),
    donorAddress: entryForm.value.donorAddress.trim(),
    detailNote: entryForm.value.detailNote.trim(),
    amount: entryForm.value.amount,
    paymentStatus: entryForm.value.paymentStatus,
    paidAt: entryForm.value.paidAt || undefined,
    attachmentUrl: entryForm.value.attachmentUrl.trim() || undefined,
    notes: entryForm.value.notes.trim(),
  };
  try {
    if (editEntryId.value) {
      const json = await patchAdminQzEntry(editEntryId.value, {
        entryKind: entryForm.value.entryKind,
        donorName: entryForm.value.donorName.trim(),
        donorPhone: entryForm.value.donorPhone.trim(),
        donorAddress: entryForm.value.donorAddress.trim(),
        detailNote: entryForm.value.detailNote.trim(),
        amount: entryForm.value.amount,
        paymentStatus: entryForm.value.paymentStatus,
        paidAt: entryForm.value.paidAt || undefined,
        attachmentUrl: entryForm.value.attachmentUrl.trim() || undefined,
        notes: entryForm.value.notes.trim(),
      });
      if (!json.ok) {
        entryErr.value = json.error?.message || "Gagal menyimpan";
        if (json.error?.code === "FINANCE_SYNC_FAILED") {
          toastError(json.error.message || "Sinkron kas gagal");
        }
        return;
      }
      toastSuccess("Entri diperbarui.");
    } else {
      const json = await createAdminQzEntry(payload);
      if (!json.ok) {
        entryErr.value = json.error?.message || "Gagal menambah entri";
        if (json.error?.code === "FINANCE_SYNC_FAILED") {
          toastError(json.error.message || "Sinkron kas gagal");
        }
        return;
      }
      toastSuccess("Entri ditambahkan.");
    }
    closeEntryModal();
    entriesTableRef.value?.reload();
  } catch {
    entryErr.value = "Tidak dapat menghubungi server";
  } finally {
    savingEntry.value = false;
  }
}

async function onDeleteEntry(id: string): Promise<void> {
  if (!canDelete.value) return;
  if (!window.confirm("Hapus entri ini?")) return;
  try {
    const json = await deleteAdminQzEntry(id);
    if (!json.ok) {
      toastError(json.error?.message || "Gagal menghapus");
      return;
    }
    toastSuccess("Entri dihapus.");
    entriesTableRef.value?.reload();
  } catch {
    toastError("Tidak dapat menghubungi server");
  }
}

function onDocClick(ev: MouseEvent): void {
  const t = ev.target;
  if (!(t instanceof Element)) return;
  const ce = t.closest(".cms-qz-campaign-edit");
  const cd = t.closest(".cms-qz-campaign-delete");
  const ee = t.closest(".cms-qz-entry-edit");
  const ed = t.closest(".cms-qz-entry-delete");

  if (ce || cd) {
    const root = campaignsTableRef.value?.getTableEl();
    const btn = ce ?? cd;
    if (!btn || !root?.contains(btn)) return;
    ev.preventDefault();
    const id = btn.getAttribute("data-id");
    if (!id) return;
    if (ce) void openEditCampaign(id);
    else void onDeleteCampaign(id);
    return;
  }

  if (ee || ed) {
    const root = entriesTableRef.value?.getTableEl();
    const btn = ee ?? ed;
    if (!btn || !root?.contains(btn)) return;
    ev.preventDefault();
    const id = btn.getAttribute("data-id");
    if (!id) return;
    if (ee) void openEditEntry(id);
    else void onDeleteEntry(id);
  }
}

const campaignColumns = computed((): unknown[] => [
  { field: "title", title: "Judul musim/kampanye", width: 220 },
  { field: "seasonTag", title: "Musim", width: 100 },
  { field: "hijriYear", title: "Th Hijriah", width: 90 },
  { field: "dateStart", title: "Mulai", width: 110 },
  { field: "dateEnd", title: "Selesai", width: 110 },
  {
    field: "status",
    title: "Status",
    width: 100,
    template(row: { status: string }) {
      const map: Record<string, string> = {
        draft: "kt-badge--metal",
        open: "kt-badge--success",
        closed: "kt-badge--secondary",
      };
      const cls = map[row.status] ?? "kt-badge--metal";
      return `<span class="kt-badge ${cls} kt-badge--inline">${row.status}</span>`;
    },
  },
  {
    field: "Actions",
    title: "Aksi",
    sortable: false,
    width: 90,
    template(row: { RecordID: string }) {
      const edit = canUpdate.value
        ? `<a href="javascript:;" class="btn btn-sm btn-clean btn-icon cms-qz-campaign-edit" data-id="${row.RecordID}"><i class="la la-edit"></i></a>`
        : "";
      const del = canDelete.value
        ? `<a href="javascript:;" class="btn btn-sm btn-clean btn-icon cms-qz-campaign-delete" data-id="${row.RecordID}"><i class="la la-trash"></i></a>`
        : "";
      return edit || del || '<span class="kt-font-muted">-</span>';
    },
  },
]);

const entryColumns = computed((): unknown[] => [
  { field: "donorName", title: "Nama", width: 160 },
  {
    field: "entryKind",
    title: "Jenis",
    width: 130,
    template(row: QzEntryRow) {
      const label = ENTRY_KIND_LABEL[row.entryKind] ?? row.entryKind;
      return `<span class="kt-badge kt-badge--inline kt-badge--outline kt-badge--outline-brand">${label}</span>`;
    },
  },
  {
    field: "amount",
    title: "Nominal",
    width: 130,
    template(row: QzEntryRow) {
      return money(row.amount);
    },
  },
  {
    field: "financeLinked",
    title: "Kas",
    width: 72,
    template(row: QzEntryRow) {
      return row.financeLinked
        ? '<span class="kt-badge kt-badge--success kt-badge--inline">Ya</span>'
        : '<span class="kt-font-muted">—</span>';
    },
  },
  {
    field: "paymentStatus",
    title: "Bayar",
    width: 100,
    template(row: QzEntryRow) {
      const map: Record<string, string> = {
        pending: "kt-badge--warning",
        partial: "kt-badge--brand",
        paid: "kt-badge--success",
        refunded: "kt-badge--secondary",
      };
      const cls = map[row.paymentStatus] ?? "kt-badge--metal";
      return `<span class="kt-badge ${cls} kt-badge--inline">${row.paymentStatus}</span>`;
    },
  },
  { field: "detailNote", title: "Rincian", width: 180 },
  {
    field: "Actions",
    title: "Aksi",
    sortable: false,
    width: 90,
    template(row: QzEntryRow) {
      const edit = canUpdate.value
        ? `<a href="javascript:;" class="btn btn-sm btn-clean btn-icon cms-qz-entry-edit" data-id="${row.RecordID}"><i class="la la-edit"></i></a>`
        : "";
      const del = canDelete.value
        ? `<a href="javascript:;" class="btn btn-sm btn-clean btn-icon cms-qz-entry-delete" data-id="${row.RecordID}"><i class="la la-trash"></i></a>`
        : "";
      return edit || del || '<span class="kt-font-muted">-</span>';
    },
  },
]);

onMounted(() => {
  document.addEventListener("click", onDocClick);
  void access.load();
  void refreshCampaignBrief();
});

onBeforeUnmount(() => {
  document.removeEventListener("click", onDocClick);
});
</script>

<template>
  <div class="row">
    <div class="col-12">
      <div class="kt-portlet kt-portlet--mobile kt-margin-b-20">
        <div class="kt-portlet__head kt-portlet__head--lg">
          <div class="kt-portlet__head-label">
            <span class="kt-portlet__head-icon"><i class="kt-font-brand flaticon2-box"></i></span>
            <h3 class="kt-portlet__head-title">Musim / kampanye</h3>
          </div>
          <div v-if="canCreate" class="kt-portlet__head-toolbar">
            <button type="button" class="btn btn-sm btn-brand" @click="openCreateCampaign">
              <i class="la la-plus"></i> Tambah musim
            </button>
          </div>
        </div>
        <div class="kt-portlet__body">
          <details class="border rounded bg-white" open>
            <summary class="px-3 py-2" style="list-style: none; cursor: pointer">
              <span class="kt-font-bolder">Petunjuk</span>
              <span class="kt-font-sm kt-font-muted"> — klik untuk tutup/buka</span>
            </summary>
            <div class="border-top px-3 py-3 bg-light kt-font-sm">
              Buat <strong>musim/kampanye</strong> dulu (mis. Idul Adha 1447 H, Ramadan 2026). Di bawah, pilih musim lalu catat
              <strong>pembayar</strong>, jenis (qurban / zakat fitrah / dll.), nominal, status pembayaran, dan bukti transfer opsional.
              Jika status <strong>paid</strong> dan nominal lebih dari nol, sistem mencatat <strong>pemasukan Kas Masjid</strong> otomatis
              (akun <code>INC-QURBAN-ZAKAT</code>, wallet <code>CASH-UTAMA</code>). Ubah ke selain paid atau nominal nol akan menghapus
              baris kas yang tertaut (jika ada).
            </div>
          </details>
        </div>
        <div class="kt-portlet__body kt-portlet__body--fit kt-padding-t-0">
          <KtRemoteDatatable
            ref="campaignsTableRef"
            table-id="qz_campaigns_datatable"
            read-path="/admin/program/qz/campaigns/datatable"
            search-placeholder="Cari judul musim, deskripsi…"
            search-hint="Daftar musim qurban & zakat."
            :columns="campaignColumns"
          />
        </div>
      </div>

      <div class="kt-portlet kt-portlet--mobile">
        <div class="kt-portlet__head kt-portlet__head--lg">
          <div class="kt-portlet__head-label">
            <span class="kt-portlet__head-icon"><i class="kt-font-brand la la-money"></i></span>
            <h3 class="kt-portlet__head-title">Entri pembayaran / pendaftaran</h3>
          </div>
          <div v-if="canCreate && selectedCampaignId" class="kt-portlet__head-toolbar">
            <button type="button" class="btn btn-sm btn-brand" @click="openCreateEntry">
              <i class="la la-plus"></i> Tambah entri
            </button>
          </div>
        </div>
        <div class="kt-portlet__body">
          <div class="form-group kt-margin-b-15">
            <label>Pilih musim/kampanye</label>
            <select v-model="selectedCampaignId" class="form-control" style="max-width: 28rem">
              <option value="">— Pilih —</option>
              <option v-for="c in campaignBriefList" :key="c.id" :value="c.id">
                {{ c.title }} ({{ c.status }})
              </option>
            </select>
            <span class="form-text text-muted">Daftar di atas akan terisi setelah ada kampanye; muat ulang halaman jika baru migrasi DB.</span>
          </div>
          <p v-if="!selectedCampaignId" class="kt-font-muted kt-margin-b-0">Pilih musim untuk menampilkan daftar entri.</p>
        </div>
        <div v-if="selectedCampaignId" class="kt-portlet__body kt-portlet__body--fit kt-padding-t-0">
          <KtRemoteDatatable
            ref="entriesTableRef"
            table-id="qz_entries_datatable"
            read-path="/admin/program/qz/entries/datatable"
            search-placeholder="Cari nama, HP, rincian…"
            search-hint="Entri untuk musim yang dipilih."
            :merge-request-body="entriesMergeBody"
            :columns="entryColumns"
          />
        </div>
      </div>

      <Teleport v-if="canMutateCampaign" to="body">
        <div id="cms_modal_qz_campaign" class="modal fade" tabindex="-1" role="dialog" aria-hidden="true">
          <div class="modal-dialog modal-lg" role="document">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">{{ editCampaignId ? "Ubah musim" : "Musim baru" }}</h5>
                <button type="button" class="close" data-dismiss="modal"><span>&times;</span></button>
              </div>
              <div class="modal-body">
                <p v-if="loadingCampaign" class="kt-font-muted">Memuat…</p>
                <template v-else>
                  <div v-if="campaignErr" class="alert alert-outline-danger fade show"><div class="alert-text">{{ campaignErr }}</div></div>
                  <div class="form-group"><label>Judul</label><input v-model="campaignForm.title" type="text" class="form-control" required /></div>
                  <div class="form-row">
                    <div class="form-group col-md-4">
                      <label>Musim</label>
                      <select v-model="campaignForm.seasonTag" class="form-control">
                        <option value="general">Umum</option>
                        <option value="ramadan">Ramadan</option>
                        <option value="idul_adha">Idul Adha</option>
                      </select>
                    </div>
                    <div class="form-group col-md-4">
                      <label>Tahun hijriah</label>
                      <input v-model="campaignForm.hijriYear" type="number" min="1300" max="1600" class="form-control" placeholder="Opsional" />
                    </div>
                    <div class="form-group col-md-4">
                      <label>Status</label>
                      <select v-model="campaignForm.status" class="form-control">
                        <option value="draft">draft</option>
                        <option value="open">open</option>
                        <option value="closed">closed</option>
                      </select>
                    </div>
                  </div>
                  <div class="form-row">
                    <div class="form-group col-md-6"><label>Tanggal mulai</label><input v-model="campaignForm.dateStart" type="date" class="form-control" /></div>
                    <div class="form-group col-md-6"><label>Tanggal selesai</label><input v-model="campaignForm.dateEnd" type="date" class="form-control" /></div>
                  </div>
                  <div class="form-group mb-0"><label>Deskripsi</label><textarea v-model="campaignForm.description" class="form-control" rows="3"></textarea></div>
                </template>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Batal</button>
                <button type="button" class="btn btn-brand" :disabled="savingCampaign || loadingCampaign" @click="onSaveCampaign">
                  {{ savingCampaign ? "Menyimpan…" : "Simpan" }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Teleport>

      <Teleport v-if="canMutateEntry" to="body">
        <div id="cms_modal_qz_entry" class="modal fade" tabindex="-1" role="dialog" aria-hidden="true">
          <div class="modal-dialog modal-lg" role="document">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">{{ editEntryId ? "Ubah entri" : "Entri baru" }}</h5>
                <button type="button" class="close" data-dismiss="modal"><span>&times;</span></button>
              </div>
              <div class="modal-body">
                <p v-if="loadingEntry" class="kt-font-muted">Memuat…</p>
                <template v-else>
                  <div v-if="entryErr" class="alert alert-outline-danger fade show"><div class="alert-text">{{ entryErr }}</div></div>
                  <p v-if="editEntryId && financeTxDisplay" class="form-text text-muted kt-margin-b-10">
                    Terekam di Kas:
                    <code class="kt-font-xs">{{ financeTxDisplay }}</code>
                    —
                    <RouterLink :to="{ name: 'finance-cash' }" class="kt-link kt-link--brand">buka Kas Masjid</RouterLink>
                  </p>
                  <div class="form-row">
                    <div class="form-group col-md-6">
                      <label>Jenis</label>
                      <select v-model="entryForm.entryKind" class="form-control">
                        <option value="qurban_adha">Qurban Idul Adha</option>
                        <option value="zakat_fitrah">Zakat fitrah</option>
                        <option value="zakat_mal">Zakat mal</option>
                        <option value="fidyah">Fidyah</option>
                        <option value="other">Lainnya</option>
                      </select>
                    </div>
                    <div class="form-group col-md-6">
                      <label>Status pembayaran</label>
                      <select v-model="entryForm.paymentStatus" class="form-control">
                        <option value="pending">pending</option>
                        <option value="partial">partial</option>
                        <option value="paid">paid</option>
                        <option value="refunded">refunded</option>
                      </select>
                      <span class="form-text text-muted">Hanya <strong>paid</strong> + nominal &gt; 0 yang membuat pemasukan kas otomatis.</span>
                    </div>
                  </div>
                  <div class="form-group"><label>Nama pembayar / muzakki</label><input v-model="entryForm.donorName" type="text" class="form-control" required /></div>
                  <div class="form-row">
                    <div class="form-group col-md-6"><label>No HP</label><input v-model="entryForm.donorPhone" type="text" class="form-control" /></div>
                    <div class="form-group col-md-3"><label>Nominal (Rp)</label><input v-model.number="entryForm.amount" type="number" min="0" class="form-control" /></div>
                    <div class="form-group col-md-3"><label>Tanggal lunas</label><input v-model="entryForm.paidAt" type="date" class="form-control" /></div>
                  </div>
                  <div class="form-group"><label>Alamat</label><textarea v-model="entryForm.donorAddress" class="form-control" rows="2"></textarea></div>
                  <div class="form-group">
                    <label>Rincian (bagian qurban, jumlah jiwa, dll.)</label>
                    <textarea v-model="entryForm.detailNote" class="form-control" rows="2"></textarea>
                  </div>
                  <div class="form-group">
                    <label>Bukti transfer (opsional)</label>
                    <input v-model="entryForm.attachmentUrl" type="text" class="form-control kt-margin-b-5" readonly placeholder="URL setelah upload" />
                    <div class="custom-file">
                      <input
                        id="qz_entry_attachment"
                        type="file"
                        class="custom-file-input"
                        accept=".pdf,.doc,.docx,image/*,application/pdf"
                        :disabled="uploadingFile"
                        @change="onPickEntryAttachment"
                      />
                      <label class="custom-file-label" for="qz_entry_attachment">{{ uploadingFile ? "Mengupload…" : "Upload bukti" }}</label>
                    </div>
                  </div>
                  <div class="form-group mb-0"><label>Catatan internal</label><textarea v-model="entryForm.notes" class="form-control" rows="2"></textarea></div>
                </template>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Batal</button>
                <button type="button" class="btn btn-brand" :disabled="savingEntry || loadingEntry" @click="onSaveEntry">
                  {{ savingEntry ? "Menyimpan…" : "Simpan" }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Teleport>
    </div>
  </div>
</template>
