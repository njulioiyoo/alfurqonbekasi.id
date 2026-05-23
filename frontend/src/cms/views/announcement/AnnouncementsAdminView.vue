<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import {
  createAdminAnnouncement,
  deleteAdminAnnouncement,
  getAdminAnnouncement,
  patchAdminAnnouncement,
  postAdminAnnouncementWaBlast,
  type AnnouncementRow,
} from "../../api/admin.js";
import KtRemoteDatatable from "../../components/KtRemoteDatatable.vue";
import { useAccessStore } from "../../stores/access.js";
import { alertErrorDialog, confirmDeleteDialog } from "../../utils/sweetalert.js";

interface JQueryLite {
  fn?: {
    modal?: (...args: unknown[]) => unknown;
    datepicker?: (...args: unknown[]) => unknown;
  };
  modal?: (action?: string) => unknown;
  datepicker?: (...args: unknown[]) => JQueryLite;
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
      };
      (selector: Element | string): JQueryLite;
    };
  }
}

const access = useAccessStore();
const { flags: accessFlags } = storeToRefs(access);
const canCreate = computed(() => accessFlags.value.canCreateAnnouncement);
const canUpdate = computed(() => accessFlags.value.canUpdateAnnouncement);
const canDelete = computed(() => accessFlags.value.canDeleteAnnouncement);
const canAnyMutate = computed(() => canCreate.value || canUpdate.value || canDelete.value);

const tableRef = ref<InstanceType<typeof KtRemoteDatatable> | null>(null);

function waBlastBadgeClass(s: string): string {
  const map: Record<string, string> = {
    none: "kt-badge--metal",
    pending: "kt-badge--warning",
    sent: "kt-badge--success",
    failed: "kt-badge--danger",
    skipped: "kt-badge--secondary",
  };
  return map[s] ?? "kt-badge--metal";
}

const annColumns: unknown[] = [
  { field: "title", title: "Judul", width: 220 },
  { field: "slug", title: "Slug", width: 140 },
  {
    field: "status",
    title: "Status",
    width: 100,
    template(row: AnnouncementRow) {
      const map: Record<string, string> = {
        draft: "kt-badge--warning",
        published: "kt-badge--success",
        archived: "kt-badge--secondary",
      };
      const cls = map[row.status] ?? "kt-badge--metal";
      return `<span class="kt-badge ${cls} kt-badge--inline">${row.status}</span>`;
    },
  },
  { field: "validFrom", title: "Berlaku mulai", width: 110 },
  { field: "validUntil", title: "Berlaku s/d", width: 110 },
  {
    field: "waBlastStatus",
    title: "WA",
    width: 90,
    template(row: AnnouncementRow) {
      const cls = waBlastBadgeClass(row.waBlastStatus);
      return `<span class="kt-badge ${cls} kt-badge--inline">${row.waBlastStatus}</span>`;
    },
  },
  {
    field: "Actions",
    title: "Aksi",
    sortable: false,
    width: 100,
    overflow: "visible",
    autoHide: false,
    template(row: AnnouncementRow) {
      if (!canAnyMutate.value) return '<span class="kt-font-muted">—</span>';
      const id = row.RecordID;
      const editBtn = canUpdate.value
        ? `<a href="javascript:;" class="btn btn-sm btn-clean btn-icon cms-act-ann-edit" data-ann-id="${id}" title="Edit"><i class="la la-edit"></i></a>`
        : "";
      const delBtn = canDelete.value
        ? `<a href="javascript:;" class="btn btn-sm btn-clean btn-icon cms-act-ann-del" data-ann-id="${id}" data-ann-title="${escapeHtml(row.title)}" title="Hapus"><i class="la la-trash"></i></a>`
        : "";
      return `${editBtn}${delBtn}` || '<span class="kt-font-muted">—</span>';
    },
  },
];

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
  window.toastr.options = { closeButton: true, progressBar: true, timeOut: 4200 };
  window.toastr.error(message, "Gagal");
}

function openModal(): void {
  const $ = jq();
  const el = document.getElementById("cms_modal_announcement_form");
  if (!$?.fn?.modal || !el) return;
  ($(el) as { modal: (a?: string) => void }).modal("show");
  setTimeout(() => initDatepickers(), 0);
}

function closeModal(): void {
  const $ = jq();
  const el = document.getElementById("cms_modal_announcement_form");
  if (!$?.fn?.modal || !el) return;
  ($(el) as { modal: (a?: string) => void }).modal("hide");
}

function setupDateInput(
  el: HTMLInputElement | null,
  onPick: (yyyyMmDd: string) => void,
  currentYmd: string
): void {
  const $ = jq();
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
  ($el as unknown as { on?: (ev: string, cb: () => void) => void }).on?.("changeDate", () => {
    onPick(el.value.trim());
  });
  if (currentYmd) {
    el.value = currentYmd;
    $el.datepicker?.("update", currentYmd);
  } else {
    el.value = "";
  }
}

function initDatepickers(): void {
  const pub = form.value.publishedAt ? form.value.publishedAt.slice(0, 10) : "";
  setupDateInput(publishedAtInputRef.value, (v) => {
    form.value.publishedAt = v ? `${v}T00:00:00.000Z` : "";
  }, pub);
  setupDateInput(
    validFromInputRef.value,
    (v) => {
      form.value.validFrom = v;
    },
    form.value.validFrom
  );
  setupDateInput(
    validUntilInputRef.value,
    (v) => {
      form.value.validUntil = v;
    },
    form.value.validUntil
  );
}

function reloadTable(): void {
  tableRef.value?.reload();
}

const loading = ref(false);
const saving = ref(false);
const blasting = ref(false);
const err = ref("");
const editId = ref<string | null>(null);
const publishedAtInputRef = ref<HTMLInputElement | null>(null);
const validFromInputRef = ref<HTMLInputElement | null>(null);
const validUntilInputRef = ref<HTMLInputElement | null>(null);

const form = ref({
  title: "",
  slug: "",
  summary: "",
  body: "",
  status: "draft" as "draft" | "published" | "archived",
  publishedAt: "",
  validFrom: "",
  validUntil: "",
  priority: "normal" as "normal" | "high" | "urgent",
  waBlastOnPublish: false,
  waMessage: "",
  waRecipientPhonesText: "",
  waBlastStatus: "",
  waBlastLastError: "",
});

const modalTitle = computed(() => (editId.value ? "Ubah pengumuman" : "Pengumuman baru"));
const minSummary = 10;
const summaryLen = computed(() => form.value.summary.trim().length);

function resetForm(): void {
  form.value = {
    title: "",
    slug: "",
    summary: "",
    body: "",
    status: "draft",
    publishedAt: "",
    validFrom: "",
    validUntil: "",
    priority: "normal",
    waBlastOnPublish: false,
    waMessage: "",
    waRecipientPhonesText: "",
    waBlastStatus: "",
    waBlastLastError: "",
  };
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function phonesToText(phones: string[]): string {
  return phones.join("\n");
}

function openCreate(): void {
  if (!canCreate.value) return;
  editId.value = null;
  err.value = "";
  resetForm();
  openModal();
}

async function openEdit(id: string): Promise<void> {
  if (!canUpdate.value) return;
  editId.value = id;
  err.value = "";
  loading.value = true;
  openModal();
  try {
    const json = await getAdminAnnouncement(id);
    if (!json.ok || !json.data) {
      err.value = json.error?.message || "Gagal memuat pengumuman";
      return;
    }
    const d = json.data;
    form.value = {
      title: d.title,
      slug: d.slug,
      summary: d.summary,
      body: d.body ?? "",
      status: d.status,
      publishedAt: d.publishedAt ?? "",
      validFrom: d.validFrom ?? "",
      validUntil: d.validUntil ?? "",
      priority: (d.priority as "normal" | "high" | "urgent") || "normal",
      waBlastOnPublish: d.waBlastOnPublish,
      waMessage: d.waMessage ?? "",
      waRecipientPhonesText: phonesToText(d.waRecipientPhones ?? []),
      waBlastStatus: d.waBlastStatus ?? "",
      waBlastLastError: d.waBlastLastError ?? "",
    };
    setTimeout(() => initDatepickers(), 0);
  } catch {
    err.value = "Tidak dapat menghubungi server";
  } finally {
    loading.value = false;
  }
}

function buildPayload() {
  const phones = form.value.waRecipientPhonesText
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    title: form.value.title.trim(),
    slug: form.value.slug.trim() || slugify(form.value.title),
    summary: form.value.summary.trim(),
    body: form.value.body.trim(),
    status: form.value.status,
    publishedAt: form.value.publishedAt.trim(),
    validFrom: form.value.validFrom.trim(),
    validUntil: form.value.validUntil.trim(),
    priority: form.value.priority,
    waBlastOnPublish: form.value.waBlastOnPublish,
    waMessage: form.value.waMessage.trim(),
    waRecipientPhones: phones,
  };
}

async function onSave(): Promise<void> {
  err.value = "";
  saving.value = true;
  if (!form.value.title.trim()) {
    err.value = "Judul wajib diisi.";
    toastError(err.value);
    saving.value = false;
    return;
  }
  if (summaryLen.value < minSummary) {
    err.value = `Ringkasan wajib minimal ${minSummary} karakter.`;
    toastError(err.value);
    saving.value = false;
    return;
  }
  if (!form.value.validFrom.trim()) {
    err.value = "Tanggal mulai berlaku wajib diisi.";
    toastError(err.value);
    saving.value = false;
    return;
  }
  toastLoading("Menyimpan pengumuman…");
  const payload = buildPayload();
  try {
    if (!editId.value) {
      const json = await createAdminAnnouncement(payload);
      if (!json.ok) {
        err.value = json.error?.message || "Gagal menambah pengumuman";
        toastError(err.value);
        return;
      }
    } else {
      const json = await patchAdminAnnouncement(editId.value, payload);
      if (!json.ok) {
        err.value = json.error?.message || "Gagal menyimpan pengumuman";
        toastError(err.value);
        return;
      }
    }
    closeModal();
    reloadTable();
    toastSuccess("Pengumuman berhasil disimpan.");
  } catch {
    err.value = "Tidak dapat menghubungi server";
    toastError(err.value);
  } finally {
    saving.value = false;
  }
}

async function onManualWaBlast(): Promise<void> {
  if (!editId.value || !canUpdate.value) return;
  blasting.value = true;
  toastLoading("Mengirim blast WA…");
  try {
    const json = await postAdminAnnouncementWaBlast(editId.value);
    if (!json.ok) {
      toastError(json.error?.message || "Blast WA gagal");
      return;
    }
    form.value.waBlastStatus = json.data?.waBlastStatus ?? "";
    form.value.waBlastLastError = json.data?.waBlastLastError ?? "";
    reloadTable();
    toastSuccess(`Status blast: ${form.value.waBlastStatus}`);
  } catch {
    toastError("Tidak dapat menghubungi server");
  } finally {
    blasting.value = false;
  }
}

async function onDelete(id: string, title: string): Promise<void> {
  if (!canDelete.value) return;
  const ok = await confirmDeleteDialog({
    title: "Hapus pengumuman?",
    html: `Pengumuman <strong>${escapeHtml(title)}</strong> akan dihapus permanen.`,
  });
  if (!ok) return;
  toastLoading("Menghapus…");
  try {
    const json = await deleteAdminAnnouncement(id);
    if (!json.ok) {
      toastError(json.error?.message || "Gagal menghapus");
      return;
    }
    reloadTable();
    toastSuccess("Pengumuman berhasil dihapus.");
  } catch {
    await alertErrorDialog({ text: "Tidak dapat menghubungi server" });
  }
}

function onDocClick(ev: MouseEvent): void {
  const t = ev.target;
  if (!(t instanceof Element)) return;
  const editBtn = t.closest(".cms-act-ann-edit");
  const delBtn = t.closest(".cms-act-ann-del");
  const btn = editBtn ?? delBtn;
  const root = tableRef.value?.getTableEl();
  if (!btn || !root?.contains(btn)) return;
  ev.preventDefault();
  const id = btn.getAttribute("data-ann-id");
  if (!id) return;
  if (editBtn) void openEdit(id);
  else void onDelete(id, btn.getAttribute("data-ann-title") || id);
}

onMounted(() => {
  document.addEventListener("click", onDocClick);
  void access.load();
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
            <span class="kt-portlet__head-icon"><i class="kt-font-brand flaticon2-speaker"></i></span>
            <h3 class="kt-portlet__head-title">Pengumuman</h3>
          </div>
          <div v-if="canCreate" class="kt-portlet__head-toolbar">
            <button type="button" class="btn btn-sm btn-brand" @click="openCreate">
              <i class="la la-plus"></i> Tambah pengumuman
            </button>
          </div>
        </div>
        <div class="kt-portlet__body kt-portlet__body--fit">
          <KtRemoteDatatable
            ref="tableRef"
            table-id="announcements_datatable"
            read-path="/admin/announcements/datatable"
            search-placeholder="Cari judul, slug, ringkasan…"
            search-hint="Data di tabel announcements. Blast WA memakai webhook WHATSAPP_BLAST_WEBHOOK_URL di server."
            :columns="annColumns"
          />
        </div>
      </div>

      <Teleport v-if="canAnyMutate" to="body">
        <div id="cms_modal_announcement_form" class="modal fade" tabindex="-1" role="dialog" aria-hidden="true">
          <div class="modal-dialog modal-lg modal-dialog-scrollable" role="document">
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
                  <div class="row cms-ann-form-grid">
                    <div class="col-md-8">
                      <div class="form-group">
                        <label>Judul</label>
                        <input v-model="form.title" type="text" class="form-control" />
                      </div>
                    </div>
                    <div class="col-md-4">
                      <div class="form-group">
                        <label>Prioritas</label>
                        <select v-model="form.priority" class="form-control">
                          <option value="normal">normal</option>
                          <option value="high">high</option>
                          <option value="urgent">urgent</option>
                        </select>
                      </div>
                    </div>
                    <div class="col-md-6">
                      <div class="form-group">
                        <label>Slug</label>
                        <input v-model="form.slug" type="text" class="form-control" placeholder="auto dari judul jika kosong" />
                      </div>
                    </div>
                    <div class="col-md-3">
                      <div class="form-group">
                        <label>Status</label>
                        <select v-model="form.status" class="form-control">
                          <option value="draft">draft</option>
                          <option value="published">published</option>
                          <option value="archived">archived</option>
                        </select>
                      </div>
                    </div>
                    <div class="col-md-3">
                      <div class="form-group">
                        <label>Published At</label>
                        <input
                          ref="publishedAtInputRef"
                          type="text"
                          class="form-control"
                          placeholder="yyyy-mm-dd"
                          autocomplete="off"
                        />
                      </div>
                    </div>
                    <div class="col-md-6">
                      <div class="form-group">
                        <label>Berlaku mulai <span class="text-danger">*</span></label>
                        <input
                          ref="validFromInputRef"
                          type="text"
                          class="form-control"
                          placeholder="yyyy-mm-dd"
                          autocomplete="off"
                        />
                      </div>
                    </div>
                    <div class="col-md-6">
                      <div class="form-group">
                        <label>Berlaku sampai</label>
                        <input
                          ref="validUntilInputRef"
                          type="text"
                          class="form-control"
                          placeholder="kosong = tidak terbatas"
                          autocomplete="off"
                        />
                      </div>
                    </div>
                    <div class="col-12">
                      <div class="form-group">
                        <label>Ringkasan</label>
                        <textarea v-model="form.summary" class="form-control" rows="3"></textarea>
                        <div class="form-text text-right" :class="summaryLen >= minSummary ? 'kt-font-success' : 'kt-font-danger'">
                          {{ summaryLen }}/{{ minSummary }} karakter minimum
                        </div>
                      </div>
                    </div>
                    <div class="col-12">
                      <div class="form-group">
                        <label>Isi tambahan (opsional)</label>
                        <textarea v-model="form.body" class="form-control" rows="4" placeholder="Detail panjang jika perlu"></textarea>
                      </div>
                    </div>
                    <div class="col-12">
                      <label class="kt-checkbox">
                        <input v-model="form.waBlastOnPublish" type="checkbox" />
                        Blast WhatsApp saat status <strong>published</strong> (sekali otomatis; kirim ulang pakai tombol di bawah)
                        <span></span>
                      </label>
                    </div>
                    <div class="col-12">
                      <div class="form-group">
                        <label>Pesan WA (opsional)</label>
                        <textarea
                          v-model="form.waMessage"
                          class="form-control"
                          rows="2"
                          placeholder="Kosongkan = gabungan judul + ringkasan (+ isi tambahan)"
                        ></textarea>
                      </div>
                    </div>
                    <div class="col-12">
                      <div class="form-group">
                        <label>Nomor WhatsApp (satu baris per nomor, contoh 0812…)</label>
                        <textarea
                          v-model="form.waRecipientPhonesText"
                          class="form-control"
                          rows="3"
                          placeholder="62812xxxx&#10;62813xxxx"
                        ></textarea>
                      </div>
                    </div>
                    <div v-if="editId && (form.waBlastStatus || form.waBlastLastError)" class="col-12">
                      <div class="alert alert-light border" role="status">
                        <div><strong>Status blast:</strong> {{ form.waBlastStatus || "—" }}</div>
                        <div v-if="form.waBlastLastError" class="kt-font-danger kt-margin-t-5">
                          {{ form.waBlastLastError }}
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
              </div>
              <div class="modal-footer flex-wrap">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Tutup</button>
                <button
                  v-if="editId && form.status === 'published' && canUpdate"
                  type="button"
                  class="btn btn-outline-brand"
                  :disabled="loading || saving || blasting"
                  @click="onManualWaBlast"
                >
                  {{ blasting ? "Mengirim…" : "Kirim blast WA sekarang" }}
                </button>
                <button type="button" class="btn btn-brand" :disabled="loading || saving" @click="onSave">
                  {{ saving ? "Menyimpan…" : "Simpan" }}
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
.cms-ann-form-grid {
  margin-left: -0.6rem;
  margin-right: -0.6rem;
}

.cms-ann-form-grid > [class*="col-"] {
  padding-left: 0.6rem;
  padding-right: 0.6rem;
}

.cms-ann-form-grid .form-group {
  margin-bottom: 1rem;
}

#cms_modal_announcement_form .modal-body {
  padding: 1.5rem 1.75rem;
}
</style>
