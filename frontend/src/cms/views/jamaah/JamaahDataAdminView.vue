<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import {
  createAdminJamaahMember,
  deleteAdminJamaahMember,
  getAdminJamaahMember,
  patchAdminJamaahMember,
  type JamaahMemberRow,
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
const canCreate = computed(() => flags.value.canCreateJamaahData);
const canUpdate = computed(() => flags.value.canUpdateJamaahData);
const canDelete = computed(() => flags.value.canDeleteJamaahData);
const canMutate = computed(() => canCreate.value || canUpdate.value || canDelete.value);

const tableRef = ref<InstanceType<typeof KtRemoteDatatable> | null>(null);
const loading = ref(false);
const saving = ref(false);
const err = ref("");
const editId = ref<string | null>(null);

const form = ref({
  fullName: "",
  phone: "",
  email: "",
  gender: "" as "" | "male" | "female",
  birthDate: "",
  address: "",
  status: "active" as "active" | "inactive",
  category: "general" as "general" | "management" | "donor",
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
    phone: "",
    email: "",
    gender: "",
    birthDate: "",
    address: "",
    status: "active",
    category: "general",
    notes: "",
  };
  editId.value = null;
  err.value = "";
}
function openModal(): void {
  const $ = jq();
  const el = document.getElementById("cms_modal_jamaah_form");
  if (!$?.fn?.modal || !el) return;
  ($(el) as unknown as { modal: (a?: string) => void }).modal("show");
}
function closeModal(): void {
  const $ = jq();
  const el = document.getElementById("cms_modal_jamaah_form");
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
    const json = await getAdminJamaahMember(id);
    if (!json.ok || !json.data) {
      err.value = json.error?.message || "Gagal memuat data jamaah";
      return;
    }
    editId.value = json.data.id;
    form.value = {
      fullName: json.data.fullName,
      phone: json.data.phone,
      email: json.data.email,
      gender: json.data.gender,
      birthDate: json.data.birthDate,
      address: json.data.address,
      status: json.data.status,
      category: json.data.category,
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
  if (!window.confirm("Hapus data jamaah ini?")) return;
  try {
    const json = await deleteAdminJamaahMember(id);
    if (!json.ok) {
      window.alert(json.error?.message || "Gagal menghapus");
      return;
    }
    reloadTable();
  } catch {
    window.alert("Tidak dapat menghubungi server");
  }
}

async function onSubmit(): Promise<void> {
  err.value = "";
  if (form.value.fullName.trim().length < 2 || form.value.phone.trim().length < 6) {
    err.value = "Nama minimal 2 karakter dan nomor HP minimal 6 karakter.";
    return;
  }
  saving.value = true;
  const payload = {
    fullName: form.value.fullName.trim(),
    phone: form.value.phone.trim(),
    email: form.value.email.trim(),
    gender: form.value.gender,
    birthDate: form.value.birthDate,
    address: form.value.address.trim(),
    status: form.value.status,
    category: form.value.category,
    notes: form.value.notes.trim(),
  };
  try {
    if (editId.value) {
      const json = await patchAdminJamaahMember(editId.value, payload);
      if (!json.ok) {
        err.value = json.error?.message || "Gagal menyimpan perubahan";
        return;
      }
    } else {
      const json = await createAdminJamaahMember(payload);
      if (!json.ok) {
        err.value = json.error?.message || "Gagal membuat data jamaah";
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
  const editBtn = t.closest(".cms-jamaah-edit");
  const delBtn = t.closest(".cms-jamaah-delete");
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
  { field: "fullName", title: "Nama" },
  { field: "phone", title: "No HP", width: 140 },
  { field: "email", title: "Email", width: 220 },
  {
    field: "status",
    title: "Status",
    width: 120,
    template(row: JamaahMemberRow) {
      const cls = row.status === "active" ? "kt-badge--success" : "kt-badge--secondary";
      return `<span class="kt-badge ${cls} kt-badge--inline">${row.status}</span>`;
    },
  },
  { field: "category", title: "Kategori", width: 130 },
  {
    field: "Actions",
    title: "Actions",
    sortable: false,
    width: 90,
    template(row: JamaahMemberRow) {
      const edit = canUpdate.value
        ? `<a href="javascript:;" class="btn btn-sm btn-clean btn-icon cms-jamaah-edit" data-id="${row.RecordID}" title="Edit"><i class="la la-edit"></i></a>`
        : "";
      const del = canDelete.value
        ? `<a href="javascript:;" class="btn btn-sm btn-clean btn-icon cms-jamaah-delete" data-id="${row.RecordID}" title="Hapus"><i class="la la-trash"></i></a>`
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
            <span class="kt-portlet__head-icon"><i class="kt-font-brand flaticon-users"></i></span>
            <h3 class="kt-portlet__head-title">Data Jamaah</h3>
          </div>
          <div v-if="canCreate" class="kt-portlet__head-toolbar">
            <button type="button" class="btn btn-sm btn-brand" @click="openCreate">
              <i class="la la-plus"></i> Tambah jamaah
            </button>
          </div>
        </div>
        <div class="kt-portlet__body kt-portlet__body--fit">
          <KtRemoteDatatable
            ref="tableRef"
            table-id="jamaah_members_datatable"
            read-path="/admin/jamaah/members/datatable"
            search-placeholder="Cari nama, no hp, email…"
            search-hint="Master data jamaah untuk operasional modul jamaah."
            :columns="columns"
          />
        </div>
      </div>

      <Teleport v-if="canMutate" to="body">
        <div id="cms_modal_jamaah_form" class="modal fade" tabindex="-1" role="dialog" aria-hidden="true">
          <div class="modal-dialog modal-lg" role="document">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">{{ editId ? "Ubah data jamaah" : "Tambah data jamaah" }}</h5>
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
                  <form id="cms_form_jamaah" @submit.prevent="onSubmit">
                    <div class="form-group"><label>Nama lengkap</label><input v-model="form.fullName" type="text" class="form-control" required /></div>
                    <div class="form-group"><label>No HP</label><input v-model="form.phone" type="text" class="form-control" required /></div>
                    <div class="form-group"><label>Email</label><input v-model="form.email" type="email" class="form-control" /></div>
                    <div class="form-row">
                      <div class="form-group col-md-4">
                        <label>Gender</label>
                        <select v-model="form.gender" class="form-control"><option value="">-</option><option value="male">male</option><option value="female">female</option></select>
                      </div>
                      <div class="form-group col-md-4"><label>Tanggal lahir</label><input v-model="form.birthDate" type="date" class="form-control" /></div>
                      <div class="form-group col-md-4">
                        <label>Status</label>
                        <select v-model="form.status" class="form-control"><option value="active">active</option><option value="inactive">inactive</option></select>
                      </div>
                    </div>
                    <div class="form-group">
                      <label>Kategori</label>
                      <select v-model="form.category" class="form-control">
                        <option value="general">general</option>
                        <option value="management">management</option>
                        <option value="donor">donor</option>
                      </select>
                    </div>
                    <div class="form-group"><label>Alamat</label><textarea v-model="form.address" class="form-control" rows="2"></textarea></div>
                    <div class="form-group mb-0"><label>Catatan</label><textarea v-model="form.notes" class="form-control" rows="3"></textarea></div>
                  </form>
                </template>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Batal</button>
                <button type="submit" form="cms_form_jamaah" class="btn btn-brand" :disabled="saving">
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
