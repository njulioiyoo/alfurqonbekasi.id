<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import {
  createAdminPermission,
  deleteAdminPermission,
  getAdminPermission,
  patchAdminPermission,
} from "../../api/admin.js";
import KtRemoteDatatable from "../../components/KtRemoteDatatable.vue";
import { useAccessStore } from "../../stores/access.js";
import { alertErrorDialog, confirmDeleteDialog, escapeHtmlForSwal } from "../../utils/sweetalert.js";

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

interface PermissionRow {
  RecordID: string;
  name: string;
  guardName: string;
  roleCount: number;
  createdAt: string;
}

const access = useAccessStore();
const { flags: accessFlags } = storeToRefs(access);

const canCreatePermission = computed(() => accessFlags.value.canCreatePermission);
const canUpdatePermission = computed(() => accessFlags.value.canUpdatePermission);
const canDeletePermission = computed(() => accessFlags.value.canDeletePermission);
const canAnyPermissionCrud = computed(
  () => canCreatePermission.value || canUpdatePermission.value || canDeletePermission.value
);

const permTableRef = ref<InstanceType<typeof KtRemoteDatatable> | null>(null);

const permColumns: unknown[] = [
  {
    field: "name",
    title: "Permission",
    width: 220,
    template(row: PermissionRow) {
      const n = row.name || "";
      return `<span class="kt-font-mono kt-font-sm">${escapeHtml(n)}</span>`;
    },
  },
  {
    field: "guardName",
    title: "Guard",
    width: 90,
    textAlign: "center",
  },
  {
    field: "roleCount",
    title: "Jumlah role",
    width: 110,
    textAlign: "center",
    type: "number",
  },
  {
    field: "createdAt",
    title: "Dibuat",
    width: 160,
    template(row: PermissionRow) {
      try {
        return new Date(row.createdAt).toLocaleString("id-ID");
      } catch {
        return row.createdAt;
      }
    },
  },
  {
    field: "Actions",
    title: "Aksi",
    sortable: false,
    width: 120,
    overflow: "visible",
    autoHide: false,
    template(row: PermissionRow) {
      if (!canAnyPermissionCrud.value) {
        return '<span class="kt-font-muted kt-font-sm">—</span>';
      }
      if (row.name === "manage:all") {
        return '<span class="kt-font-muted kt-font-sm" title="Permission sistem">Terkunci</span>';
      }
      const id = escapeAttr(row.RecordID);
      const editBtn = canUpdatePermission.value
        ? `<a href="javascript:;" class="btn btn-sm btn-clean btn-icon btn-icon-md cms-act-perm-edit" title="Ubah" data-perm-id="${id}"><i class="la la-edit"></i></a>`
        : "";
      const delBtn = canDeletePermission.value
        ? `<a href="javascript:;" class="btn btn-sm btn-clean btn-icon btn-icon-md cms-act-perm-del" title="Hapus" data-perm-id="${id}" data-perm-name="${escapeAttr(row.name)}"><i class="la la-trash"></i></a>`
        : "";
      if (!editBtn && !delBtn) return '<span class="kt-font-muted kt-font-sm">—</span>';
      return `<span class="cms-perm-actions">${editBtn}${delBtn}</span>`;
    },
  },
];

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}

function jq(): Window["jQuery"] {
  return window.jQuery;
}

function openPermModalEl(): void {
  const $ = jq();
  const el = document.getElementById("cms_modal_permission_form");
  if (!$?.fn?.modal || !el) return;
  ($(el) as { modal: (a?: string) => void }).modal("show");
}

function closePermModalEl(): void {
  const $ = jq();
  const el = document.getElementById("cms_modal_permission_form");
  if (!$?.fn?.modal || !el) return;
  ($(el) as { modal: (a?: string) => void }).modal("hide");
}

function reloadPermTable(): void {
  permTableRef.value?.reload();
}

const permModalLoading = ref(false);
const permModalSaving = ref(false);
const permModalError = ref("");
const permEditId = ref<string | null>(null);
const permFormName = ref("");
const permFormGuard = ref("web");
const permFormMeta = ref("");

const permModalTitle = computed(() => (permEditId.value ? "Ubah permission" : "Permission baru"));

function openCreatePermission(): void {
  if (!canCreatePermission.value) return;
  permModalError.value = "";
  permEditId.value = null;
  permFormName.value = "";
  permFormGuard.value = "web";
  permFormMeta.value = "";
  openPermModalEl();
}

async function openEditPermission(id: string): Promise<void> {
  if (!canUpdatePermission.value) return;
  permModalError.value = "";
  permEditId.value = id;
  permModalLoading.value = true;
  openPermModalEl();
  try {
    const json = await getAdminPermission(id);
    if (!json.ok || !json.data) {
      permModalError.value = json.error?.message || "Gagal memuat permission";
      permFormMeta.value = "";
      return;
    }
    permFormName.value = json.data.name;
    permFormGuard.value = json.data.guardName || "web";
    permFormMeta.value =
      json.data.roleCount > 0
        ? `Dipakai ${json.data.roleCount} role — mengubah nama ikut pivot (ID tidak berubah).`
        : "Belum dipakai role mana pun.";
  } catch {
    permModalError.value = "Tidak dapat menghubungi server";
    permFormMeta.value = "";
  } finally {
    permModalLoading.value = false;
  }
}

async function savePermission(): Promise<void> {
  permModalError.value = "";
  permModalSaving.value = true;
  const name = permFormName.value.trim();
  const guardName = permFormGuard.value.trim() || "web";
  try {
    if (!permEditId.value) {
      if (!canCreatePermission.value) {
        permModalError.value = "Anda tidak punya izin menambah permission";
        return;
      }
      const json = await createAdminPermission({ name, guardName });
      if (!json.ok) {
        permModalError.value = json.error?.message || "Gagal menambah";
        return;
      }
    } else {
      if (!canUpdatePermission.value) {
        permModalError.value = "Anda tidak punya izin mengubah permission";
        return;
      }
      const json = await patchAdminPermission(permEditId.value, { name, guardName });
      if (!json.ok) {
        permModalError.value = json.error?.message || "Gagal menyimpan";
        return;
      }
    }
    closePermModalEl();
    reloadPermTable();
    void access.load();
  } catch {
    permModalError.value = "Tidak dapat menghubungi server";
  } finally {
    permModalSaving.value = false;
  }
}

async function confirmDeletePermission(id: string, displayName: string): Promise<void> {
  const ok = await confirmDeleteDialog({
    title: "Hapus permission?",
    html: `Permission <strong>${escapeHtmlForSwal(displayName)}</strong> akan dihapus. Pivot role terkait ikut terhapus.`,
  });
  if (!ok) return;
  permModalError.value = "";
  try {
    const json = await deleteAdminPermission(id);
    if (!json.ok) {
      await alertErrorDialog({ text: json.error?.message || "Gagal menghapus" });
      return;
    }
    reloadPermTable();
    void access.load();
  } catch {
    await alertErrorDialog({ text: "Tidak dapat menghubungi server" });
  }
}

function onPermDocClick(ev: MouseEvent): void {
  const t = ev.target;
  if (!(t instanceof Element)) return;
  const editBtn = t.closest(".cms-act-perm-edit");
  const delBtn = t.closest(".cms-act-perm-del");
  const root = permTableRef.value?.getTableEl();
  const btn = editBtn ?? delBtn;
  if (!btn || !root?.contains(btn)) return;
  ev.preventDefault();
  const id = btn.getAttribute("data-perm-id");
  if (!id) return;
  if (editBtn) {
    if (!canUpdatePermission.value) return;
    void openEditPermission(id);
  }
  else {
    if (!canDeletePermission.value) return;
    const name = btn.getAttribute("data-perm-name") || id;
    void confirmDeletePermission(id, name);
  }
}

onMounted(() => {
  document.addEventListener("click", onPermDocClick);
  void access.load();
});

onBeforeUnmount(() => {
  document.removeEventListener("click", onPermDocClick);
});
</script>

<template>
  <div class="row">
    <div class="col-12">
      <div class="kt-portlet kt-portlet--mobile">
        <div class="kt-portlet__head kt-portlet__head--lg">
          <div class="kt-portlet__head-label">
            <span class="kt-portlet__head-icon">
              <i class="kt-font-brand flaticon2-list"></i>
            </span>
            <h3 class="kt-portlet__head-title">Permission</h3>
          </div>
          <div v-if="canCreatePermission" class="kt-portlet__head-toolbar">
            <button type="button" class="btn btn-sm btn-brand" @click="openCreatePermission">
              <i class="la la-plus"></i> Tambah permission
            </button>
          </div>
        </div>
        <div class="kt-portlet__body kt-portlet__body--fit">
          <KtRemoteDatatable
            ref="permTableRef"
            table-id="permissions_datatable"
            read-path="/admin/permissions/datatable"
            search-placeholder="Cari nama permission atau guard…"
            search-hint="Format nama: aksi:Subjek (contoh read:Article). Aksi mengikuti permission per-user: create/update/delete:Permission. manage:all tetap terkunci."
            :columns="permColumns"
          />
        </div>
      </div>

      <Teleport v-if="canAnyPermissionCrud" to="body">
        <div
          id="cms_modal_permission_form"
          class="modal fade"
          tabindex="-1"
          role="dialog"
          aria-hidden="true"
        >
          <div class="modal-dialog" role="document">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">{{ permModalTitle }}</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Tutup">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div class="modal-body">
                <p v-if="permModalLoading" class="kt-font-muted">Memuat…</p>
                <template v-else>
                  <div
                    v-if="permModalError"
                    class="alert alert-outline-danger fade show kt-margin-b-15"
                    role="alert"
                  >
                    <div class="alert-text">{{ permModalError }}</div>
                  </div>
                  <p v-if="permFormMeta" class="kt-font-sm kt-font-muted kt-margin-b-15">{{ permFormMeta }}</p>
                  <div class="form-group">
                    <label class="col-form-label">Nama permission</label>
                    <input
                      v-model="permFormName"
                      type="text"
                      class="form-control"
                      placeholder="contoh read:Banner"
                      autocomplete="off"
                    />
                    <span class="form-text text-muted kt-font-sm"
                      >Huruf kecil untuk aksi, lalu `:`, lalu subjek (tanpa spasi).</span
                    >
                  </div>
                  <div class="form-group kt-margin-b-0">
                    <label class="col-form-label">Guard</label>
                    <input v-model="permFormGuard" type="text" class="form-control" placeholder="web" />
                  </div>
                </template>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Tutup</button>
                <button
                  type="button"
                  class="btn btn-brand"
                  :disabled="permModalLoading || permModalSaving || !permFormName.trim()"
                  @click="savePermission"
                >
                  {{ permModalSaving ? "Menyimpan…" : "Simpan" }}
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
.cms-perm-actions {
  white-space: nowrap;
}
</style>
