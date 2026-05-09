import { ref } from "vue";
import { defineStore } from "pinia";
import { getJson } from "../api/http.js";

export type MenuItem = {
  id: string;
  label: string;
  path: string;
  icon?: string;
  permissionName: string;
  routerName: string;
  menuGroup: string;
  sortOrder: number;
};

export type AccessFlags = {
  canCreateContent: boolean;
  canUpdateContent: boolean;
  canDeleteContent: boolean;
  /** Jadwal kegiatan & petugas ibadah (`content_items` type event / prayer_staff). */
  canCreatePrayerSchedule: boolean;
  canUpdatePrayerSchedule: boolean;
  canDeletePrayerSchedule: boolean;
  canCreateJamaahData: boolean;
  canUpdateJamaahData: boolean;
  canDeleteJamaahData: boolean;
  canCreateFinanceCash: boolean;
  canUpdateFinanceCash: boolean;
  canDeleteFinanceCash: boolean;
  canReadProgramSocial: boolean;
  canCreateProgramSocial: boolean;
  canUpdateProgramSocial: boolean;
  canDeleteProgramSocial: boolean;
  canReadProgramTpq: boolean;
  canCreateProgramTpq: boolean;
  canUpdateProgramTpq: boolean;
  canDeleteProgramTpq: boolean;
  canCreateAnnouncement: boolean;
  canUpdateAnnouncement: boolean;
  canDeleteAnnouncement: boolean;
  canCreateUser: boolean;
  canUpdateUser: boolean;
  canDeleteUser: boolean;
  canCreateRole: boolean;
  canUpdateRole: boolean;
  canDeleteRole: boolean;
  canCreatePermission: boolean;
  canUpdatePermission: boolean;
  canDeletePermission: boolean;
  canUpdateSetting: boolean;
};

export type AccessContextResponse = {
  ok: boolean;
  data?: {
    role: string;
    rules: unknown[];
    menu: MenuItem[];
    flags?: AccessFlags;
  };
  error?: { code: string; message: string };
};

const defaultFlags: AccessFlags = {
  canCreateContent: false,
  canUpdateContent: false,
  canDeleteContent: false,
  canCreatePrayerSchedule: false,
  canUpdatePrayerSchedule: false,
  canDeletePrayerSchedule: false,
  canCreateJamaahData: false,
  canUpdateJamaahData: false,
  canDeleteJamaahData: false,
  canCreateFinanceCash: false,
  canUpdateFinanceCash: false,
  canDeleteFinanceCash: false,
  canReadProgramSocial: false,
  canCreateProgramSocial: false,
  canUpdateProgramSocial: false,
  canDeleteProgramSocial: false,
  canReadProgramTpq: false,
  canCreateProgramTpq: false,
  canUpdateProgramTpq: false,
  canDeleteProgramTpq: false,
  canCreateAnnouncement: false,
  canUpdateAnnouncement: false,
  canDeleteAnnouncement: false,
  canCreateUser: false,
  canUpdateUser: false,
  canDeleteUser: false,
  canCreateRole: false,
  canUpdateRole: false,
  canDeleteRole: false,
  canCreatePermission: false,
  canUpdatePermission: false,
  canDeletePermission: false,
  canUpdateSetting: false,
};

export const useAccessStore = defineStore("access", () => {
  const menu = ref<MenuItem[]>([]);
  const rules = ref<unknown[]>([]);
  const flags = ref<AccessFlags>({ ...defaultFlags });
  const loading = ref(false);
  const error = ref("");

  function reset(): void {
    menu.value = [];
    rules.value = [];
    flags.value = { ...defaultFlags };
    loading.value = false;
    error.value = "";
  }

  async function load(): Promise<void> {
    loading.value = true;
    error.value = "";
    try {
      const json = await getJson<AccessContextResponse>("/auth/access-context");
      if (json.ok && json.data) {
        menu.value = json.data.menu ?? [];
        rules.value = json.data.rules ?? [];
        flags.value = { ...defaultFlags, ...(json.data.flags ?? {}) };
      } else {
        error.value = json.error?.message || "Gagal memuat menu";
        menu.value = [];
        flags.value = { ...defaultFlags };
      }
    } catch {
      error.value = "Gagal memuat menu";
      menu.value = [];
      flags.value = { ...defaultFlags };
    } finally {
      loading.value = false;
    }
  }

  return { menu, rules, flags, loading, error, reset, load };
});

/** Route Vue Router dari item menu (nilai `routerName` dari backend / tabel admin_menu_items). */
export function menuRouteTarget(item: MenuItem): { name: string } {
  return { name: item.routerName };
}
