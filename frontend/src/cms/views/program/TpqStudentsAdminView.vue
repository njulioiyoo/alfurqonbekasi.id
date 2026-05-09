<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import {
  createAdminTpqStudent,
  deleteAdminTpqStudent,
  getAdminTpqStudent,
  patchAdminTpqStudent,
  type TpqStudentRow,
} from "../../api/admin.js";
import KtRemoteDatatable from "../../components/KtRemoteDatatable.vue";
import { useAccessStore } from "../../stores/access.js";

interface JQueryLite {
  fn?: { modal?: (...args: unknown[]) => unknown };
  modal?: (action?: string) => unknown;
}

declare global {
  interface Window {
    jQuery?: {
      fn: { modal?: (...args: unknown[]) => unknown };
      (selector: Element | string): JQueryLite;
    };
  }
}

const access = useAccessStore();
const { flags } = storeToRefs(access);
const canCreate = computed(() => flags.value.canCreateProgramTpq);
const canUpdate = computed(() => flags.value.canUpdateProgramTpq);
const canDelete = computed(() => flags.value.canDeleteProgramTpq);
const canMutate = computed(() => canCreate.value || canUpdate.value || canDelete.value);

const tableRef = ref<InstanceType<typeof KtRemoteDatatable> | null>(null);
const loading = ref(false);
const saving = ref(false);
const err = ref("");
const editId = ref<string | null>(null);

const form = ref({
  fullName: "",
  nickname: "",
  birthDate: "",
  gender: "" as "" | "male" | "female",
  classLevel: "",
  parentName: "",
  parentPhone: "",
  address: "",
  enrollmentYear: "" as string,
  status: "active" as "active" | "inactive" | "graduated",
  notes: "",
});

function jq(): Window["jQuery"] {
  return window.jQuery;
}
function reloadTable(): void {
  tableRef.value?.reload();
}
function resetForm(): void {
  form.value = {
    fullName: "",
    nickname: "",
    birthDate: "",
    gender: "",
    classLevel: "",
    parentName: "",
    parentPhone: "",
    address: "",
    enrollmentYear: "",
    status: "active",
    notes: "",
  };
  editId.value = null;
  err.value = "";
}
function openModal(): void {
  const $ = jq();
  const el = document.getElementById("cms_modal_tpq_student_form");
  if (!$?.fn?.modal || !el) return;
  ($(el) as unknown as { modal: (a?: string) => void }).modal("show");
}
function closeModal(): void {
  const $ = jq();
  const el = document.getElementById("cms_modal_tpq_student_form");
  if (!$?.fn?.modal || !el) return;
  ($(el) as unknown as { modal: (a?: string) => void }).modal("hide");
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
    const json = await getAdminTpqStudent(id);
    if (!json.ok || !json.data) {
      err.value = json.error?.message || "Gagal memuat data santri";
      return;
    }
    editId.value = json.data.id;
    form.value = {
      fullName: json.data.fullName,
      nickname: json.data.nickname,
      birthDate: json.data.birthDate,
      gender: json.data.gender,
      classLevel: json.data.classLevel,
      parentName: json.data.parentName,
      parentPhone: json.data.parentPhone,
      address: json.data.address,
      enrollmentYear: json.data.enrollmentYear != null ? String(json.data.enrollmentYear) : "",
      status: json.data.status,
      notes: json.data.notes,
    };
    openModal();
  } catch {
    err.value = "Tidak dapat menghubungi server";
  } finally {
    loading.value = false;
  }
}

async function onDelete(id: string): Promise<void> {
  if (!canDelete.value) return;
  if (!window.confirm("Hapus data santri ini?")) return;
  try {
    const json = await deleteAdminTpqStudent(id);
    if (!json.ok) {
      window.alert(json.error?.message || "Gagal menghapus");
      return;
    }
    reloadTable();
  } catch {
    window.alert("Tidak dapat menghubungi server");
  }
}

function enrollmentPayload(): number | null | undefined {
  const s = form.value.enrollmentYear.trim();
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

async function onSubmit(): Promise<void> {
  err.value = "";
  if (form.value.fullName.trim().length < 2) {
    err.value = "Nama lengkap minimal 2 karakter.";
    return;
  }
  const enr = enrollmentPayload();
  if (enr === undefined) {
    err.value = "Tahun masuk harus angka valid atau dikosongkan.";
    return;
  }
  saving.value = true;
  const base = {
    fullName: form.value.fullName.trim(),
    nickname: form.value.nickname.trim(),
    birthDate: form.value.birthDate,
    gender: form.value.gender,
    classLevel: form.value.classLevel.trim(),
    parentName: form.value.parentName.trim(),
    parentPhone: form.value.parentPhone.trim(),
    address: form.value.address.trim(),
    enrollmentYear: enr,
    status: form.value.status,
    notes: form.value.notes.trim(),
  };
  try {
    if (editId.value) {
      const json = await patchAdminTpqStudent(editId.value, base);
      if (!json.ok) {
        err.value = json.error?.message || "Gagal menyimpan perubahan";
        return;
      }
    } else {
      const json = await createAdminTpqStudent(base);
      if (!json.ok) {
        err.value = json.error?.message || "Gagal menambah santri";
        return;
      }
    }
    closeModal();
    reloadTable();
  } catch {
    err.value = "Tidak dapat menghubungi server";
  } finally {
    saving.value = false;
  }
}

function onDocClick(ev: MouseEvent): void {
  const t = ev.target;
  if (!(t instanceof Element)) return;
  const editBtn = t.closest(".cms-tpq-edit");
  const delBtn = t.closest(".cms-tpq-delete");
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
  { field: "fullName", title: "Nama", width: 200 },
  { field: "nickname", title: "Panggilan", width: 120 },
  { field: "classLevel", title: "Kelas / level", width: 140 },
  { field: "parentPhone", title: "HP wali", width: 130 },
  {
    field: "status",
    title: "Status",
    width: 110,
    template(row: TpqStudentRow) {
      const map: Record<string, string> = {
        active: "kt-badge--success",
        inactive: "kt-badge--secondary",
        graduated: "kt-badge--brand",
      };
      const cls = map[row.status] ?? "kt-badge--metal";
      return `<span class="kt-badge ${cls} kt-badge--inline">${row.status}</span>`;
    },
  },
  { field: "enrollmentYear", title: "Thn masuk", width: 90 },
  {
    field: "Actions",
    title: "Aksi",
    sortable: false,
    width: 90,
    template(row: TpqStudentRow) {
      const edit = canUpdate.value
        ? `<a href="javascript:;" class="btn btn-sm btn-clean btn-icon cms-tpq-edit" data-id="${row.RecordID}" title="Edit"><i class="la la-edit"></i></a>`
        : "";
      const del = canDelete.value
        ? `<a href="javascript:;" class="btn btn-sm btn-clean btn-icon cms-tpq-delete" data-id="${row.RecordID}" title="Hapus"><i class="la la-trash"></i></a>`
        : "";
      return edit || del || '<span class="kt-font-muted">-</span>';
    },
  },
]);

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
            <span class="kt-portlet__head-icon"><i class="kt-font-brand flaticon2-open-book"></i></span>
            <h3 class="kt-portlet__head-title">TPQ / Madrasah — Data santri</h3>
          </div>
          <div v-if="canCreate" class="kt-portlet__head-toolbar">
            <button type="button" class="btn btn-sm btn-brand" @click="openCreate">
              <i class="la la-plus"></i> Tambah santri
            </button>
          </div>
        </div>
        <div class="kt-portlet__body">
          <details class="border rounded bg-white kt-margin-b-15" open>
            <summary class="px-3 py-2" style="list-style: none; cursor: pointer">
              <span class="kt-font-bolder">Petunjuk</span>
              <span class="kt-font-sm kt-font-muted"> — klik untuk menutup / buka</span>
            </summary>
            <div class="border-top px-3 py-3 bg-light">
              <p class="mb-2">
                Fase pertama: <strong>master data santri</strong> (nama, kelas, wali, tahun masuk). Absensi, nilai, dan
                pembayaran dapat ditambahkan pada pengembangan berikutnya.
              </p>
              <p class="mb-0 kt-font-sm kt-font-muted">
                Data disimpan di tabel <code>tpq_students</code>. Menu Program Sosial tetap memakai konten
                (<code>content_items</code>).
              </p>
            </div>
          </details>
        </div>
        <div class="kt-portlet__body kt-portlet__body--fit kt-padding-t-0">
          <KtRemoteDatatable
            ref="tableRef"
            table-id="tpq_students_datatable"
            read-path="/admin/program/tpq/students/datatable"
            search-placeholder="Cari nama, kelas, nama wali, no HP…"
            search-hint="Data santri TPQ / madrasah (fase 1)."
            :columns="columns"
          />
        </div>
      </div>

      <Teleport v-if="canMutate" to="body">
        <div id="cms_modal_tpq_student_form" class="modal fade" tabindex="-1" role="dialog" aria-hidden="true">
          <div class="modal-dialog modal-lg" role="document">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">{{ editId ? "Ubah data santri" : "Tambah santri" }}</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Tutup">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div class="modal-body">
                <p v-if="loading" class="kt-font-muted">Memuat…</p>
                <template v-else>
                  <div v-if="err" class="alert alert-outline-danger fade show" role="alert">
                    <div class="alert-text">{{ err }}</div>
                  </div>
                  <form id="cms_form_tpq_student" @submit.prevent="onSubmit">
                    <div class="form-row">
                      <div class="form-group col-md-8">
                        <label>Nama lengkap</label>
                        <input v-model="form.fullName" type="text" class="form-control" required />
                      </div>
                      <div class="form-group col-md-4">
                        <label>Nama panggilan</label>
                        <input v-model="form.nickname" type="text" class="form-control" />
                      </div>
                    </div>
                    <div class="form-row">
                      <div class="form-group col-md-4">
                        <label>Kelas / level</label>
                        <input v-model="form.classLevel" type="text" class="form-control" placeholder="contoh: TPQ A" />
                      </div>
                      <div class="form-group col-md-4">
                        <label>Tanggal lahir</label>
                        <input v-model="form.birthDate" type="date" class="form-control" />
                      </div>
                      <div class="form-group col-md-4">
                        <label>Gender</label>
                        <select v-model="form.gender" class="form-control">
                          <option value="">-</option>
                          <option value="male">Laki-laki</option>
                          <option value="female">Perempuan</option>
                        </select>
                      </div>
                    </div>
                    <div class="form-row">
                      <div class="form-group col-md-6">
                        <label>Nama wali</label>
                        <input v-model="form.parentName" type="text" class="form-control" />
                      </div>
                      <div class="form-group col-md-3">
                        <label>No HP wali</label>
                        <input v-model="form.parentPhone" type="text" class="form-control" />
                      </div>
                      <div class="form-group col-md-3">
                        <label>Tahun masuk</label>
                        <input v-model="form.enrollmentYear" type="number" min="1990" max="2100" class="form-control" placeholder="opsional" />
                      </div>
                    </div>
                    <div class="form-group">
                      <label>Alamat</label>
                      <textarea v-model="form.address" class="form-control" rows="2"></textarea>
                    </div>
                    <div class="form-row">
                      <div class="form-group col-md-6">
                        <label>Status</label>
                        <select v-model="form.status" class="form-control">
                          <option value="active">Aktif</option>
                          <option value="inactive">Nonaktif</option>
                          <option value="graduated">Lulus</option>
                        </select>
                      </div>
                    </div>
                    <div class="form-group mb-0">
                      <label>Catatan</label>
                      <textarea v-model="form.notes" class="form-control" rows="2"></textarea>
                    </div>
                  </form>
                </template>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Batal</button>
                <button type="submit" form="cms_form_tpq_student" class="btn btn-brand" :disabled="saving">
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
