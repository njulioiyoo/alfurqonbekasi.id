import { AbilityBuilder, createMongoAbility, type MongoAbility } from "@casl/ability";
import type { AppActions, AppSubject } from "./subjects.js";

export type AppAbility = MongoAbility<[AppActions, AppSubject]>;

/**
 * Ability per role — tambah role baru di sini + seed DB jika perlu.
 * `manage` + `all` = akses penuh (superadmin).
 */
export function defineAbilityFor(role: string): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  switch (role) {
    case "superadmin":
      can("manage", "all");
      break;

    case "admin":
      can("read", "Dashboard");
      can("read", "Role");
      can(["create", "read", "update", "delete"], "Article");
      can(["create", "read", "update", "delete"], "Announcement");
      can(["create", "read", "update", "delete"], "Donation");
      can(["create", "read", "update", "delete"], "PrayerSchedule");
      can(["create", "read", "update", "delete"], "Gallery");
      can(["read", "update", "delete"], "User");
      can("read", "Menu");
      can("read", "Setting");
      break;

    case "user":
    default:
      can("read", "Article");
      can("read", "Announcement");
      can("read", "PrayerSchedule");
      break;
  }

  return build();
}
