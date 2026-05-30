import { ref, computed } from "vue";
import { defineStore } from "pinia";
import { getJson } from "../api/http.js";
import { rulesGrantManageAll } from "../utils/casl-rules.js";

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
  canReadGallery: boolean;
  canCreateGallery: boolean;
  canUpdateGallery: boolean;
  canDeleteGallery: boolean;
  canReadContactMessage: boolean;
  canDeleteContactMessage: boolean;
  canReadHall: boolean;
  canCreateHall: boolean;
  canUpdateHall: boolean;
  canDeleteHall: boolean;
  canReadHallBooking: boolean;
  canUpdateHallBooking: boolean;
  canDeleteHallBooking: boolean;
  canReadProgramSocial: boolean;
  canCreateProgramSocial: boolean;
  canUpdateProgramSocial: boolean;
  canDeleteProgramSocial: boolean;
  canReadProgramTpq: boolean;
  canCreateProgramTpq: boolean;
  canUpdateProgramTpq: boolean;
  canDeleteProgramTpq: boolean;
  canReadProgramQurbanZakat: boolean;
  canCreateProgramQurbanZakat: boolean;
  canUpdateProgramQurbanZakat: boolean;
  canDeleteProgramQurbanZakat: boolean;
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
  canCreatePrayerSchedule: false,
  canUpdatePrayerSchedule: false,
  canDeletePrayerSchedule: false,
  canCreateJamaahData: false,
  canUpdateJamaahData: false,
  canDeleteJamaahData: false,
  canCreateFinanceCash: false,
  canUpdateFinanceCash: false,
  canDeleteFinanceCash: false,
  canReadGallery: false,
  canCreateGallery: false,
  canUpdateGallery: false,
  canDeleteGallery: false,
  canReadContactMessage: false,
  canDeleteContactMessage: false,
  canReadHall: false,
  canCreateHall: false,
  canUpdateHall: false,
  canDeleteHall: false,
  canReadHallBooking: false,
  canUpdateHallBooking: false,
  canDeleteHallBooking: false,
  canReadProgramSocial: false,
  canCreateProgramSocial: false,
  canUpdateProgramSocial: false,
  canDeleteProgramSocial: false,
  canReadProgramTpq: false,
  canCreateProgramTpq: false,
  canUpdateProgramTpq: false,
  canDeleteProgramTpq: false,
  canReadProgramQurbanZakat: false,
  canCreateProgramQurbanZakat: false,
  canUpdateProgramQurbanZakat: false,
  canDeleteProgramQurbanZakat: false,
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

function applyManageAllFlags(flags: AccessFlags): AccessFlags {
  return {
    ...flags,
    canReadHall: true,
    canCreateHall: true,
    canUpdateHall: true,
    canDeleteHall: true,
    canReadHallBooking: true,
    canUpdateHallBooking: true,
    canDeleteHallBooking: true,
  };
}

const FALLBACK_HALL_MENU: MenuItem[] = [
  {
    id: "ops-hall-bookings",
    label: "Penyewaan Aula",
    path: "/admin/operasional/penyewaan-aula",
    icon: "building",
    permissionName: "read:HallBooking",
    routerName: "ops-hall-bookings",
    menuGroup: "operasional",
    sortOrder: 40,
  },
];

function mergeHallMenuIfAllowed(items: MenuItem[], manageAll: boolean, flags: AccessFlags): MenuItem[] {
  const merged = [...items];
  const names = new Set(merged.map((m) => m.routerName));
  for (const fb of FALLBACK_HALL_MENU) {
    const allowed =
      manageAll ||
      (fb.routerName === "ops-hall-bookings" && flags.canReadHallBooking);
    if (allowed && !names.has(fb.routerName)) {
      merged.push(fb);
      names.add(fb.routerName);
    }
  }
  return merged.sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
}

export const useAccessStore = defineStore("access", () => {
  const menu = ref<MenuItem[]>([]);
  const rules = ref<unknown[]>([]);
  const role = ref("");
  const flags = ref<AccessFlags>({ ...defaultFlags });
  const loading = ref(false);
  const error = ref("");

  const isManageAll = computed(
    () => role.value === "superadmin" || rulesGrantManageAll(rules.value)
  );

  function reset(): void {
    menu.value = [];
    rules.value = [];
    role.value = "";
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
        rules.value = json.data.rules ?? [];
        role.value = json.data.role ?? "";
        let nextFlags: AccessFlags = { ...defaultFlags, ...(json.data.flags ?? {}) };
        if (isManageAllFromContext(json.data.role, json.data.rules)) {
          nextFlags = applyManageAllFlags(nextFlags);
        }
        flags.value = nextFlags;
        menu.value = mergeHallMenuIfAllowed(
          json.data.menu ?? [],
          isManageAllFromContext(json.data.role, json.data.rules),
          nextFlags
        );
      } else {
        error.value = json.error?.message || "Gagal memuat menu";
        menu.value = [];
        role.value = "";
        flags.value = { ...defaultFlags };
      }
    } catch {
      error.value = "Gagal memuat menu";
      menu.value = [];
      role.value = "";
      flags.value = { ...defaultFlags };
    } finally {
      loading.value = false;
    }
  }

  return { menu, rules, role, flags, isManageAll, loading, error, reset, load };
});

function isManageAllFromContext(userRole: string | undefined, userRules: unknown[] | undefined): boolean {
  return userRole === "superadmin" || rulesGrantManageAll(userRules ?? []);
}

/** Route Vue Router dari item menu (nilai `routerName` dari backend / tabel admin_menu_items). */
export function menuRouteTarget(item: MenuItem): { name: string } {
  return { name: item.routerName };
}
