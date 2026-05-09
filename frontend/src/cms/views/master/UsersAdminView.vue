<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import {
  createAdminUser,
  deleteAdminUser,
  getAdminUser,
  getAssignableRoles,
  patchAdminUser,
} from "../../api/admin.js";
import KtRemoteDatatable from "../../components/KtRemoteDatatable.vue";
import { storeToRefs } from "pinia";
import { useAuthStore } from "../../stores/auth.js";
import { useAccessStore } from "../../stores/access.js";

interface JQueryLite {
  fn?: { modal?: (...args: unknown[]) => unknown };
  modal?: (action?: string) => unknown;
}

declare global {
  interface Window {
    jQuery?: {
      fn: {
        KTDatatable?: (...args: unknown[]) => unknown;
        modal?: (...args: unknown[]) => unknown;
      };
      (selector: Element | string): JQueryLite;
    };
  }
}

const auth = useAuthStore();
const { user } = storeToRefs(auth);
const access = useAccessStore();
const { flags: accessFlags } = storeToRefs(access);

const canCreate = computed(() => accessFlags.value.canCreateUser);
const canUpdateUser = computed(() => accessFlags.value.canUpdateUser);
const canDeleteUser = computed(() => accessFlags.value.canDeleteUser);
const canEditUsers = computed(() => canUpdateUser.value || canDeleteUser.value);

const userTableRef = ref<InstanceType<typeof KtRemoteDatatable> | null>(null);

/** Bootstrap `.modal('hide')` / event — satu kali pasang listener. */
let createModalHooksBound = false;
let editModalHooksBound = false;

const creating = ref(false);
const createError = ref("");
const newEmail = ref("");
const newPassword = ref("");
const newFullName = ref("");
const assignableRoles = ref<string[]>(["user", "admin"]);
const newRole = ref("user");

const editSaving = ref(false);
const editError = ref("");
const editUserId = ref("");
const editEmail = ref("");
const editFullName = ref("");
const editRole = ref("user");
const editPassword = ref("");

function jq(): Window["jQuery"] {
  return window.jQuery;
}

interface JQueryModalish {
  on(evt: string, fn: () => void): unknown;
  modal(action?: string): unknown;
}

function closeCreateUserModal(): void {
  const $ = jq();
  const el = document.getElementById("cms_modal_create_user");
  if (!$?.fn?.modal || !el) return;
  ($(el) as unknown as JQueryModalish).modal("hide");
}

function bindCreateUserModalHooks(): void {
  if (createModalHooksBound || !canCreate.value) return;
  const $ = jq();
  const el = document.getElementById("cms_modal_create_user");
  if (!$?.fn?.modal || !el) return;
  createModalHooksBound = true;
  ($(el) as unknown as JQueryModalish).on("hidden.bs.modal", () => {
    createError.value = "";
  });
}

function closeEditUserModal(): void {
  const $ = jq();
  const el = document.getElementById("cms_modal_edit_user");
  if (!$?.fn?.modal || !el) return;
  ($(el) as unknown as JQueryModalish).modal("hide");
}

function openEditUserModal(): void {
  const $ = jq();
  const el = document.getElementById("cms_modal_edit_user");
  if (!$?.fn?.modal || !el) return;
  ($(el) as unknown as JQueryModalish).modal("show");
}

function bindEditUserModalHooks(): void {
  if (editModalHooksBound || !canEditUsers.value) return;
  const $ = jq();
  const el = document.getElementById("cms_modal_edit_user");
  if (!$?.fn?.modal || !el) return;
  editModalHooksBound = true;
  ($(el) as unknown as JQueryModalish).on("hidden.bs.modal", () => {
    editError.value = "";
    editPassword.value = "";
  });
}

function reloadUsersTable(): void {
  userTableRef.value?.reload();
}

function onUsersDatatableDocClick(ev: MouseEvent): void {
  const t = ev.target;
  if (!(t instanceof Element)) return;
  const el = t.closest(".cms-act-edit, .cms-act-delete");
  const root = userTableRef.value?.getTableEl();
  if (!el || !root?.contains(el)) return;
  ev.preventDefault();
  const id = el.getAttribute("data-user-id");
  if (!id) return;
  if (el.classList.contains("cms-act-delete")) {
    void confirmDeleteUser(id);
    return;
  }
  void loadAndShowEditUser(id);
}

async function loadAndShowEditUser(id: string): Promise<void> {
  editError.value = "";
  try {
    const json = await getAdminUser(id);
    if (!json.ok || !json.data) {
      window.alert(json.error?.message || "Gagal memuat pengguna");
      return;
    }
    const d = json.data;
    editUserId.value = d.id;
    editEmail.value = d.email;
    editFullName.value = d.fullName ?? "";
    editRole.value = d.role;
    editPassword.value = "";
    openEditUserModal();
  } catch {
    window.alert("Tidak dapat menghubungi server");
  }
}

async function confirmDeleteUser(id: string): Promise<void> {
  if (!window.confirm("Hapus pengguna ini? Tindakan tidak dapat dibatalkan.")) return;
  try {
    const json = await deleteAdminUser(id);
    if (!json.ok) {
      window.alert(json.error?.message || "Gagal menghapus");
      return;
    }
    reloadUsersTable();
  } catch {
    window.alert("Tidak dapat menghubungi server");
  }
}

async function onEditSubmit(): Promise<void> {
  editError.value = "";
  const pw = editPassword.value.trim();
  if (pw.length > 0 && pw.length < 8) {
    editError.value = "Password baru minimal 8 karakter atau kosongkan.";
    return;
  }
  editSaving.value = true;
  try {
    const body: {
      fullName?: string | null;
      role?: string;
      password?: string;
    } = {
      fullName: editFullName.value.trim() || null,
    };
    if (editRole.value !== "superadmin" && assignableRoles.value.includes(editRole.value)) {
      body.role = editRole.value;
    }
    if (pw.length >= 8) body.password = pw;

    const json = await patchAdminUser(editUserId.value, body);
    if (!json.ok) {
      editError.value = json.error?.message || "Gagal menyimpan";
      return;
    }
    closeEditUserModal();
    reloadUsersTable();
  } catch {
    editError.value = "Tidak dapat menghubungi server";
  } finally {
    editSaving.value = false;
  }
}

interface DatatableUserRow {
  RecordID: string;
  email: string;
  fullName: string;
  role: string;
  createdAt: string;
}

/** Kolom KTDatatable — dibangun sekali; `template` membaca store saat render baris. */
const userColumns: unknown[] = [
  {
    field: "email",
    title: "Email",
    width: 220,
  },
  {
    field: "fullName",
    title: "Nama",
  },
  {
    field: "role",
    title: "Role",
    width: 120,
    template(row: DatatableUserRow) {
      const map: Record<string, { title: string; cls: string }> = {
        superadmin: { title: "Super Admin", cls: "kt-badge--danger" },
        admin: { title: "Admin", cls: "kt-badge--brand" },
        user: { title: "User", cls: "kt-badge--success" },
      };
      const m = map[row.role] ?? { title: row.role, cls: "kt-badge--metal" };
      return `<span class="kt-badge ${m.cls} kt-badge--inline kt-badge--pill">${m.title}</span>`;
    },
  },
  {
    field: "createdAt",
    title: "Dibuat",
    width: 160,
    template(row: DatatableUserRow) {
      try {
        return new Date(row.createdAt).toLocaleString("id-ID");
      } catch {
        return row.createdAt;
      }
    },
  },
  {
    field: "Actions",
    title: "Actions",
    sortable: false,
    width: 110,
    overflow: "visible",
    autoHide: false,
    template(row: DatatableUserRow) {
      const actor = user.value?.role;
      const lockedSuperadmin = row.role === "superadmin" && actor !== "superadmin";
      if (lockedSuperadmin || (!canUpdateUser.value && !canDeleteUser.value)) {
        return '<span class="kt-font-muted kt-font-sm">—</span>';
      }
      const id = row.RecordID;
      const hideDelete = id === user.value?.id;
      const deleteBtn =
        !canDeleteUser.value || hideDelete
          ? ""
          : `<a href="javascript:;" class="btn btn-sm btn-clean btn-icon btn-icon-md cms-act-delete" title="Hapus" data-user-id="${id}"><i class="la la-trash"></i></a>`;
      const editBtn = canUpdateUser.value
        ? `<a href="javascript:;" class="btn btn-sm btn-clean btn-icon btn-icon-md cms-act-edit" title="Ubah" data-user-id="${id}"><i class="la la-edit"></i></a>`
        : "";
      return `<div class="dropdown d-inline-block">
							<a href="javascript:;" class="btn btn-sm btn-clean btn-icon btn-icon-md" data-toggle="dropdown"><i class="la la-cog"></i></a>
						  	<div class="dropdown-menu dropdown-menu-right">
						    	<a class="dropdown-item cms-act-edit" href="javascript:;" data-user-id="${id}"><i class="la la-edit"></i> Edit Details</a>
						    	<a class="dropdown-item" href="javascript:;"><i class="la la-leaf"></i> Update Status</a>
						    	<a class="dropdown-item" href="javascript:;"><i class="la la-print"></i> Generate Report</a>
						  	</div>
						</div>
						${editBtn}
						${deleteBtn}`;
    },
  },
];

async function loadAssignableRoles(): Promise<void> {
  try {
    const json = await getAssignableRoles();
    if (json.ok && json.data?.names?.length) {
      assignableRoles.value = json.data.names;
      if (!assignableRoles.value.includes(newRole.value)) {
        newRole.value = assignableRoles.value[0] ?? "user";
      }
    }
  } catch {
    /* fallback assignableRoles default */
  }
}

onMounted(() => {
  document.addEventListener("click", onUsersDatatableDocClick);
  void access.load();
  void loadAssignableRoles();
  void Promise.resolve().then(() => {
    requestAnimationFrame(() => {
      bindCreateUserModalHooks();
      bindEditUserModalHooks();
    });
  });
});

onBeforeUnmount(() => {
  document.removeEventListener("click", onUsersDatatableDocClick);
  createModalHooksBound = false;
  editModalHooksBound = false;
});

async function onCreateSubmit(): Promise<void> {
  createError.value = "";
  const email = newEmail.value.trim();
  if (!email || newPassword.value.length < 8) {
    createError.value = "Email wajib diisi dan password minimal 8 karakter.";
    return;
  }
  creating.value = true;
  try {
    const payload: Parameters<typeof createAdminUser>[0] = {
      email,
      password: newPassword.value,
      role: newRole.value,
    };
    const fn = newFullName.value.trim();
    if (fn) payload.fullName = fn;

    const json = await createAdminUser(payload);
    if (!json.ok) {
      createError.value = json.error?.message || "Gagal membuat pengguna";
      return;
    }
    closeCreateUserModal();
    newEmail.value = "";
    newPassword.value = "";
    newFullName.value = "";
    newRole.value = "user";
    reloadUsersTable();
  } catch {
    createError.value = "Tidak dapat menghubungi server";
  } finally {
    creating.value = false;
  }
}
</script>

<template>
  <div class="row">
    <div class="col-12">
      <!-- Pola: theme/classic/demo1/crud/metronic-datatable/base/data-local.html — satu portlet, form filter + datatable. -->
      <div class="kt-portlet kt-portlet--mobile">
        <div class="kt-portlet__head kt-portlet__head--lg">
          <div class="kt-portlet__head-label">
            <span class="kt-portlet__head-icon">
              <i class="kt-font-brand flaticon2-line-chart"></i>
            </span>
            <h3 class="kt-portlet__head-title">Pengguna</h3>
          </div>
          <div v-if="canCreate" class="kt-portlet__head-toolbar">
            <div class="kt-portlet__head-wrapper">
              <button
                type="button"
                class="btn btn-brand btn-sm"
                data-toggle="modal"
                data-target="#cms_modal_create_user"
              >
                <i class="flaticon2-plus"></i>
                Tambah pengguna
              </button>
            </div>
          </div>
        </div>

        <div class="kt-portlet__body kt-portlet__body--fit">
          <KtRemoteDatatable
            ref="userTableRef"
            table-id="users_datatable"
            read-path="/admin/users/datatable"
            search-placeholder="Cari email, nama, role…"
            search-hint="Baris diambil dari database. Tabel kosong berarti belum ada pengguna yang cocok filter/pencarian (atau ada error API)."
            :columns="userColumns"
          />
        </div>
      </div>

      <!-- Large modal — pola demo1/components/base/modal.html (`modal-dialog modal-lg`) -->
      <Teleport to="body">
        <div
          v-if="canCreate"
          id="cms_modal_create_user"
          class="modal fade"
          tabindex="-1"
          role="dialog"
          aria-labelledby="cms_modal_create_user_title"
          aria-hidden="true"
        >
          <div class="modal-dialog modal-lg" role="document">
            <div class="modal-content">
              <div class="modal-header">
                <h5 id="cms_modal_create_user_title" class="modal-title">Tambah pengguna</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Tutup">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div class="modal-body">
                <div
                  v-if="createError"
                  class="alert alert-outline-danger fade show kt-margin-b-15"
                  role="alert"
                >
                  <div class="alert-icon"><i class="flaticon-warning"></i></div>
                  <div class="alert-text">{{ createError }}</div>
                </div>
                <form id="cms_form_create_user" class="kt-form kt-form--label-right" @submit.prevent="onCreateSubmit">
                  <div class="form-group row">
                    <label class="col-form-label col-lg-3 text-lg-right">Email</label>
                    <div class="col-lg-9">
                      <input v-model="newEmail" type="email" class="form-control" required autocomplete="off" />
                    </div>
                  </div>
                  <div class="form-group row">
                    <label class="col-form-label col-lg-3 text-lg-right">Password</label>
                    <div class="col-lg-9">
                      <input
                        v-model="newPassword"
                        type="password"
                        class="form-control"
                        required
                        minlength="8"
                        autocomplete="new-password"
                      />
                    </div>
                  </div>
                  <div class="form-group row">
                    <label class="col-form-label col-lg-3 text-lg-right">
                      Nama lengkap <span class="kt-font-muted kt-font-normal">(opsional)</span>
                    </label>
                    <div class="col-lg-9">
                      <input v-model="newFullName" type="text" class="form-control" autocomplete="off" />
                    </div>
                  </div>
                  <div class="form-group row kt-margin-b-0">
                    <label class="col-form-label col-lg-3 text-lg-right">Role</label>
                    <div class="col-lg-9">
                      <select v-model="newRole" class="form-control">
                        <option v-for="r in assignableRoles" :key="r" :value="r">{{ r }}</option>
                      </select>
                    </div>
                  </div>
                </form>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Batal</button>
                <button
                  type="submit"
                  form="cms_form_create_user"
                  class="btn btn-brand"
                  :disabled="creating"
                >
                  {{ creating ? "Menyimpan…" : "Simpan" }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Teleport>

      <Teleport v-if="canEditUsers" to="body">
        <div
          id="cms_modal_edit_user"
          class="modal fade"
          tabindex="-1"
          role="dialog"
          aria-labelledby="cms_modal_edit_user_title"
          aria-hidden="true"
        >
          <div class="modal-dialog modal-lg" role="document">
            <div class="modal-content">
              <div class="modal-header">
                <h5 id="cms_modal_edit_user_title" class="modal-title">Ubah pengguna</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Tutup">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div class="modal-body">
                <div
                  v-if="editError"
                  class="alert alert-outline-danger fade show kt-margin-b-15"
                  role="alert"
                >
                  <div class="alert-icon"><i class="flaticon-warning"></i></div>
                  <div class="alert-text">{{ editError }}</div>
                </div>
                <form id="cms_form_edit_user" class="kt-form kt-form--label-right" @submit.prevent="onEditSubmit">
                  <div class="form-group row">
                    <label class="col-form-label col-lg-3 text-lg-right">Email</label>
                    <div class="col-lg-9">
                      <input v-model="editEmail" type="email" class="form-control" readonly />
                    </div>
                  </div>
                  <div class="form-group row">
                    <label class="col-form-label col-lg-3 text-lg-right">
                      Nama lengkap <span class="kt-font-muted kt-font-normal">(opsional)</span>
                    </label>
                    <div class="col-lg-9">
                      <input v-model="editFullName" type="text" class="form-control" autocomplete="off" />
                    </div>
                  </div>
                  <div class="form-group row">
                    <label class="col-form-label col-lg-3 text-lg-right">Role</label>
                    <div class="col-lg-9">
                      <select
                        v-if="editRole !== 'superadmin'"
                        v-model="editRole"
                        class="form-control"
                      >
                        <option v-for="r in assignableRoles" :key="r" :value="r">{{ r }}</option>
                      </select>
                      <div v-else class="form-control-plaintext kt-padding-l-0">
                        superadmin
                        <span class="kt-font-muted kt-font-sm d-block">Role tidak diubah lewat formulir ini.</span>
                      </div>
                    </div>
                  </div>
                  <div class="form-group row kt-margin-b-0">
                    <label class="col-form-label col-lg-3 text-lg-right">
                      Password baru <span class="kt-font-muted kt-font-normal">(opsional)</span>
                    </label>
                    <div class="col-lg-9">
                      <input
                        v-model="editPassword"
                        type="password"
                        class="form-control"
                        minlength="8"
                        autocomplete="new-password"
                        placeholder="Kosongkan jika tidak diganti"
                      />
                    </div>
                  </div>
                </form>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Batal</button>
                <button type="submit" form="cms_form_edit_user" class="btn btn-brand" :disabled="editSaving">
                  {{ editSaving ? "Menyimpan…" : "Simpan" }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Teleport>
    </div>
  </div>
</template>
