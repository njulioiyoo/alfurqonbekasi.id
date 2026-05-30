import { AbilityBuilder, createMongoAbility, type MongoAbility } from "@casl/ability";
import type { AppActions, AppSubject } from "./subjects.js";

export type AppAbility = MongoAbility<[AppActions, AppSubject]>;

const ALL_ACTIONS: readonly AppActions[] = ["manage", "create", "read", "update", "delete"];

function isAppAction(s: string): s is AppActions {
  return (ALL_ACTIONS as readonly string[]).includes(s);
}

/**
 * CASL dari daftar permission DB (format `aksi:Subjek`, contoh `read:User`, `manage:all`).
 * Subjek mengikuti string di DB (boleh subjek baru tanpa mengubah TypeScript).
 */
export function defineAbilityFromPermissionNames(names: string[]): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);
  for (const raw of names) {
    const name = raw.trim();
    if (name === "manage:all") {
      can("manage", "all");
      continue;
    }
    const i = name.indexOf(":");
    if (i <= 0) continue;
    const actionStr = name.slice(0, i);
    const subjectStr = name.slice(i + 1);
    if (!isAppAction(actionStr) || subjectStr.length === 0) continue;
    can(actionStr, subjectStr as AppSubject);
  }
  return build();
}

/** Cek satu nama permission terhadap ability (untuk filter menu dari DB). */
export function abilityAllowsPermissionName(ability: AppAbility, permissionName: string): boolean {
  if (ability.can("manage", "all")) return true;
  const n = permissionName.trim();
  if (n === "manage:all") return ability.can("manage", "all");
  const i = n.indexOf(":");
  if (i <= 0) return false;
  const actionStr = n.slice(0, i);
  const subjectStr = n.slice(i + 1);
  if (!isAppAction(actionStr) || subjectStr.length === 0) return false;
  return ability.can(actionStr, subjectStr as AppSubject);
}
