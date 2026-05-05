<script setup lang="ts">
import KtRemoteDatatable from "../components/KtRemoteDatatable.vue";

interface RoleRow {
  RecordID: string;
  roleKey: string;
  label: string;
  description: string;
  userCount: number;
}

const roleColumns: unknown[] = [
  {
    field: "RecordID",
    title: "#",
    sortable: false,
    width: 20,
    selector: { class: "kt-checkbox--solid" },
    textAlign: "center",
  },
  {
    field: "roleKey",
    title: "Key",
    width: 120,
  },
  {
    field: "label",
    title: "Nama",
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
    width: 120,
    textAlign: "center",
    type: "number",
  },
];
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
            table-id="roles_datatable"
            read-path="/admin/roles/datatable"
            search-placeholder="Cari key, nama, deskripsi…"
            :columns="roleColumns"
          />
        </div>
      </div>
    </div>
  </div>
</template>
