<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import {
  getAdminRole,
  listAdminPermissions,
  putAdminRolePermissions,
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

interface RoleRow {
  RecordID: string;
  name: string;
  displayName: string;
  description: string;
  userCount: number;
}

const access = useAccessStore();
const { flags: accessFlags } = storeToRefs(access);

const canUpdateRole = computed(() => accessFlags.value.canUpdateRole);

const roleTableRef = ref<InstanceType<typeof KtRemoteDatatable> | null>(null);

const roleColumns: unknown[] = [
  {
    field: "name",
    title: "Name (slug)",
    width: 130,
  },
  {
    field: "displayName",
    title: "Nama tampil",
    width: 180,
  },
  {
    field: "description",
    title: "Deskripsi",
    template(row: RoleRow) {
      const t = row.description || "";
      return `<span class="kt-font-sm">${t}</span>`;
    },
  },
  {
    field: "userCount",
    title: "Jumlah user",
    width: 100,
    textAlign: "center",
    type: "number",
  },
  {
    field: "Actions",
    title: "Actions",
    sortable: false,
    width: 100,
    overflow: "visible",
    autoHide: false,
    template(row: RoleRow) {
      if (!canUpdateRole.value) {
        return '<span class="kt-font-muted kt-font-sm">—</span>';
      }
      const id = row.RecordID;
      return `<a href="javascript:;" class="btn btn-sm btn-clean btn-icon btn-icon-md cms-act-role-perm" title="Izin" data-role-id="${id}"><i class="la la-key"></i></a>`;
    },
  },
];

const permRoleId = ref("");
const permRoleLabel = ref("");
const permCatalog = ref<{ id: string; name: string }[]>([]);
const permSelected = ref<Set<string>>(new Set());
const permLoading = ref(false);
const permSaving = ref(false);
const permError = ref("");

function jq(): Window["jQuery"] {
  return window.jQuery;
}

function openPermModalEl(): void {
  const $ = jq();
  const el = document.getElementById("cms_modal_role_permissions");
  if (!$?.fn?.modal || !el) return;
  ($(el) as { modal: (a?: string) => void }).modal("show");
}

function closePermModalEl(): void {
  const $ = jq();
  const el = document.getElementById("cms_modal_role_permissions");
  if (!$?.fn?.modal || !el) return;
  ($(el) as { modal: (a?: string) => void }).modal("hide");
}

function reloadRolesTable(): void {
  roleTableRef.value?.reload();
}

function onRolesDocClick(ev: MouseEvent): void {
  const t = ev.target;
  if (!(t instanceof Element)) return;
  const btn = t.closest(".cms-act-role-perm");
  const root = roleTableRef.value?.getTableEl();
  if (!btn || !root?.contains(btn)) return;
  ev.preventDefault();
  const id = btn.getAttribute("data-role-id");
  if (!id) return;
  void openPermissionEditor(id);
}

async function openPermissionEditor(roleId: string): Promise<void> {
  permError.value = "";
  permLoading.value = true;
  permRoleId.value = roleId;
  try {
    const [rJson, pJson] = await Promise.all([getAdminRole(roleId), listAdminPermissions()]);
    if (!rJson.ok || !rJson.data) {
      permError.value = rJson.error?.message || "Gagal memuat role";
      return;
    }
    if (!pJson.ok || !pJson.data?.items) {
      permError.value = pJson.error?.message || "Gagal memuat daftar permission";
      return;
    }
    permRoleLabel.value = `${rJson.data.displayName} (${rJson.data.name})`;
    permCatalog.value = pJson.data.items.map((x) => ({ id: x.id, name: x.name }));
    permSelected.value = new Set(rJson.data.permissions);
    openPermModalEl();
  } catch {
    permError.value = "Tidak dapat menghubungi server";
  } finally {
    permLoading.value = false;
  }
}

function setPerm(name: string, checked: boolean): void {
  const next = new Set(permSelected.value);
  if (checked) next.add(name);
  else next.delete(name);
  permSelected.value = next;
}

function onPermInput(name: string, ev: Event): void {
  const t = ev.target;
  if (!(t instanceof HTMLInputElement)) return;
  setPerm(name, t.checked);
}

type PermLine = { name: string; action: string; groupLabel: string };

const permGrouped = computed(() => {
  const lines: PermLine[] = permCatalog.value.map((p) => {
    if (p.name === "manage:all") {
      return { name: p.name, action: "manage", groupLabel: "Akses penuh" };
    }
    const i = p.name.indexOf(":");
    const action = i > 0 ? p.name.slice(0, i) : "?";
    const subj = i > 0 ? p.name.slice(i + 1) : p.name;
    return { name: p.name, action, groupLabel: subj };
  });
  const map = new Map<string, PermLine[]>();
  for (const L of lines) {
    const arr = map.get(L.groupLabel) ?? [];
    arr.push(L);
    map.set(L.groupLabel, arr);
  }
  const labels = [...map.keys()].sort((a, b) => {
    if (a === "Akses penuh") return -1;
    if (b === "Akses penuh") return 1;
    return a.localeCompare(b, "id");
  });
  return labels.map((label) => ({
    label,
    items: (map.get(label) ?? []).sort((x, y) => x.name.localeCompare(y.name)),
  }));
});

function actionBadgeClass(action: string): string {
  switch (action) {
    case "manage":
      return "kt-badge--danger";
    case "create":
      return "kt-badge--success";
    case "read":
      return "kt-badge--brand";
    case "update":
      return "kt-badge--warning";
    case "delete":
      return "kt-badge--outline kt-badge--danger";
    default:
      return "kt-badge--metal";
  }
}

async function onSavePermissions(): Promise<void> {
  permError.value = "";
  permSaving.value = true;
  try {
    const json = await putAdminRolePermissions(permRoleId.value, [...permSelected.value]);
    if (!json.ok) {
      permError.value = json.error?.message || "Gagal menyimpan";
      return;
    }
    closePermModalEl();
    reloadRolesTable();
  } catch {
    permError.value = "Tidak dapat menghubungi server";
  } finally {
    permSaving.value = false;
  }
}

onMounted(() => {
  document.addEventListener("click", onRolesDocClick);
  void access.load();
});

onBeforeUnmount(() => {
  document.removeEventListener("click", onRolesDocClick);
});
</script>

<template>
  <div class="row">
    <div class="col-12">
      <div class="kt-portlet kt-portlet--mobile">
        <div class="kt-portlet__head kt-portlet__head--lg">
          <div class="kt-portlet__head-label">
            <span class="kt-portlet__head-icon">
              <i class="kt-font-brand flaticon2-shield"></i>
            </span>
            <h3 class="kt-portlet__head-title">Role</h3>
          </div>
        </div>
        <div class="kt-portlet__body kt-portlet__body--fit">
          <KtRemoteDatatable
            ref="roleTableRef"
            table-id="roles_datatable"
            read-path="/admin/roles/datatable"
            search-placeholder="Cari name, nama tampil, deskripsi…"
            search-hint="Baris dari tabel roles. Hak akses per role diatur lewat permission DB (tombol Izin — butuh update:Role). Menu admin dari tabel admin_menu_items."
            :columns="roleColumns"
          />
        </div>
      </div>

      <Teleport v-if="canUpdateRole" to="body">
        <div
          id="cms_modal_role_permissions"
          class="modal fade"
          tabindex="-1"
          role="dialog"
          aria-hidden="true"
        >
          <div class="modal-dialog modal-lg modal-dialog-scrollable" role="document">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Izin akses role</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Tutup">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div class="modal-body">
                <p v-if="permLoading" class="kt-font-muted">Memuat…</p>
                <div
                  v-else-if="permError && !permCatalog.length"
                  class="alert alert-outline-danger fade show"
                  role="alert"
                >
                  <div class="alert-text">{{ permError }}</div>
                </div>
                <template v-else>
                  <div class="cms-perm-role-head kt-margin-b-20">
                    <span class="kt-font-muted kt-font-sm d-block">Role</span>
                    <span class="kt-font-bolder kt-font-dark kt-font-lg">{{ permRoleLabel }}</span>
                    <p class="kt-font-sm kt-font-muted kt-margin-t-5 kt-margin-b-0">
                      Centang permission yang boleh dipakai role ini. Format: <code>aksi:Subjek</code> (contoh
                      <code>read:User</code>).
                    </p>
                  </div>
                  <div
                    v-if="permError"
                    class="alert alert-outline-danger fade show kt-margin-b-15"
                    role="alert"
                  >
                    <div class="alert-text">{{ permError }}</div>
                  </div>
                  <div class="cms-perm-scroll kt-scrollable" data-scrollable="true">
                    <section
                      v-for="g in permGrouped"
                      :key="g.label"
                      class="cms-perm-group"
                    >
                      <header class="cms-perm-group__head">
                        <span class="cms-perm-group__title">{{ g.label }}</span>
                        <span class="kt-badge kt-badge--outline kt-badge--unified-dark kt-badge--sm">{{ g.items.length }}</span>
                      </header>
                      <div class="row cms-perm-group__body">
                        <div
                          v-for="it in g.items"
                          :key="it.name"
                          class="col-md-6 col-lg-4"
                        >
                          <label class="cms-perm-line">
                            <input
                              type="checkbox"
                              class="cms-perm-line__check"
                              :checked="permSelected.has(it.name)"
                              @change="onPermInput(it.name, $event)"
                            />
                            <span
                              class="kt-badge kt-badge--sm kt-badge--inline kt-margin-r-5"
                              :class="actionBadgeClass(it.action)"
                              >{{ it.action }}</span
                            >
                            <span class="cms-perm-line__code">{{ it.name }}</span>
                          </label>
                        </div>
                      </div>
                    </section>
                  </div>
                </template>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Tutup</button>
                <button
                  type="button"
                  class="btn btn-brand"
                  :disabled="permLoading || permSaving || !permCatalog.length"
                  @click="onSavePermissions"
                >
                  {{ permSaving ? "Menyimpan…" : "Simpan permission" }}
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
.cms-perm-scroll {
  max-height: min(58vh, 520px);
  overflow: auto;
  padding-right: 2px;
}

.cms-perm-group {
  margin-bottom: 1.25rem;
  border: 1px solid #ebedf2;
  border-radius: 4px;
  background: #fcfcfd;
  overflow: hidden;
}

.cms-perm-group__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.55rem 0.85rem;
  background: linear-gradient(90deg, #f4f5f8 0%, #fafbfc 100%);
  border-bottom: 1px solid #ebedf2;
}

.cms-perm-group__title {
  font-weight: 600;
  font-size: 0.9rem;
  color: #48465b;
  letter-spacing: 0.01em;
}

.cms-perm-group__body {
  padding: 0.75rem 0.65rem 0.35rem;
}

.cms-perm-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.35rem 0.5rem;
  margin-bottom: 0.5rem;
  padding: 0.45rem 0.5rem;
  border-radius: 4px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.cms-perm-line:hover {
  background: #fff;
  border-color: #e2e5ec;
}

.cms-perm-line__check {
  flex-shrink: 0;
  width: 1rem;
  height: 1rem;
  margin: 0;
  cursor: pointer;
}

.cms-perm-line__code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.78rem;
  color: #3f4047;
  word-break: break-all;
}
</style>
