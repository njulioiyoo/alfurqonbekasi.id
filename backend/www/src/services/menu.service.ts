import type { AppAbility } from "../acl/abilities.js";
import { abilityAllowsPermissionName } from "../acl/abilities.js";
import { pool } from "../db/pool.js";

export type MenuRow = {
  slug: string;
  menu_group: string;
  label: string;
  path: string;
  icon: string | null;
  permission_name: string;
  router_name: string;
  sort_order: number;
};

/** Menu fallback jika baris belum ada di DB (mis. migration belum jalan). */
const FALLBACK_MENU_ROWS: MenuRow[] = [
  {
    slug: "ops-hall-bookings",
    menu_group: "operasional",
    label: "Penyewaan Aula",
    path: "/admin/operasional/penyewaan-aula",
    icon: "building",
    permission_name: "read:HallBooking",
    router_name: "ops-hall-bookings",
    sort_order: 40,
  },
];

/** Item menu untuk `/auth/access-context` (frontend). */
export type MenuItemPayload = {
  id: string;
  label: string;
  path: string;
  icon?: string;
  permissionName: string;
  routerName: string;
  menuGroup: string;
  sortOrder: number;
};

export async function listAllMenuRows(): Promise<MenuRow[]> {
  const r = await pool.query<MenuRow>(
    `SELECT slug, menu_group, label, path, icon, permission_name, router_name, sort_order
     FROM admin_menu_items
     ORDER BY menu_group, sort_order, label`
  );
  return r.rows;
}

export async function visibleMenuItemsForAbility(ability: AppAbility): Promise<MenuItemPayload[]> {
  const rows = await listAllMenuRows();
  const slugs = new Set(rows.map((r) => r.slug));
  const merged = [...rows];
  for (const fb of FALLBACK_MENU_ROWS) {
    if (!slugs.has(fb.slug)) merged.push(fb);
  }
  return merged
    .filter((row) => abilityAllowsPermissionName(ability, row.permission_name))
    .map((row) => {
      return {
        id: row.slug,
        label: row.label,
        path: row.path,
        icon: row.icon ?? undefined,
        permissionName: row.permission_name,
        routerName: row.router_name,
        menuGroup: row.menu_group || "primary",
        sortOrder: row.sort_order,
      };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
}
