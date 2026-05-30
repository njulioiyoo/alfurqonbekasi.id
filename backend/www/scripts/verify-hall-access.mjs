#!/usr/bin/env node
/**
 * Verifikasi izin superadmin untuk modul aula (Hall / HallBooking).
 * Usage: DATABASE_URL=... node scripts/verify-hall-access.mjs
 */
import { pool } from "../dist/db/pool.js";
import { getPermissionNamesForRoleName } from "../dist/services/rbac.service.js";
import { defineAbilityFromPermissionNames, abilityAllowsPermissionName } from "../dist/acl/abilities.js";
import { visibleMenuItemsForAbility } from "../dist/services/menu.service.js";

async function main() {
  console.log("=== Verifikasi akses superadmin — modul aula ===\n");

  const perms = await getPermissionNamesForRoleName("superadmin");
  console.log("Permission role superadmin:", perms.includes("manage:all") ? "manage:all ✓" : "TIDAK ADA manage:all ✗");
  const ability = defineAbilityFromPermissionNames(perms);
  const checks = [
    ["read", "Hall"],
    ["create", "Hall"],
    ["read", "HallBooking"],
    ["update", "HallBooking"],
  ] ;
  for (const [action, subject] of checks) {
    console.log(`  ability.can(${action}, ${subject}):`, ability.can(action, subject) ? "✓" : "✗");
  }
  console.log("  abilityAllowsPermissionName(read:Hall):", abilityAllowsPermissionName(ability, "read:Hall") ? "✓" : "✗");

  const menu = await visibleMenuItemsForAbility(ability);
  for (const slug of ["ops-halls", "ops-hall-bookings"]) {
    const item = menu.find((m) => m.id === slug);
    console.log(`  menu ${slug}:`, item ? `${item.label} ✓` : "TIDAK ADA ✗");
  }

  const rows = await pool.query(
    `SELECT slug FROM admin_menu_items WHERE slug IN ('ops-halls', 'ops-hall-bookings') ORDER BY slug`
  );
  console.log("\nBaris admin_menu_items di DB:", rows.rows.length ? rows.rows.map((r) => r.slug).join(", ") : "(kosong — jalankan migration/restart backend)");

  const hallPerms = await pool.query(
    `SELECT name FROM permissions WHERE name LIKE '%:Hall%' ORDER BY name`
  );
  console.log("Permission Hall di DB:", hallPerms.rows.map((r) => r.name).join(", ") || "(kosong)");

  console.log("\nSelesai.");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
